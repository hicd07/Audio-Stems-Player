import React from 'react';
import { X, Mic, Piano, Drum, Disc3, CircleDot, Music3, AudioWaveform } from 'lucide-react';

const TRACK_ICONS: { [key: string]: React.FC<any> } = {
    'mic': Mic,
    'piano': Piano,
    'drum': Drum,
    'cymbals': Disc3,
    'kick': CircleDot,
    'melody': Music3,
    'sample': AudioWaveform,
};

interface IconSelectionModalProps {
    onClose: () => void;
    onSelectIcon: (iconKey: string | null) => void;
}

const IconSelectionModal: React.FC<IconSelectionModalProps> = ({ onClose, onSelectIcon }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-200 opacity-100" onClick={onClose}>
            <div className="bg-[#2B3539] border border-black/30 rounded-lg shadow-2xl w-full max-w-sm transition-all duration-200 opacity-100 scale-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 border-b border-black/30 bg-[#37474F] rounded-t-lg">
                    <h2 className="text-lg font-bold text-gray-200">Select Track Icon</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-black/20">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                         {Object.entries(TRACK_ICONS).map(([key, IconComponent]) => (
                            <button key={key} onClick={() => onSelectIcon(key)} className="p-4 text-gray-300 bg-[#37474F] hover:bg-[#455A64] hover:text-white rounded-lg transition-colors flex justify-center items-center aspect-square">
                                <IconComponent size={24} />
                            </button>
                        ))}
                         <button onClick={() => onSelectIcon(null)} className="p-4 text-red-400 bg-red-900/30 hover:bg-red-500/30 hover:text-red-300 rounded-lg transition-colors flex justify-center items-center aspect-square">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IconSelectionModal;
