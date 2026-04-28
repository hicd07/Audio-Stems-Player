"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, MoreVertical, GripVertical, Mic, Piano, Drum, Disc3, CircleDot, Music3, AudioWaveform } from 'lucide-react';
import { MidiControl, TrackData as TrackDataType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import IconSelectionModal from './IconSelectionModal';
import TrackMenuModal from './TrackMenuModal';

const TRACK_ICONS: { [key: string]: React.FC<any> } = {
    'mic': Mic,
    'piano': Piano,
    'drum': Drum,
    'cymbals': Disc3,
    'kick': CircleDot,
    'melody': Music3,
    'sample': AudioWaveform,
};

interface TrackProps {
    track: TrackDataType;
    selected: boolean;
    trackHeight: number;
}

const Track: React.FC<TrackProps> = ({ track, selected, trackHeight }) => {
    const { state, dispatch, handleDetectTempo } = useAppContext();
    const { isMidiLearn, midiMappingTarget } = state;

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(track.name);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isIconModalOpen, setIsIconModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleCommit = () => {
        if (name.trim() && name.trim() !== track.name) {
            dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { name: name.trim() } } });
        } else {
            setName(track.name);
        }
        setIsEditing(false);
    };

    const isTarget = (control: string) => midiMappingTarget?.trackId === track.id && midiMappingTarget?.control === control;
    const CurrentIcon = (track.icon && TRACK_ICONS[track.icon]) ? TRACK_ICONS[track.icon] : GripVertical;

    return (
        <div 
            style={{ height: trackHeight }} 
            className={`track-header group flex items-center justify-between p-inline-2 cursor-pointer transition-all border-b border-black/20 ${selected ? 'bg-[#546E7A] shadow-inner' : 'bg-[#37474F] hover:bg-[#455A64]'}`}
            onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
                <div className="flex items-center justify-center p-1 rounded-md bg-black/20 text-gray-400 group-hover:text-white transition-colors">
                    <CurrentIcon size={14} />
                </div>
                <div className="w-1.5 h-6 rounded-full shrink-0 shadow-sm" style={{backgroundColor: track.color}}></div>
                
                {isEditing ? (
                    <input 
                        ref={inputRef} 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        onBlur={handleCommit} 
                        onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); if(e.key === 'Escape') { setName(track.name); setIsEditing(false); } }} 
                        className="bg-[#2B3539] text-white w-full p-inline-1 rounded border-none outline-none text-[11px] font-bold"
                    />
                ) : (
                    <span className="truncate text-[11px] font-bold tracking-tight uppercase" title={track.name}>{track.name}</span>
                )}
                {!track.audioBuffer && <Upload size={14} className={`shrink-0 ${selected ? 'text-cyan-400' : 'text-gray-500'}`} />}
            </div>

            <div className="flex items-center gap-1 p-inline-start-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); isMidiLearn ? dispatch({ type: 'SET_MIDI_MAPPING_TARGET', payload: { trackId: track.id, control: 'solo' } }) : dispatch({ type: 'TOGGLE_SOLO', payload: track.id }); }} 
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-[9px] font-black transition-all shadow-sm ${track.isSolo ? 'bg-yellow-500 text-black' : 'bg-black/20 text-yellow-500 hover:bg-black/40'} ${isTarget('solo') ? 'outline outline-2 outline-yellow-400 animate-pulse' : ''}`}
                >
                    S
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); isMidiLearn ? dispatch({ type: 'SET_MIDI_MAPPING_TARGET', payload: { trackId: track.id, control: 'mute' } }) : dispatch({ type: 'TOGGLE_MUTE', payload: track.id }); }} 
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-[9px] font-black transition-all shadow-sm ${track.isMuted ? 'bg-blue-500 text-white' : 'bg-black/20 text-blue-500 hover:bg-black/40'} ${isTarget('mute') ? 'outline outline-2 outline-yellow-400 animate-pulse' : ''}`}
                >
                    M
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMenuModalOpen(true); }} 
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-black/10 text-gray-400 hover:text-white hover:bg-black/30 transition-all"
                >
                    <MoreVertical size={14} />
                </button>
            </div>

             {isMenuModalOpen && (
                <TrackMenuModal 
                    track={track}
                    onClose={() => setIsMenuModalOpen(false)}
                    onStartRename={() => setIsEditing(true)}
                    onOpenIconModal={() => setIsIconModalOpen(true)}
                    onDetectTempo={() => handleDetectTempo(track.id)}
                />
            )}
            {isIconModalOpen && (
                <IconSelectionModal
                    onClose={() => setIsIconModalOpen(false)}
                    onSelectIcon={(key) => { dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { icon: key || undefined } } }); setIsIconModalOpen(false); }}
                />
            )}
        </div>
    );
};

export default React.memo(Track);