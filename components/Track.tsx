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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommit();
        else if (e.key === 'Escape') {
            setName(track.name);
            setIsEditing(false);
        }
    };
    
    useEffect(() => { if (!isEditing) setName(track.name); }, [track.name, isEditing]);
    
    const handleSetMappingTarget = (control: MidiControl) => {
        if (isMidiLearn) {
            dispatch({ type: 'SET_MIDI_MAPPING_TARGET', payload: { trackId: track.id, control } });
        }
    };
    
    const isTarget = (control: string) => midiMappingTarget?.trackId === track.id && midiMappingTarget?.control === control;

    const handleSetIcon = (iconKey: string | null) => {
        dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { icon: iconKey || undefined } } });
        setIsIconModalOpen(false);
    };

    const CurrentIcon = (track.icon && TRACK_ICONS[track.icon]) ? TRACK_ICONS[track.icon] : GripVertical;

    return (
        <>
            <div 
                style={{ height: trackHeight, boxSizing: 'content-box', background: selected ? '#546E7A' : '#37474F' }} 
                className={`flex items-center justify-between px-2 cursor-pointer relative transition-colors duration-150 hover:bg-[#455A64]`} 
                onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })} 
            >
                <div className="flex items-center overflow-hidden flex-1">
                    <CurrentIcon size={14} className="mr-2 flex-shrink-0 text-gray-400" />
                    <div className={`w-1.5 h-4 rounded-full mr-2 flex-shrink-0 transition-colors`} style={{backgroundColor: track.color}}></div>
                    {isEditing ? (
                        <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleCommit} onKeyDown={handleKeyDown} className="bg-[#2B3539] text-white w-full h-full p-0 border-0 outline-none text-xs font-semibold"/>
                    ) : (
                        <span className="truncate font-semibold" title={track.name}>{track.name}</span>
                    )}
                    {!track.audioBuffer && <Upload size={16} strokeWidth={2.5} className={`ml-2 flex-shrink-0 transition-colors ${selected ? 'text-cyan-300' : 'text-gray-500'}`} />}
                </div>
                <div className="flex items-center space-x-1 pl-1 z-10">
                    <button onClick={(e) => { e.stopPropagation(); isMidiLearn ? handleSetMappingTarget('solo') : dispatch({ type: 'TOGGLE_SOLO', payload: track.id }); }} className={`btn w-5 h-5 rounded text-[10px] font-bold ${track.isSolo ? 'bg-yellow-500 text-black' : 'text-yellow-500'} ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('solo') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse' : ''}`}>S</button>
                    <button onClick={(e) => { e.stopPropagation(); isMidiLearn ? handleSetMappingTarget('mute') : dispatch({ type: 'TOGGLE_MUTE', payload: track.id }); }} className={`btn w-5 h-5 rounded text-[10px] font-bold ${track.isMuted ? 'bg-blue-500 text-white' : 'text-blue-500'} ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('mute') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse' : ''}`}>M</button>
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuModalOpen(true); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-black/20 opacity-50 hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} />
                    </button>
                </div>
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
                    onSelectIcon={handleSetIcon}
                />
            )}
        </>
    );
};

export default React.memo(Track);