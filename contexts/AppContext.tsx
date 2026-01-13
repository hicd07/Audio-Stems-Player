import React, { createContext, useReducer, useContext, Dispatch, useEffect, useCallback, useRef } from 'react';
import { TrackData, TransportState, AudioDeviceInfo, MidiDeviceInfo, MidiMapping, MidiMappingTarget, EffectType, MetronomeSound, TRACK_COLORS } from '../types';
import JSZip from 'jszip';
import { audioEngine } from '../services/audioEngine';

// --- STATE ---
export interface AppState {
    tracks: TrackData[];
    selectedTrackId: number | null;
    transport: TransportState;
    viewMode: 'PLAYLIST' | 'MIXER';
    isPlaylistPanelVisible: boolean;
    projectName: string;
    isLoading: boolean;
    // Modals
    showSettings: boolean;
    isMetronomeModalOpen: boolean;
    // Devices
    inputDevices: AudioDeviceInfo[];
    outputDevices: AudioDeviceInfo[];
    enabledAudioInputDevices: Set<string>;
    enabledAudioOutputDevices: Set<string>;
    masterOutputId: string;
    // Master/Metronome
    masterVolume: number;
    metronomeVolume: number;
    metronomePan: number;
    metronomeSound: MetronomeSound;
    metronomeOutputId: string;
    // MIDI
    midiInputs: MidiDeviceInfo[];
    enabledMidiDevices: Set<string>;
    isMidiLearn: boolean;
    midiMappings: MidiMapping;
    midiMappingTarget: MidiMappingTarget | null;
}

// --- INITIAL STATE ---
const createInitialTracks = (count = 8): TrackData[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      name: `Track ${i + 1}`,
      color: TRACK_COLORS[0],
      icon: undefined,
      audioBuffer: null,
      isMuted: false,
      isSolo: false,
      volume: 0.8,
      pan: 0,
      effect: { type: EffectType.NONE, dryWet: 0, params: { param1: 0.5, param2: 0.5 }},
      inputDeviceId: '',
      outputDeviceId: '',
      trimStart: 0,
      trimEnd: 0,
      isClipping: false,
    }));
};

const initialTracks = createInitialTracks();
export const initialState: AppState = {
    tracks: initialTracks,
    selectedTrackId: initialTracks[0]?.id || null,
    transport: { isPlaying: false, bpm: 120, metronomeOn: false, isRecording: false, loop: false, currentTime: 0, duration: 32 },
    viewMode: 'PLAYLIST',
    isPlaylistPanelVisible: true,
    projectName: 'New Project',
    isLoading: false,
    showSettings: false,
    isMetronomeModalOpen: false,
    inputDevices: [],
    outputDevices: [],
    enabledAudioInputDevices: new Set(),
    enabledAudioOutputDevices: new Set(),
    masterOutputId: '',
    masterVolume: 0.8,
    metronomeVolume: 0.5,
    metronomePan: 0,
    metronomeSound: 'classic',
    metronomeOutputId: '',
    midiInputs: [],
    enabledMidiDevices: new Set(),
    isMidiLearn: false,
    midiMappings: {},
    midiMappingTarget: null,
};


// --- ACTIONS ---
type Action =
  | { type: 'SET_TRACKS'; payload: TrackData[] }
  | { type: 'ADD_TRACK' }
  | { type: 'REMOVE_TRACK'; payload: number }
  | { type: 'UPDATE_TRACK'; payload: { id: number; updates: Partial<TrackData> } }
  | { type: 'LOAD_AUDIO_TO_TRACK'; payload: { id: number; buffer: AudioBuffer; fileName: string } }
  | { type: 'SET_SELECTED_TRACK'; payload: number | null }
  | { type: 'TOGGLE_MUTE'; payload: number }
  | { type: 'TOGGLE_SOLO'; payload: number }
  | { type: 'SET_CLIPPING'; payload: { trackId: number; isClipping: boolean } }
  | { type: 'SET_TRANSPORT'; payload: Partial<TransportState> }
  | { type: 'SET_VIEW_MODE'; payload: 'PLAYLIST' | 'MIXER' }
  | { type: 'SET_PLAYLIST_PANEL_VISIBLE'; payload: boolean }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'LOAD_PROJECT'; payload: File }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_METRONOME_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_AUDIO_DEVICES'; payload: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] } }
  | { type: 'TOGGLE_AUDIO_DEVICE'; payload: { deviceId: string; kind: 'audioinput' | 'audiooutput' } }
  | { type: 'SET_MASTER_OUTPUT'; payload: string }
  | { type: 'SET_MASTER_VOLUME'; payload: number }
  | { type: 'SET_METRONOME_VOLUME'; payload: number }
  | { type: 'SET_METRONOME_PAN'; payload: number }
  | { type: 'SET_METRONOME_SOUND'; payload: MetronomeSound }
  | { type: 'SET_METRONOME_OUTPUT'; payload: string }
  | { type: 'SET_MIDI_DEVICES'; payload: MidiDeviceInfo[] }
  | { type: 'TOGGLE_MIDI_DEVICE'; payload: string }
  | { type: 'TOGGLE_MIDI_LEARN' }
  | { type: 'SET_MIDI_MAPPING'; payload: { midiId: string, target: MidiMappingTarget } }
  | { type: 'SET_MIDI_MAPPING_TARGET'; payload: MidiMappingTarget | null }
  | { type: 'RESET_STATE'; payload: AppState };

