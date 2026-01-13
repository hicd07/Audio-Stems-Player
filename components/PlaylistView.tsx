import React, { useRef, useEffect, useState } from 'react';
import { TrackData } from '../types';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, PlusCircle } from 'lucide-react';
import Track from './Track';
import { useAppContext } from '../contexts/AppContext';
import { audioEngine } from '../services/audioEngine';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TrackLane: React.FC<{
  data: TrackData;
  duration: number;
  pixelsPerSecond: number;
  trackHeight: number;
  selected: boolean;
}> = ({ 
  data, 
  duration,
  pixelsPerSecond,
  trackHeight,
  selected,
}) => {
  const { dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && duration > 0) {
        drawCanvas(data.audioBuffer, canvasRef.current, pixelsPerSecond, trackHeight);
    }
  }, [data.audioBuffer, duration, pixelsPerSecond, trackHeight, data.trimStart, data.trimEnd, data.color, selected]);
  
  const drawCanvas = (buffer: AudioBuffer | null, canvas: HTMLCanvasElement, pxPerSec: number, height: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, height);
    if (buffer) {
        const channelData = buffer.getChannelData(0);
        
        const clipStart = data.trimStart || 0;
        const clipEnd = data.trimEnd && data.trimEnd > 0 ? data.trimEnd : buffer.duration;
        const clipDuration = clipEnd - clipStart;

        const waveformWidthInPixels = Math.floor(clipDuration * pxPerSec);
        const startOffsetInClip = Math.floor(clipStart * buffer.sampleRate);
        const endOffsetInClip = Math.floor(clipEnd * buffer.sampleRate);
        const samplesToDraw = endOffsetInClip - startOffsetInClip;

        const startX = Math.floor(clipStart * pxPerSec);
        const amp = (height / 2) * 0.9;
        ctx.fillStyle = data.color;

        const rectWidth = 1;
        for (let i = 0; i < waveformWidthInPixels; i+= rectWidth) {
            const sampleIndex = startOffsetInClip + Math.floor((i / waveformWidthInPixels) * samplesToDraw);
            const sample = channelData[sampleIndex];
            const y = (1 - sample) * amp;
            ctx.fillRect(startX + i, y, rectWidth, rectWidth);
        }

        const region = new Path2D();
        region.rect(startX, 0, waveformWidthInPixels, height);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke(region);
        ctx.fillStyle = hexToRgba(data.color, 0.15);
        ctx.fill(region);
    }
  };

  const onLoadFile = React.useCallback(async (id: number, file: File) => {
    dispatch({ type: 'SET_IS_LOADING', payload: true });
    try {
        const buffer = await audioEngine.loadAudio(file);
        dispatch({ type: 'LOAD_AUDIO_TO_TRACK', payload: { id, buffer, fileName: file.name } });
    } catch (e) {
        console.error("Failed to load audio file", e);
    } finally {
        dispatch({ type: 'SET_IS_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if(containerRef.current) containerRef.current.style.backgroundColor = 'rgba(74, 88, 93, 0.5)'; };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); if(containerRef.current) containerRef.current.style.backgroundColor = ''; };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if(containerRef.current) containerRef.current.style.backgroundColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) onLoadFile(data.id, file);
    }
  };
  
  return (
    <div ref={containerRef} style={{height: trackHeight, boxSizing: 'content-box'}} className="w-full relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => { if (!data.audioBuffer) fileInputRef.current?.click() }}>
        <canvas ref={canvasRef} width={duration * pixelsPerSecond} height={trackHeight} className="absolute top-0 left-0"/>
        {!data.audioBuffer && (
            <div className={`absolute inset-0 flex items-center justify-center text-xs pointer-events-none transition-all
                ${selected ? 'bg-cyan-900/50 text-cyan-300 border-2 border-dashed border-cyan-500/80' : 'text-gray-500'}`
            }>
                {selected ? 'Drop File or Click to Load Sample' : 'Drop Audio File or Click to Load'}
            </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={(e) => { if (e.target.files?.[0]) onLoadFile(data.id, e.target.files[0]); }} />
    </div>
  );
};

const TimelineRuler: React.FC<{ duration: number, bpm: number, pixelsPerSecond: number }> = ({ duration, bpm, pixelsPerSecond }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#252E32'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const secondsPerBar = (60 / bpm) * 4;
        ctx.font = '10px sans-serif'; ctx.fillStyle = '#90A4AE'; ctx.strokeStyle = '#90A4AE'; ctx.lineWidth = 1;
        for (let i = 0; (i * secondsPerBar) < duration; i++) {
            const barNumber = i + 1;
            const x = Math.floor(i * secondsPerBar * pixelsPerSecond) + 0.5;
            ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x, 24); ctx.stroke();
            ctx.fillText(barNumber.toString(), x + 4, 12);
        }
    }, [duration, bpm, pixelsPerSecond]);
    return <canvas ref={canvasRef} width={duration * pixelsPerSecond} height={24} />;
};

const GridCanvas: React.FC<{ duration: number, bpm: number, pixelsPerSecond: number, rowCount: number, trackHeight: number }> = ({ duration, bpm, pixelsPerSecond, rowCount, trackHeight }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const totalWidth = canvas.width; const totalHeight = canvas.height;
        ctx.clearRect(0, 0, totalWidth, totalHeight); ctx.fillStyle = '#2B3539'; ctx.fillRect(0, 0, totalWidth, totalHeight);
        const secondsPerBeat = 60 / bpm; const secondsPerBar = secondsPerBeat * 4;
        ctx.strokeStyle = '#252E32'; ctx.lineWidth = 1;
        for (let i = 1; i <= rowCount; i++) {
            const y = Math.floor(i * trackHeight) - 0.5;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(totalWidth, y); ctx.stroke();
        }
        ctx.strokeStyle = '#252E32';
        for (let i = 1; (i * secondsPerBar) < duration; i++) {
            const x = Math.floor(i * secondsPerBar * pixelsPerSecond) + 0.5;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalHeight); ctx.stroke();
        }
        ctx.strokeStyle = '#273034';
        for (let i = 1; (i * secondsPerBeat) < duration; i++) {
            if (i % 4 !== 0) {
                const x = Math.floor(i * secondsPerBeat * pixelsPerSecond) + 0.5;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalHeight); ctx.stroke();
            }
        }
    }, [duration, bpm, pixelsPerSecond, rowCount, trackHeight]);
    return <canvas ref={canvasRef} width={duration * pixelsPerSecond} height={rowCount * trackHeight} className="absolute top-0 left-0 z-0" />;
};

