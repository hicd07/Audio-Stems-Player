import React, { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { MidiControl } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface TrackProps {
    track: {
        id: number;
        name: string;
        audioBuffer: AudioBuffer | null;
        isMuted: boolean;
        isSolo: boolean;
    };
    selected: boolean;
    trackHeight: number;
}

const Track: React.FC<TrackProps> = ({ track, selected, trackHeight }) => {
    const { state, dispatch } = useAppContext();
    const { isMidiLearn, midiMappingTarget } = state;

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(track.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const longPressTimeout = useRef<number | null>(null);

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
            setName(track.name); // Revert if empty
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommit();
        else if (e.key === 'Escape') {
            setName(track.name);
            setIsEditing(false);
        }
    };

    useEffect(() => {
        if (!isEditing) setName(track.name);
    }, [track.name, isEditing]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || isEditing) return;
        longPressTimeout.current = window.setTimeout(() => {
            if (window.confirm(`Are you sure you want to delete "${track.name}"?`)) {
                dispatch({ type: 'REMOVE_TRACK', payload: track.id });
            }
        }, 750);
    };

    const clearLongPress = () => {
        if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };

    const handleSetMappingTarget = (control: MidiControl) => {
        if (isMidiLearn) {
            dispatch({ type: 'SET_MIDI_MAPPING_TARGET', payload: { trackId: track.id, control } });
        }
    };
    
    const isTarget = (control: string) => midiMappingTarget?.trackId === track.id && midiMappingTarget?.control === control;

    return (
        <div 
            style={{ height: trackHeight, boxSizing: 'content-box' }} 
            className={`flex items-center justify-between px-2 cursor-pointer relative ${selected ? 'bg-[#546E7A]' : 'bg-[#37474F] hover:bg-[#455A64]'}`} 
            onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })} 
            onDoubleClick={() => setIsEditing(true)} 
            onMouseDown={handleMouseDown} 
            onMouseUp={clearLongPress} 
            onMouseLeave={clearLongPress}
        >
            <div className="flex items-center overflow-hidden">
                <div className={`w-1.5 h-4 rounded-full mr-2 flex-shrink-0 ${selected ? 'bg-green-400' : 'bg-green-400/40'}`}></div>
                {isEditing ? (
                    <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleCommit} onKeyDown={handleKeyDown} className="bg-[#2B3539] text-white w-full h-full p-0 border-0 outline-none text-xs"/>
                ) : (
                    <span className="truncate" title={track.name}>{track.name}</span>
                )}
                {!track.audioBuffer && <Upload size={16} strokeWidth={2.5} className={`ml-2 flex-shrink-0 transition-colors ${selected ? 'text-cyan-300' : 'text-gray-500'}`} />}
            </div>
            <div className="flex items-center space-x-1 pl-1">
                <button onClick={(e) => { e.stopPropagation(); isMidiLearn ? handleSetMappingTarget('solo') : dispatch({ type: 'TOGGLE_SOLO', payload: track.id }); }} className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${track.isSolo ? 'bg-yellow-500 text-black' : 'bg-black/20 hover:bg-black/40 text-yellow-500'} ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('solo') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse' : ''}`}>S</button>
                <button onClick={(e) => { e.stopPropagation(); isMidiLearn ? handleSetMappingTarget('mute') : dispatch({ type: 'TOGGLE_MUTE', payload: track.id }); }} className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${track.isMuted ? 'bg-blue-500 text-white' : 'bg-black/20 hover:bg-black/40 text-blue-500'} ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('mute') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse' : ''}`}>M</button>
            </div>
        </div>
    );
};

export default React.memo(Track);