// --- REDUCER ---
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_TRACKS': return { ...state, tracks: action.payload };
    case 'ADD_TRACK':
        const newTrack: TrackData = { id: Date.now(), name: `Track ${state.tracks.length + 1}`, color: TRACK_COLORS[0], icon: undefined, audioBuffer: null, isMuted: false, isSolo: false, volume: 0.8, pan: 0, effect: { type: EffectType.NONE, dryWet: 0, params: { param1: 0.5, param2: 0.5 }}, trimStart: 0, trimEnd: 0, isClipping: false };
        return { ...state, tracks: [...state.tracks, newTrack] };
    case 'REMOVE_TRACK': return { ...state, tracks: state.tracks.filter(t => t.id !== action.payload) };
    case 'UPDATE_TRACK':
        return { ...state, tracks: state.tracks.map(t => t.id === action.payload.id ? { ...t, ...action.payload.updates } : t) };
    case 'LOAD_AUDIO_TO_TRACK':
        const newTracks = state.tracks.map(t => t.id === action.payload.id ? { ...t, audioBuffer: action.payload.buffer, name: action.payload.fileName.replace(/\.[^/.]+$/, "").substring(0, 20), trimStart: 0, trimEnd: action.payload.buffer.duration } : t);
        const maxDuration = newTracks.reduce((max, track) => (track.audioBuffer ? Math.max(max, track.audioBuffer.duration) : max), state.transport.duration);
        return { ...state, tracks: newTracks, transport: { ...state.transport, duration: Math.max(state.transport.duration, Math.ceil(maxDuration)) } };
    case 'SET_SELECTED_TRACK': return { ...state, selectedTrackId: action.payload };
    case 'TOGGLE_MUTE': return { ...state, tracks: state.tracks.map(t => t.id === action.payload ? { ...t, isMuted: !t.isMuted } : t) };
    case 'TOGGLE_SOLO': return { ...state, tracks: state.tracks.map(t => t.id === action.payload ? { ...t, isSolo: !t.isSolo } : t) };
    case 'SET_CLIPPING': return { ...state, tracks: state.tracks.map(t => t.id === action.payload.trackId ? { ...t, isClipping: action.payload.isClipping } : t) };
    
    case 'SET_TRANSPORT': return { ...state, transport: { ...state.transport, ...action.payload } };
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload };
    case 'SET_PLAYLIST_PANEL_VISIBLE': return { ...state, isPlaylistPanelVisible: action.payload };
    case 'SET_IS_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_PROJECT_NAME': return { ...state, projectName: action.payload };
    case 'LOAD_PROJECT': // This is a command action, handled by middleware/hook
        return state;
    case 'RESET_STATE': return { ...action.payload };

    case 'SET_SHOW_SETTINGS': return { ...state, showSettings: action.payload };
    case 'SET_METRONOME_MODAL_OPEN': return { ...state, isMetronomeModalOpen: action.payload };
    
    case 'SET_AUDIO_DEVICES': return { ...state, inputDevices: action.payload.inputs, outputDevices: action.payload.outputs };
    case 'TOGGLE_AUDIO_DEVICE':
        const { deviceId, kind } = action.payload;
        const set = kind === 'audioinput' ? state.enabledAudioInputDevices : state.enabledAudioOutputDevices;
        const newSet = new Set(set);
        if (newSet.has(deviceId)) newSet.delete(deviceId); else newSet.add(deviceId);
        return kind === 'audioinput' ? { ...state, enabledAudioInputDevices: newSet } : { ...state, enabledAudioOutputDevices: newSet };
    case 'SET_MASTER_OUTPUT': return { ...state, masterOutputId: action.payload };
    
    case 'SET_MASTER_VOLUME': return { ...state, masterVolume: action.payload };
    case 'SET_METRONOME_VOLUME': return { ...state, metronomeVolume: action.payload };
    case 'SET_METRONOME_PAN': return { ...state, metronomePan: action.payload };
    case 'SET_METRONOME_SOUND': return { ...state, metronomeSound: action.payload };
    case 'SET_METRONOME_OUTPUT': return { ...state, metronomeOutputId: action.payload };

    case 'SET_MIDI_DEVICES': return { ...state, midiInputs: action.payload };
    case 'TOGGLE_MIDI_DEVICE':
        const newMidiSet = new Set(state.enabledMidiDevices);
        if (newMidiSet.has(action.payload)) newMidiSet.delete(action.payload); else newMidiSet.add(action.payload);
        return { ...state, enabledMidiDevices: newMidiSet };
    case 'TOGGLE_MIDI_LEARN': return { ...state, isMidiLearn: !state.isMidiLearn, midiMappingTarget: null };
    case 'SET_MIDI_MAPPING':
        return { ...state, midiMappings: { ...state.midiMappings, [action.payload.midiId]: action.payload.target }, isMidiLearn: false, midiMappingTarget: null };
    case 'SET_MIDI_MAPPING_TARGET': return { ...state, midiMappingTarget: action.payload };
    
    default: return state;
  }
};

