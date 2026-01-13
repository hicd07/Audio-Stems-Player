import React from 'react';
import { Play, Square, Pause, Repeat, PlusCircle, Settings, Keyboard, Triangle } from 'lucide-react';
import PlaylistView from './components/PlaylistView';
import MixerStrip from './components/MixerStrip';
import SettingsModal from './components/Settings';
import SpecialMixerStrip from './components/SpecialMixerStrip';
import MetronomeSettingsModal from './components/MetronomeSettingsModal';
import { AppProvider, useAppContext } from './contexts/AppContext';
import useAudioEngine from './hooks/useAudioEngine';
import useMidi from './hooks/useMidi';
import useTransport from './hooks/useTransport';

const AppContent: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { transport, tracks, viewMode, isLoading, isMidiLearn, selectedTrackId, showSettings, isMetronomeModalOpen, metronomeVolume, metronomePan, metronomeOutputId, masterVolume } = state;

    // Custom hooks manage all side-effects and interactions
    useAudioEngine();
    useMidi();
    const { handlePlayPause, stopAll } = useTransport();

    const metronomePressTimer = React.useRef<number | null>(null);

    const handleMetronomeMouseDown = () => {
        metronomePressTimer.current = window.setTimeout(() => {
            dispatch({ type: 'SET_METRONOME_MODAL_OPEN', payload: true });
            metronomePressTimer.current = null;
        }, 3000);
    };

    const handleMetronomeMouseUp = () => {
        if (metronomePressTimer.current) {
            clearTimeout(metronomePressTimer.current);
            dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, metronomeOn: !transport.metronomeOn } });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#313D42] text-gray-200 font-sans text-xs select-none overflow-hidden">
            <div className="h-20 border-b border-black/20 bg-[#2B3539] flex flex-col justify-center px-4 shadow-md z-20 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button onClick={handlePlayPause} className={`p-2 rounded-full ${transport.isPlaying ? 'text-green-400' : 'text-gray-400'}`}>{transport.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                        <button onClick={stopAll} className="p-2 rounded-full text-gray-400"><Square size={24} fill="currentColor" /></button>
                        <button onClick={() => dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, loop: !transport.loop } })} title="Toggle Loop" className={`p-2 rounded-full ${transport.loop ? 'text-cyan-400' : 'text-gray-400'}`}><Repeat size={18} /></button>
                        <button onClick={() => dispatch({ type: 'TOGGLE_MIDI_LEARN' })} title="MIDI Learn" className={`p-2 rounded-full ${isMidiLearn ? 'text-yellow-400 animate-pulse' : 'text-gray-400'}`}><Keyboard size={18} /></button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-[#252E32] p-1 rounded-md border border-black/20">
                            <input type="number" value={transport.bpm} onChange={(e) => dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, bpm: parseInt(e.target.value) || 120 } })} className="w-16 bg-transparent text-center text-lg focus:outline-none" />
                            <span className="text-gray-400 text-sm font-bold pr-1">BPM</span>
                            <div className="w-px h-5 bg-black/30"></div>
                            <button onMouseDown={handleMetronomeMouseDown} onMouseUp={handleMetronomeMouseUp} onMouseLeave={handleMetronomeMouseUp} title="Toggle Metronome (Hold for 3s to change sound)" className={`p-1.5 rounded-md transition-colors ${transport.metronomeOn ? 'text-cyan-400 bg-cyan-900/50' : 'text-gray-400 hover:bg-black/20'}`}>
                                <Triangle size={18} fill={transport.metronomeOn ? 'currentColor' : 'none'} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-black/20 rounded-lg p-1">
                            <button onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'PLAYLIST' })} className={`px-3 py-1 rounded ${viewMode === 'PLAYLIST' ? 'bg-[#4A585D] text-white' : 'text-gray-400'}`}>Playlist</button>
                            <button onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'MIXER' })} className={`px-3 py-1 rounded ${viewMode === 'MIXER' ? 'bg-[#4A585D] text-white' : 'text-gray-400'}`}>Mixer</button>
                        </div>
                        <button onClick={() => dispatch({ type: 'ADD_TRACK' })} title="Add New Track" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-black/20"><PlusCircle size={20} /></button>
                        <button onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })} title="Settings" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-black/20"><Settings size={20} /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                {viewMode === 'PLAYLIST' && <PlaylistView />}
                {viewMode === 'MIXER' && (
                    <div className="flex-1 p-4 overflow-x-auto flex space-x-2 items-center bg-[#2B3539]">
                        {tracks.map((track, index) => <MixerStrip key={track.id} track={track} channelNumber={index + 1} />)}
                        <SpecialMixerStrip name="Metronome" volume={metronomeVolume} onVolumeChange={vol => dispatch({ type: 'SET_METRONOME_VOLUME', payload: vol })} pan={metronomePan} onPanChange={pan => dispatch({ type: 'SET_METRONOME_PAN', payload: pan })} color="#67e8f9" outputId={metronomeOutputId} onOutputChange={id => dispatch({ type: 'SET_METRONOME_OUTPUT', payload: id })} isMetronome={true} />
                        <SpecialMixerStrip name="Master" volume={masterVolume} onVolumeChange={vol => dispatch({ type: 'SET_MASTER_VOLUME', payload: vol })} color="#9ca3af" />
                    </div>
                )}
            </div>

            {showSettings && <SettingsModal />}
            {isMetronomeModalOpen && <MetronomeSettingsModal />}

            {isLoading && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"><div className="text-white text-lg animate-pulse">Loading Project...</div></div>}
        </div>
    );
};

const App: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;
