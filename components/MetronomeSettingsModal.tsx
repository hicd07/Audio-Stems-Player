import React, { useEffect, useState } from 'react';
import { X, Music4 } from 'lucide-react';
import { METRONOME_SOUNDS, MetronomeSound } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { audioEngine } from '../services/audioEngine';

const MetronomeSettingsModal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { metronomeSound } = state;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const onClose = () => {
        setIsVisible(false);
        setTimeout(() => dispatch({ type: 'SET_METRONOME_MODAL_OPEN', payload: false }), 200);
    };

    const onSoundChange = (sound: MetronomeSound) => {
        dispatch({ type: 'SET_METRONOME_SOUND', payload: sound });
        audioEngine.playMetronomePreview(sound);
    };

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-[#2B3539] border border-black/30 rounded-lg shadow-2xl w-full max-w-sm transition-all duration-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 border-b border-black/30 bg-[#37474F] rounded-t-lg">
                    <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                        <Music4 size={20} />
                        Metronome Sound
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-black/20">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-2">
                    {METRONOME_SOUNDS.map(sound => (
                        <button
                            key={sound.id}
                            onClick={() => onSoundChange(sound.id)}
                            className={`w-full text-left p-3 rounded-md transition-colors text-gray-200 ${
                                metronomeSound === sound.id
                                    ? 'bg-cyan-600 font-bold'
                                    : 'bg-[#37474F] hover:bg-[#455A64]'
                            }`}
                        >
                            {sound.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MetronomeSettingsModal;