// --- Tempo Detection Utility ---
async function detectTempoFromBuffer(audioBuffer: AudioBuffer): Promise<number | null> {
    const sampleRate = audioBuffer.sampleRate;
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150; // Isolate kick/bass frequencies
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const data = renderedBuffer.getChannelData(0);

    const peaks: number[] = [];
    const peakThreshold = 0.3; // This may need adjustment for different material

    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > peakThreshold) {
            peaks.push(i);
        }
    }

    if (peaks.length < 4) return null; // Not enough peaks for a reliable guess

    const intervals: number[] = [];
    for (let i = 0; i < peaks.length - 1; i++) {
        const intervalInSamples = peaks[i + 1] - peaks[i];
        const intervalInSeconds = intervalInSamples / sampleRate;
        intervals.push(intervalInSeconds);
    }

    const intervalGroups: { [key: number]: number } = {};
    intervals.forEach(interval => {
        if (interval > 0) {
            const tempo = 60 / interval;
            if (tempo >= 70 && tempo <= 180) { // Consider a reasonable BPM range
                const roundedTempo = Math.round(tempo);
                intervalGroups[roundedTempo] = (intervalGroups[roundedTempo] || 0) + 1;
            }
        }
    });

    let bestTempo = 0;
    let maxCount = 0;
    for (const tempo in intervalGroups) {
        if (intervalGroups[tempo] > maxCount) {
            maxCount = intervalGroups[tempo];
            bestTempo = parseInt(tempo, 10);
        }
    }

    if (bestTempo === 0) return null;

    // Refine tempo by averaging intervals around the best guess
    const tempoInterval = 60 / bestTempo;
    const threshold = 0.1; // 10% tolerance for interval matching
    const validIntervals = intervals.filter(interval => Math.abs(interval - tempoInterval) < tempoInterval * threshold);

    if (validIntervals.length < 2) return bestTempo; // Not enough consensus, return rounded guess

    const averageInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;

    return 60 / averageInterval;
}