const PlaylistView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { tracks, transport, selectedTrackId, isPlaylistPanelVisible } = state;
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    const rulerContainerRef = useRef<HTMLDivElement>(null);
    
    const [hZoom, setHZoom] = useState(1);
    const [vZoom, setVZoom] = useState(1);
    const pixelsPerSecond = 80 * hZoom;
    const trackHeight = 64 * vZoom;

    useEffect(() => {
        const timelineEl = timelineContainerRef.current;
        const headerEl = headerContainerRef.current;

        if (timelineEl && headerEl) {
            const resizeObserver = new ResizeObserver(() => {
                const scrollbarHeight = timelineEl.offsetHeight - timelineEl.clientHeight;
                headerEl.style.paddingBottom = `${scrollbarHeight}px`;
            });
            resizeObserver.observe(timelineEl);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (headerContainerRef.current) headerContainerRef.current.scrollTop = e.currentTarget.scrollTop;
        if (rulerContainerRef.current) rulerContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    };

    return (
        <div className="flex-1 flex bg-[#2B3539] w-full h-full">
            <div className={`
                ${isPlaylistPanelVisible ? 'w-56' : 'w-0 border-r-0'} 
                flex-shrink-0 bg-[#37474F] border-r border-black/30 shadow-lg 
                transition-all duration-300 overflow-hidden`}>
                <div className="w-56">
                     <div className="h-8 bg-[#252E32] flex items-center justify-between gap-2 text-xs px-2">
                        <button onClick={() => dispatch({ type: 'ADD_TRACK' })} title="Add New Track" className="btn p-1.5 rounded text-gray-300">
                            <PlusCircle size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="compact-btn-group">
                                <button onClick={() => setHZoom(z => Math.max(0.2, z - 0.2))} title="Zoom Out Horizontally">
                                    <ZoomOut size={16} strokeWidth={2.5}/>
                                </button>
                                <span className="compact-btn-group-label">H</span>
                                <button onClick={() => setHZoom(z => z + 0.2)} title="Zoom In Horizontally">
                                    <ZoomIn size={16} strokeWidth={2.5}/>
                                </button>
                            </div>
                            <div className="compact-btn-group">
                                <button onClick={() => setVZoom(z => Math.max(0.5, z - 0.1))} title="Zoom Out Vertically">
                                    <ArrowDown size={16} strokeWidth={2.5}/>
                                </button>
                                <span className="compact-btn-group-label">V</span>
                                <button onClick={() => setVZoom(z => z + 0.1)} title="Zoom In Vertically">
                                    <ArrowUp size={16} strokeWidth={2.5}/>
                                </button>
                            </div>
                        </div>
                     </div>
                     <div ref={headerContainerRef} className="overflow-hidden h-[calc(100%-32px)]" style={{ boxSizing: 'border-box' }}>
                        {tracks.map(track => ( <Track key={track.id} track={track} selected={track.id === selectedTrackId} trackHeight={trackHeight} /> ))}
                     </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div ref={rulerContainerRef} className="h-8 overflow-hidden flex-shrink-0 hide-scrollbar flex items-center">
                    <TimelineRuler duration={transport.duration} bpm={transport.bpm} pixelsPerSecond={pixelsPerSecond} />
                </div>
                <div
                  ref={timelineContainerRef}
                  className="flex-1 relative overflow-auto shadow-inner"
                  onScroll={handleScroll}
                >
                    <div className="relative" style={{ width: transport.duration * pixelsPerSecond, height: tracks.length * trackHeight }}>
                        <GridCanvas duration={transport.duration} bpm={transport.bpm} pixelsPerSecond={pixelsPerSecond} rowCount={tracks.length} trackHeight={trackHeight} />
                        <div className="absolute top-0 left-0 z-10 w-full">
                            {tracks.map(track => ( <TrackLane key={track.id} data={track} duration={transport.duration} pixelsPerSecond={pixelsPerSecond} trackHeight={trackHeight} selected={track.id === selectedTrackId} /> ))}
                        </div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/90 z-20 pointer-events-none" style={{ left: transport.currentTime * pixelsPerSecond }} >
                            <div className="absolute -top-[1px] -left-[5.5px] w-3 h-3 bg-red-500 transform rotate-45 border-r border-b border-white/20"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistView;