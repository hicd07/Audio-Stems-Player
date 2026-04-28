"use client";

import React, { useRef, useEffect, useState } from 'react';
import { TrackData } from '../types';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, PlusCircle } from 'lucide-react';
import Track from './Track';
import { useAppContext } from '../contexts/AppContext';
import { audioEngine } from '../services/audioEngine';

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
  isDragging: boolean;
}> = ({ 
  data, 
  duration,
  pixelsPerSecond,
  trackHeight,
  selected,
  isDragging
}) => {
  const { dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && duration > 0) {
        drawWaveform();
    }
  }, [data.audioBuffer, duration, pixelsPerSecond, trackHeight, data.trimStart, data.trimEnd, data.color, selected]);
  
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!data.audioBuffer) return;

    const buffer = data.audioBuffer;
    const pxPerSec = pixelsPerSecond;
    const height = trackHeight;
    const clipStartSec = data.trimStart || 0;
    const clipEndSec = data.trimEnd > 0 ? data.trimEnd : buffer.duration;
    
    const clipStartPx = Math.floor(clipStartSec * pxPerSec);
    const clipEndPx = Math.floor(clipEndSec * pxPerSec);
    const clipWidthPx = clipEndPx - clipStartPx;

    // Region Background
    ctx.fillStyle = hexToRgba(data.color, 0.15);
    ctx.fillRect(clipStartPx, 0, clipWidthPx, height);
    
    // Waveform
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const centerY = height / 2;
    const amp = centerY * 0.9;
    const samplesPerPixel = sampleRate / pxPerSec;
    const clipStartSample = Math.floor(clipStartSec * sampleRate);

    ctx.fillStyle = selected ? hexToRgba(data.color, 0.9) : hexToRgba(data.color, 0.6);

    for (let x = 0; x < clipWidthPx; x++) {
      const sampleStartIndex = Math.floor(clipStartSample + (x * samplesPerPixel));
      if (sampleStartIndex >= channelData.length) break;
      const sampleEndIndex = Math.min(Math.floor(sampleStartIndex + samplesPerPixel), channelData.length);
      let min = 1.0;
      let max = -1.0;
      for (let i = sampleStartIndex; i < sampleEndIndex; i++) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const yMax = centerY - (max * amp);
      const yMin = centerY - (min * amp);
      ctx.fillRect(clipStartPx + x, yMax, 1, Math.max(1, yMin - yMax));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        dispatch({ type: 'SET_IS_LOADING', payload: true });
        const buffer = await audioEngine.loadAudio(file);
        dispatch({ type: 'LOAD_AUDIO_TO_TRACK', payload: { id: data.id, buffer, fileName: file.name } });
        dispatch({ type: 'SET_IS_LOADING', payload: false });
      }
    }
  };
  
  return (
    <div 
        style={{ height: trackHeight }} 
        className={`w-full relative border-b border-black/20 group transition-colors ${selected ? 'bg-cyan-900/10' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => { if (!data.audioBuffer && !isDragging) fileInputRef.current?.click() }}
    >
        <canvas ref={canvasRef} width={duration * pixelsPerSecond} height={trackHeight} className="absolute top-0 left-0 pointer-events-none"/>
        {!data.audioBuffer && (
            <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none ${selected ? 'text-cyan-400' : 'text-gray-500'}`}>
                Drop Sample or Click to Load
            </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={async (e) => {
            if (e.target.files?.[0]) {
                dispatch({ type: 'SET_IS_LOADING', payload: true });
                const buffer = await audioEngine.loadAudio(e.target.files[0]);
                dispatch({ type: 'LOAD_AUDIO_TO_TRACK', payload: { id: data.id, buffer, fileName: e.target.files[0].name } });
                dispatch({ type: 'SET_IS_LOADING', payload: false });
            }
        }} />
    </div>
  );
};

