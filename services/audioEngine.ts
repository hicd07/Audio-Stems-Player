import { EffectType, TrackData, AudioDeviceInfo, MetronomeSound } from '../types';

class AudioEngine {
  ctx: AudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  
  // Metronome
  metronomeGain: GainNode;
  metronomePanner: StereoPannerNode;
  metronomeOsc: OscillatorNode | null = null;
  metronomeOutputEl: HTMLAudioElement | null = null;
  metronomeStreamDest: MediaStreamAudioDestinationNode | null = null;
  nextNoteTime: number = 0.0;
  timerID: number | undefined;
  metronomeSounds: Map<string, AudioBuffer> = new Map();
  currentMetronomeSound: MetronomeSound = 'classic';
  
  // Track State
  sources: Map<number, AudioBufferSourceNode> = new Map();
  gainNodes: Map<number, GainNode> = new Map();
  pannerNodes: Map<number, StereoPannerNode> = new Map();
  analyserNodes: Map<number, AnalyserNode> = new Map();
  
  // Per-channel physical outputs (using <audio> element sinkId hack for Web Audio)
  channelOutputs: Map<number, { streamDest: MediaStreamAudioDestinationNode, audioEl: HTMLAudioElement }> = new Map();
  
  // Global Recording
  destMediaStream: MediaStreamAudioDestinationNode;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];

  // Pad Recording
  activeTrackRecorder: MediaRecorder | null = null;
  trackRecordingChunks: Blob[] = [];
  trackRecordingStream: MediaStream | null = null;

  // Reverb Impulse
  impulseBuffer: AudioBuffer | null = null;

  // Clipping
  clipCallback: ((trackId: number) => void) | null = null;
  monitoringInterval: number | undefined;

  constructor() {
    // Initialize standard AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.destMediaStream = this.ctx.createMediaStreamDestination();
    
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    this.compressor.connect(this.destMediaStream);

    this.masterGain.gain.value = 0.8;

    // Metronome Chain
    this.metronomeGain = this.ctx.createGain();
    this.metronomePanner = this.ctx.createStereoPanner();
    this.metronomeGain.connect(this.metronomePanner);
    this.metronomePanner.connect(this.masterGain); // Default to master mix
    this.metronomeGain.gain.value = 0.5;

    this._createMetronomeSounds();
    this.generateImpulseResponse();
  }

  async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  reset() {
      this.stopAll();
      this.gainNodes.clear();
      this.pannerNodes.clear();
      this.analyserNodes.clear();
      
      // Clean up channel outputs
      this.channelOutputs.forEach((val) => {
          try {
              val.audioEl.pause();
              val.audioEl.srcObject = null;
          } catch(e) {}
      });
      this.channelOutputs.clear();

      // Reset Levels
      this.masterGain.gain.value = 0.8;
      this.metronomeGain.gain.value = 0.5;
      
      // Reset Routing
      this.setMasterOutputDevice('');
      this.setMetronomeOutputDevice('');
  }

  // --- Device Management ---
  async getDevices(): Promise<AudioDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("Media Devices API not supported.");
      return [];
    }
    // Request permission to get labels
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch(e) {
        console.warn("Microphone permission denied, labels may be missing.");
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 4)}...)`,
        kind: d.kind as 'audioinput' | 'audiooutput'
      }));
  }

  async setMasterOutputDevice(deviceId: string) {
    if ((this.ctx as any).setSinkId) {
      try {
        await (this.ctx as any).setSinkId(deviceId);
      } catch (err) {
        console.error("Failed to set master output device:", err);
      }
    } else {
      console.warn("setSinkId not supported on AudioContext in this browser.");
    }
  }

  async setMetronomeOutputDevice(deviceId: string) {
      // Disconnect current routing
      try { this.metronomePanner.disconnect(); } catch(e) {}

      if (!deviceId || deviceId === 'default' || deviceId === 'master' || deviceId === '') {
          // Route to Master
          this.metronomePanner.connect(this.masterGain);
          return;
      }

      // Route to dedicated element
      if (!this.metronomeStreamDest) {
          this.metronomeStreamDest = this.ctx.createMediaStreamDestination();
          this.metronomeOutputEl = new Audio();
          this.metronomeOutputEl.srcObject = this.metronomeStreamDest.stream;
          this.metronomeOutputEl.play();
      }

      this.metronomePanner.connect(this.metronomeStreamDest);
      if (this.metronomeOutputEl && (this.metronomeOutputEl as any).setSinkId) {
          try {
            await (this.metronomeOutputEl as any).setSinkId(deviceId);
          } catch(e) {
              console.error("Failed to set metronome output:", e);
          }
      }
  }

  setMasterVolume(val: number) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setMetronomeVolume(val: number) {
      this.metronomeGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }
  
  setMetronomePan(val: number) {
      this.metronomePanner.pan.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  // --- Impulse Response for Reverb ---
  generateImpulseResponse() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2.0; // 2 seconds
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 5);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    this.impulseBuffer = impulse;
  }

  async loadAudio(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }
  
  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
      return await this.ctx.decodeAudioData(arrayBuffer);
  }

  // --- Effects Factory ---
  createEffectChain(type: EffectType, params: any) {
    const input = this.ctx.createGain();
    const output = this.ctx.createGain();
    let processor: AudioNode = this.ctx.createGain(); // Default pass-through

    if (type === EffectType.REVERB && this.impulseBuffer) {
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.impulseBuffer;
      processor = convolver;
    } else if (type === EffectType.FILTER) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = params.param1 * 20000; 
      filter.Q.value = params.param2 * 20;
      processor = filter;
    } else if (type === EffectType.DELAY) {
      const delay = this.ctx.createDelay();
      const feedback = this.ctx.createGain();
      delay.delayTime.value = params.param1 * 1.0; 
      feedback.gain.value = params.param2 * 0.9; 
      delay.connect(feedback);
      feedback.connect(delay);
      processor = delay;
    } else if (type === EffectType.FLANGER || type === EffectType.CHORUS) {
       const delay = this.ctx.createDelay();
       const osc = this.ctx.createOscillator();
       const oscGain = this.ctx.createGain();
       
       const isFlanger = type === EffectType.FLANGER;
       
       delay.delayTime.value = isFlanger ? 0.005 : 0.03;
       osc.frequency.value = params.param2 * 5; 
       oscGain.gain.value = params.param1 * (isFlanger ? 0.002 : 0.005); 

       osc.connect(oscGain);
       oscGain.connect(delay.delayTime);
       osc.start();
       processor = delay;
    }

    input.connect(processor);
    processor.connect(output);
    return { input, output, processor };
  }

  // --- Playback ---
  startPlayback(tracks: TrackData[], onEnded: (id: number) => void, loop: boolean, offset: number = 0) {
    this.stopAll(false); // Stop previous playback without clearing nodes

    const soloTracks = tracks.filter(t => t.isSolo);
    const tracksToPlay = soloTracks.length > 0 ? soloTracks : tracks;

    tracksToPlay.forEach(track => {
      if (!track.audioBuffer || track.isMuted) return;

      const source = this.ctx.createBufferSource();
      source.buffer = track.audioBuffer;
      
      const start = track.trimStart || 0;
      const end = track.trimEnd && track.trimEnd > 0 ? track.trimEnd : track.audioBuffer.duration;
      const duration = Math.max(0, end - start);
      
      const effectiveOffset = Math.max(0, offset);

      if (effectiveOffset >= duration) return; // Don't play if start time is past the end of the clip

      source.loop = loop;
      if (loop) {
        source.loopStart = start;
        source.loopEnd = end;
      }
      
      source.start(0, start + effectiveOffset, loop ? undefined : duration - effectiveOffset);

      // Re-create or re-connect nodes for this track
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = track.volume;
      
      const dryGain = this.ctx.createGain();
      const wetGain = this.ctx.createGain();
      const outGain = this.ctx.createGain(); 

      const fx = this.createEffectChain(track.effect.type, track.effect.params);
      
      source.connect(dryGain);
      source.connect(fx.input);
      fx.output.connect(wetGain);

      dryGain.connect(outGain);
      wetGain.connect(outGain);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = track.pan;

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 2048;

      outGain.connect(analyser);
      analyser.connect(panner);
      this.analyserNodes.set(track.id, analyser);


      // --- Output Routing ---
      if (track.outputDeviceId && track.outputDeviceId !== 'default' && track.outputDeviceId !== '' && track.outputDeviceId !== 'master') {
          let channelOut = this.channelOutputs.get(track.id);
          if (!channelOut) {
              const streamDest = this.ctx.createMediaStreamDestination();
              const audioEl = new Audio();
              audioEl.srcObject = streamDest.stream;
              audioEl.play();
              channelOut = { streamDest, audioEl };
              this.channelOutputs.set(track.id, channelOut);
          }
          if ((channelOut.audioEl as any).setSinkId) {
              (channelOut.audioEl as any).setSinkId(track.outputDeviceId).catch((e: any) => console.error(e));
          }
          panner.connect(channelOut.streamDest);
      } else {
          panner.connect(this.masterGain);
      }

      const mix = track.effect.dryWet;
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;
      outGain.gain.value = track.volume; 

      this.sources.set(track.id, source);
      this.gainNodes.set(track.id, outGain); 
      this.pannerNodes.set(track.id, panner);
      
      source.onended = () => {
        onEnded(track.id);
        this.sources.delete(track.id);
        this.analyserNodes.delete(track.id);
      };
    });
  }

  stopAll(clearNodes = true) {
    this.sources.forEach((source) => {
      try { source.stop(); } catch(e){}
    });
    this.sources.clear();
    this.analyserNodes.clear();
    if (clearNodes) {
        this.pannerNodes.clear();
        this.gainNodes.clear();
    }
    this.stopMetronome();
  }

  setTrackVolume(id: number, val: number) {
     const node = this.gainNodes.get(id);
     if (node) {
         node.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
     }
  }

  setTrackPan(id: number, val: number) {
      const node = this.pannerNodes.get(id);
      if (node) {
          node.pan.setTargetAtTime(val, this.ctx.currentTime, 0.05);
      }
  }

  // --- Clipping Detection ---
  setClipCallback(callback: ((trackId: number) => void) | null) {
      this.clipCallback = callback;
      if (callback && !this.monitoringInterval) {
          this.startMonitoring();
      } else if (!callback && this.monitoringInterval) {
          this.stopMonitoring();
      }
  }

  startMonitoring() {
      this.monitoringInterval = window.setInterval(() => this.checkClips(), 100);
  }

  stopMonitoring() {
      if (this.monitoringInterval) {
          window.clearInterval(this.monitoringInterval);
          this.monitoringInterval = undefined;
      }
  }

  checkClips() {
      if (!this.clipCallback) return;
      this.analyserNodes.forEach((analyser, trackId) => {
          const pcmData = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(pcmData);
          let peak = 0;
          for (let i = 0; i < pcmData.length; i++) {
              const abs = Math.abs(pcmData[i]);
              if (abs > peak) peak = abs;
          }
          if (peak >= 1.0) {
              this.clipCallback(trackId);
          }
      });
  }

  // --- Metronome ---
  async _renderSound(duration: number, renderFn: (ctx: OfflineAudioContext, time: number) => void): Promise<AudioBuffer> {
    const offlineCtx = new OfflineAudioContext(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    renderFn(offlineCtx, 0);
    return await offlineCtx.startRendering();
  }

  _createMetronomeSounds() {
    this._renderSound(0.1, (ctx, time) => { // Classic Click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(2500, time);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(time); osc.stop(time + 0.05);
    }).then(buffer => this.metronomeSounds.set('classic', buffer));

    this._renderSound(0.1, (ctx, time) => { // Beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1000, time);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(time); osc.stop(time + 0.08);
    }).then(buffer => this.metronomeSounds.set('beep', buffer));

    this._renderSound(0.15, (ctx, time) => { // Woodblock
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
        noise.buffer = noiseBuffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 10;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        noise.start(time); noise.stop(time + 0.1);
    }).then(buffer => this.metronomeSounds.set('woodblock', buffer));
    
    this._renderSound(0.2, (ctx, time) => { // Cowbell
        const osc1 = ctx.createOscillator(); osc1.type = 'square'; osc1.frequency.setValueAtTime(550, time);
        const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.setValueAtTime(880 * 1.01, time);
        const gain1 = ctx.createGain(); gain1.gain.value = 0.4;
        const gain2 = ctx.createGain(); gain2.gain.value = 0.3;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1, time);
        masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc1.connect(gain1); osc2.connect(gain2);
        gain1.connect(masterGain); gain2.connect(masterGain);
        masterGain.connect(ctx.destination);
        osc1.start(time); osc1.stop(time + 0.15);
        osc2.start(time); osc2.stop(time + 0.15);
    }).then(buffer => this.metronomeSounds.set('cowbell', buffer));
  }
  
  setMetronomeSound(sound: MetronomeSound) {
    if (this.metronomeSounds.has(sound)) {
      this.currentMetronomeSound = sound;
    }
  }

  playMetronomePreview(sound: MetronomeSound) {
      const buffer = this.metronomeSounds.get(sound);
      if (!buffer) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.metronomeGain);
      source.start(this.ctx.currentTime);
  }

  startMetronome(bpm: number) {
    if (this.timerID) return;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler(bpm);
  }

  stopMetronome() {
    window.clearTimeout(this.timerID);
    this.timerID = undefined;
  }

  scheduler(bpm: number) {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNoteTime += 60.0 / bpm;
    }
    this.timerID = window.setTimeout(() => this.scheduler(bpm), 25);
  }

  scheduleNote(time: number) {
    const buffer = this.metronomeSounds.get(this.currentMetronomeSound);
    if (!buffer) {
        console.warn(`Metronome sound "${this.currentMetronomeSound}" not loaded.`);
        return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.metronomeGain);
    source.start(time);
  }

  // --- Global Recording ---
  startRecording() {
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.destMediaStream.stream);
    this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  stopRecording(): string {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        return URL.createObjectURL(blob);
    }
    return '';
  }

  // --- Track Input Recording ---
  async startTrackRecording(deviceId?: string): Promise<void> {
    const constraints = {
        audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
        }
    };
    
    try {
        this.trackRecordingStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.trackRecordingChunks = [];
        this.activeTrackRecorder = new MediaRecorder(this.trackRecordingStream);
        
        this.activeTrackRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.trackRecordingChunks.push(e.data);
        };
        this.activeTrackRecorder.start();
    } catch (e) {
        console.error("Error starting track recording:", e);
        throw e;
    }
  }

  async stopTrackRecording(): Promise<AudioBuffer | null> {
      return new Promise((resolve, reject) => {
          if (!this.activeTrackRecorder || this.activeTrackRecorder.state === 'inactive') {
              resolve(null);
              return;
          }

          this.activeTrackRecorder.onstop = async () => {
              try {
                const blob = new Blob(this.trackRecordingChunks, { type: 'audio/webm' });
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                
                // Cleanup
                if (this.trackRecordingStream) {
                    this.trackRecordingStream.getTracks().forEach(track => track.stop());
                    this.trackRecordingStream = null;
                }
                this.activeTrackRecorder = null;
                this.trackRecordingChunks = [];
                
                resolve(audioBuffer);
              } catch (e) {
                console.error("Error processing track recording:", e);
                reject(e);
              }
          };
          
          this.activeTrackRecorder.stop();
      });
  }

  // --- Export Utils ---
  bufferToWav(buffer: AudioBuffer): Blob {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2 + 44;
      const bufferArr = new ArrayBuffer(length);
      const view = new DataView(bufferArr);
      const channels = [];
      let i;
      let sample;
      let offset = 0;
      let pos = 0;
  
      // write WAVE header
      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8); // file length - 8
      setUint32(0x45564157); // "WAVE"
  
      setUint32(0x20746d66); // "fmt " chunk
      setUint32(16); // length = 16
      setUint16(1); // PCM (uncompressed)
      setUint16(numOfChan);
      setUint32(buffer.sampleRate);
      setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
      setUint16(numOfChan * 2); // block-align
      setUint16(16); // 16-bit (hardcoded in this example)
  
      setUint32(0x61746164); // "data" - chunk
      setUint32(length - pos - 4); // chunk length
  
      // write interleaved data
      for (i = 0; i < buffer.numberOfChannels; i++)
          channels.push(buffer.getChannelData(i));
  
      while (pos < buffer.length) {
          for (i = 0; i < numOfChan; i++) {
              // interleave channels
              sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
              sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
              view.setInt16(offset, sample, true); // write 16-bit sample
              offset += 2;
          }
          pos++;
      }
  
      return new Blob([bufferArr], { type: "audio/wav" });
  
      function setUint16(data: number) {
          view.setUint16(offset, data, true);
          offset += 2;
      }
  
      function setUint32(data: number) {
          view.setUint32(offset, data, true);
          offset += 4;
      }
  }
}

export const audioEngine = new AudioEngine();