// --- CONTEXT ---
interface AppContextValue {
    state: AppState;
    dispatch: Dispatch<Action>;
    refreshMidiDevices: () => Promise<void>;
    refreshAudioDevices: () => Promise<void>;
    handleDetectTempo: (trackId: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
    state: initialState,
    dispatch: () => null,
    refreshMidiDevices: async () => {},
    refreshAudioDevices: async () => {},
    handleDetectTempo: async () => {},
});

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    const onMidiMessageRef = useRef<(event: MIDIMessageEvent) => void>();

    // Keep the MIDI message handler updated with the latest state using a ref
    useEffect(() => {
        onMidiMessageRef.current = (event: MIDIMessageEvent) => {
            if (!state.enabledMidiDevices.has((event.currentTarget as any).id)) return;
    
            const [command, note, velocity] = event.data;
            const isCC = (command & 0xF0) === 0xB0;
            const channel = command & 0x0F;

            if (isCC) {
                const midiId = `cc-${note}-ch-${channel}`;
                if (state.isMidiLearn && state.midiMappingTarget) {
                    dispatch({ type: 'SET_MIDI_MAPPING', payload: { midiId, target: state.midiMappingTarget }});
                    return;
                }
                
                const mapping = state.midiMappings[midiId];
                if (mapping) {
                    const val = velocity / 127;
                    switch(mapping.control) {
                        case 'volume': 
                            dispatch({ type: 'UPDATE_TRACK', payload: { id: mapping.trackId, updates: { volume: val } } });
                            break;
                        case 'pan':
                            dispatch({ type: 'UPDATE_TRACK', payload: { id: mapping.trackId, updates: { pan: (val * 2) - 1 } } });
                            break;
                        case 'mute':
                            if (velocity > 0) dispatch({ type: 'TOGGLE_MUTE', payload: mapping.trackId });
                            break;
                        case 'solo': 
                            if (velocity > 0) dispatch({ type: 'TOGGLE_SOLO', payload: mapping.trackId });
                            break;
                    }
                }
            }
        };
    }, [state.enabledMidiDevices, state.isMidiLearn, state.midiMappingTarget, state.midiMappings, dispatch]);

    const refreshMidiDevices = useCallback(async () => {
        try {
            const access = await navigator.requestMIDIAccess();
            const inputs: MidiDeviceInfo[] = [];
            access.inputs.forEach(input => {
                inputs.push({ id: input.id, name: input.name || 'Unknown Device', manufacturer: input.manufacturer || 'Unknown' });
                input.onmidimessage = (event) => onMidiMessageRef.current?.(event);
            });
            dispatch({ type: 'SET_MIDI_DEVICES', payload: inputs });
        } catch (e) { console.error("Could not access MIDI devices.", e); }
    }, []);

    const refreshAudioDevices = useCallback(async () => {
        const devices = await audioEngine.getDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        dispatch({ type: 'SET_AUDIO_DEVICES', payload: { inputs, outputs } });
    }, []);

    const handleDetectTempo = useCallback(async (trackId: number) => {
        const track = state.tracks.find(t => t.id === trackId);
        if (!track || !track.audioBuffer) {
            alert('No audio loaded in this track to analyze.');
            return;
        }

        dispatch({ type: 'SET_IS_LOADING', payload: true });
        try {
            const tempo = await detectTempoFromBuffer(track.audioBuffer);
            if (tempo) {
                const roundedTempo = parseFloat(tempo.toFixed(2));
                if (window.confirm(`Detected tempo: ${roundedTempo} BPM.\n\nSet as project tempo?`)) {
                    dispatch({ type: 'SET_TRANSPORT', payload: { bpm: roundedTempo } });
                }
            } else {
                alert('Could not detect a clear tempo for this track.');
            }
        } catch (error) {
            console.error("Tempo detection failed:", error);
            alert('An error occurred during tempo detection.');
        } finally {
            dispatch({ type: 'SET_IS_LOADING', payload: false });
        }
    }, [state.tracks]);


    // Initial device fetch on mount
    useEffect(() => {
        refreshAudioDevices();
        refreshMidiDevices();
    }, [refreshAudioDevices, refreshMidiDevices]);

    const asyncDispatch = async (action: Action) => {
        if (action.type === 'LOAD_PROJECT') {
            dispatch({ type: 'SET_IS_LOADING', payload: true });
            audioEngine.stopAll();
            audioEngine.reset();
            try {
                const zip = await JSZip.loadAsync(action.payload);
                const projectFile = zip.file("project.json");
                if (!projectFile) throw new Error("Invalid Project File");

                const projectData = JSON.parse(await projectFile.async("string"));
                const loadedTracks = [];
                for (const trackData of projectData.tracks) {
                    const audioFile = zip.file(`audio/${trackData.id}.wav`);
                    let audioBuffer = null;
                    if (audioFile) {
                        const buffer = await audioFile.async("arraybuffer");
                        audioBuffer = await audioEngine.decodeAudioData(buffer);
                    }
                    loadedTracks.push({ ...trackData, audioBuffer, isClipping: false });
                }
                
                const enabledMidiDevices = new Set(projectData.enabledMidiDevices || []);

                const newState: AppState = {
                    ...initialState,
                    ...projectData,
                    tracks: loadedTracks,
                    enabledMidiDevices: enabledMidiDevices,
                    isLoading: false,
                };
                dispatch({ type: 'RESET_STATE', payload: newState });

            } catch (e) {
                console.error("Failed to load project:", e);
                alert("Failed to load project file.");
            } finally {
                dispatch({ type: 'SET_IS_LOADING', payload: false });
            }
        } else {
            dispatch(action);
        }
    };
    
    return (
        <AppContext.Provider value={{ state, dispatch: asyncDispatch, refreshMidiDevices, refreshAudioDevices, handleDetectTempo }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);