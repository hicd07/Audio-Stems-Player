import React, { useState, useEffect } from 'react';
import { X, Edit, Palette, Trash2 } from 'lucide-react';
import { TrackData as TrackDataType, TRACK_COLORS } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface TrackMenuModalProps {
    track: TrackDataType;
    onClose: () => void;
    onStartRename: () => void;
    onOpenIconModal: () => void;
}

const TrackMenuModal: React.FC<TrackMenuModalProps> = ({ track, onClose, onStartRename, onOpenIconModal }) => {
    const { dispatch } = useAppContext();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200); // Wait for animation
    };
    
    const handleRename = () => {
        onStartRename();
        handleClose();
    };
    
    const handleSetIcon = () => {
        onOpenIconModal();
        handleClose();
    };

    const handleSetColor = (color: string) => {
        dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { color } } });
        // No need to close here, user might want to try other colors
    };

    const handleDelete = () => {
        if(confirm(`Delete "${track.name}"? This cannot be undone.`)) {
            dispatch({ type: 'REMOVE_TRACK', payload: track.id });
        }
        handleClose();
    };

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
            <div className={`bg-[#2B3539] border border-black/30 rounded-lg shadow-2xl w-full max-w-xs transition-all duration-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 border-b border-black/30 bg-[#37474F] rounded-t-lg">
                    <h2 className="text-lg font-bold text-gray-200 truncate pr-4" title={track.name}>{track.name}</h2>
                    <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-black/20 flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-2 flex flex-col gap-1">
                    <button onClick={handleRename} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-gray-200 hover:bg-[#37474F] hover:text-white rounded text-sm font-semibold transition-colors"><Edit size={16}/> Rename Track</button>
                    <button onClick={handleSetIcon} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-gray-200 hover:bg-[#37474F] hover:text-white rounded text-sm font-semibold transition-colors"><Palette size={16}/> Set Icon</button>
                    
                    <div className="px-3 pt-2 pb-1 text-sm font-semibold text-gray-400">Set Color</div>
                    <div className="grid grid-cols-6 gap-2 px-3 pb-2">
                        {TRACK_COLORS.map(color => (
                            <button key={color} onClick={() => handleSetColor(color)} className="w-full h-8 rounded border-2 border-transparent hover:border-white transition-all" style={{ backgroundColor: color }}></button>
                        ))}
                    </div>

                    <div className="h-px bg-black/30 my-1"></div>
                    <button onClick={handleDelete} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded text-sm font-semibold transition-colors"><Trash2 size={16}/> Delete Track</button>
                </div>
            </div>
        </div>
    );
};

export default TrackMenuModal;