const PlaylistView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { tracks, transport, selectedTrackId, isPlaylistPanelVisible } = state;
    
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const rulerContainerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    
    const [hZoom, setHZoom] = useState(1);
    const [vZoom, setVZoom] = useState(1);
    const pixelsPerSecond = 80 * hZoom;
    const trackHeight = clamp(48 * vZoom, 44, 200);

    const [dragState, setDragState] = useState({ isDragging: false, startX: 0, scrollLeft: 0, hasMoved: false });

    function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

    const syncScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (headerContainerRef.current) headerContainerRef.current.scrollTop = e.currentTarget.scrollTop;
        if (rulerContainerRef.current) rulerContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragState({ isDragging: true, startX: clientX, scrollLeft: timelineContainerRef.current?.scrollLeft || 0, hasMoved: false });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragState.isDragging || !timelineContainerRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const walk = clientX - dragState.startX;
        if (Math.abs(walk) > 5) setDragState(prev => ({ ...prev, hasMoved: true }));
        timelineContainerRef.current.scrollLeft = dragState.scrollLeft - walk;
    };

    return (
        <div className="flex-1 flex bg-[#2B3539] w-full h-full overflow-hidden">
            {/* Left Panel: Tracks */}
            <aside 
                className={`flex-none bg-[#37474F] border-r border-black/40 shadow-2xl transition-all duration-300 overflow-hidden flex flex-col ${isPlaylistPanelVisible ? 'w-64' : 'w-0'}`}
            >
                <div className="h-11 bg-[#252E32] flex items-center justify-between p-inline-2 shadow-md">
                    <button onClick={() => dispatch({ type: 'ADD_TRACK' })} className="btn p-inline-3 !h-8 text-cyan-400">
                        <PlusCircle size={18} />
                    </button>
                    <div className="flex gap-2">
                        <div className="compact-btn-group">
                            <button onClick={() => setHZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut size={14}/></button>
                            <span className="compact-btn-group-label">H</span>
                            <button onClick={() => setHZoom(z => z + 0.2)}><ZoomIn size={14}/></button>
                        </div>
                        <div className="compact-btn-group">
                            <button onClick={() => setVZoom(z => Math.max(0.5, z - 0.1))}><ArrowDown size={14}/></button>
                            <span className="compact-btn-group-label">V</span>
                            <button onClick={() => setVZoom(z => z + 0.1)}><ArrowUp size={14}/></button>
                        </div>
                    </div>
                </div>
                <div ref={headerContainerRef} className="flex-1 overflow-hidden hide-scrollbar">
                    {tracks.map(track => (
                        <Track key={track.id} track={track} selected={track.id === selectedTrackId} trackHeight={trackHeight} />
                    ))}
                </div>
            </aside>

            {/* Right Panel: Timeline */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Ruler */}
                <div ref={rulerContainerRef} className="h-11 bg-[#252E32] overflow-hidden hide-scrollbar border-b border-black/20 flex items-end">
                    <div className="relative h-full flex items-end" style={{ width: transport.duration * pixelsPerSecond }}>
                        {Array.from({ length: Math.ceil(transport.duration) }).map((_, i) => (
                            <div key={i} className="absolute bottom-0 h-4 border-l border-gray-600 text-[9px] font-mono text-gray-500 pl-1" style={{ left: i * pixelsPerSecond }}>
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid & Lanes */}
                <div 
                    ref={timelineContainerRef}
                    onScroll={syncScroll}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={() => setDragState(p => ({ ...p, isDragging: false }))}
                    onMouseLeave={() => setDragState(p => ({ ...p, isDragging: false }))}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={() => setDragState(p => ({ ...p, isDragging: false }))}
                    className={`flex-1 overflow-auto bg-[#2B3539] relative shadow-inner ${dragState.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <div className="relative" style={{ width: transport.duration * pixelsPerSecond, minHeight: '100%' }}>
                        {/* Vertical Beat Lines */}
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: Math.ceil(transport.duration * (transport.bpm / 60)) }).map((_, i) => (
                                <div key={i} className={`absolute inset-y-0 border-l ${i % 4 === 0 ? 'border-black/30' : 'border-black/10'}`} style={{ left: i * (60 / transport.bpm) * pixelsPerSecond }}></div>
                            ))}
                        </div>
                        
                        {/* Audio Lanes */}
                        <div className="relative z-10">
                            {tracks.map(track => (
                                <TrackLane key={track.id} data={track} duration={transport.duration} pixelsPerSecond={pixelsPerSecond} trackHeight={trackHeight} selected={track.id === selectedTrackId} isDragging={dragState.hasMoved} />
                            ))}
                        </div>

                        {/* Playhead */}
                        <div 
                            className="absolute inset-y-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] z-20 pointer-events-none transition-all duration-75 ease-linear"
                            style={{ left: transport.currentTime * pixelsPerSecond }}
                        >
                            <div className="absolute top-0 -left-[5px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistView;