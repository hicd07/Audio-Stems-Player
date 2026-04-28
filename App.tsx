import React from 'react';
import { Play, Square, Pause, Repeat, Settings, Keyboard, Triangle, HardDriveUpload, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import PlaylistView from './components/PlaylistView';
import MixerStrip from './components/MixerStrip';
import SettingsModal from './components/Settings';
import SpecialMixerStrip from './components/SpecialMixerStrip';
import MetronomeSettingsModal from './components/MetronomeSettingsModal';
import { AppProvider, useAppContext } from './contexts/AppContext';
import useAudioEngine from './hooks/useAudioEngine';
import useTransport from './hooks/useTransport';

const AppContent: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { transport, tracks, viewMode, isLoading, isMidiLearn, showSettings, isMetronomeModalOpen, metronomeVolume, metronomePan, metronomeOutputId, masterVolume, isPlaylistPanelVisible } = state;

    useAudioEngine();
    const { handlePlayPause, stopAll } = useTransport();

    const metronomePressTimer = React.useRef<number | null>(null);

    const handleMetronomeMouseDown = () => {
        metronomePressTimer.current = window.setTimeout(() => {
            dispatch({ type: 'SET_METRONOME_MODAL_OPEN', payload: true });
            metronomePressTimer.current = null;
        }, 500);
    };

    const handleMetronomeMouseUp = () => {
        if (metronomePressTimer.current) {
            clearTimeout(metronomePressTimer.current);
            metronomePressTimer.current = null;
            dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, metronomeOn: !transport.metronomeOn } });
        }
    };
    
    const handleMetronomeMouseLeave = () => {
        if (metronomePressTimer.current) {
            clearTimeout(metronomePressTimer.current);
            metronomePressTimer.current = null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#313D42] text-gray-200 select-none overflow-hidden">
            {/* Header / Transport */}
            <header className="flex-none p-block-2 p-inline-4 bg-gradient-to-b from-[#313D42] to-[#2B3539] border-b border-black/30 shadow-lg z-20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Primary Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={handlePlayPause} className={`btn ${transport.isPlaying ? 'text-green-400' : 'text-gray-300'}`}>
                            {transport.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>
                        <button onClick={stopAll} className="btn text-gray-300">
                            <Square size={24} fill="currentColor" />
                        </button>
                        <button 
                            onClick={() => dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, loop: !transport.loop } })} 
                            className={`btn ${transport.loop ? 'text-cyan-400' : 'text-gray-300'}`}
                        >
                            <Repeat size={18} />
                        </button>
                        <button 
                            onClick={() => dispatch({ type: 'TOGGLE_MIDI_LEARN' })} 
                            className={`btn ${isMidiLearn ? 'text-yellow-400 animate-pulse' : 'text-gray-300'}`}
                        >
                            <Keyboard size={18} />
                        </button>
                    </div>

                    {/* Tempo & Metronome */}
                    <div className="flex items-center bg-[#252E32] p-1 rounded-lg border border-black/30 shadow-inner">
                        <input 
                            type="number" 
                            step="0.01" 
                            value={transport.bpm} 
                            onChange={(e) => dispatch({ type: 'SET_TRANSPORT', payload: { ...transport, bpm: parseFloat(e.target.value) || 120 } })} 
                            className="w-[8ch] bg-transparent text-center text-xl sm:text-2xl font-mono font-bold focus:outline-none text-cyan-400" 
                        />
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mr-2">BPM</span>
                        <div className="w-px h-6 bg-black/30 mr-1"></div>
                        <button 
                            onMouseDown={handleMetronomeMouseDown} 
                            onMouseUp={handleMetronomeMouseUp} 
                            onMouseLeave={handleMetronomeMouseLeave} 
                            className={`p-2 rounded-md transition-all ${transport.metronomeOn ? 'text-cyan-400 bg-cyan-900/40 shadow-inner' : 'text-gray-500 hover:bg-black/20'}`}
                        >
                            <Triangle size={18} fill={transport.metronomeOn ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {/* View Switching & Global Settings */}
                    <div className="flex items-center gap-3">
                        <div className="flex bg-black/30 p-1 rounded-lg">
                            <button 
                                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'PLAYLIST' })} 
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'PLAYLIST' ? 'bg-[#4A585D] text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                Playlist
                            </button>
                            <button 
                                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'MIXER' })} 
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'MIXER' ? 'bg-[#4A585D] text-white shadow-lg' : 'text-gray-400'}`}
                            >
                                Mixer
                            </button>
                        </div>
                        {viewMode === 'PLAYLIST' && (
                            <button 
                                onClick={() => dispatch({ type: 'SET_PLAYLIST_PANEL_VISIBLE', payload: !isPlaylistPanelVisible })} 
                                className="btn text-gray-400 hover:text-white"
                            >
                                {isPlaylistPanelVisible ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                            </button>
                        )}
                        <button onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })} className="btn text-gray-400 hover:text-white">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden bg-[#2B3539]">
                {viewMode === 'PLAYLIST' && <PlaylistView />}
                {viewMode === 'MIXER' && (
                    <div className="h-full overflow-x-auto overflow-y-hidden p-inline-4 p-block-4 scroll-smooth">
                        <div className="flex h-full min-w-max gap-4 items-start">
                            {/* Dynamic Track Grid */}
                            <div className="flex h-full gap-2 mixer-grid">
                                {tracks.map((track, index) => <MixerStrip key={track.id} track={track} channelNumber={index + 1} />)}
                            </div>
                            
                            {/* Fixed Bus Controls */}
                            <div className="flex h-full gap-2 border-l border-black/30 p-inline-start-4">
                                <SpecialMixerStrip 
                                    name="Metronome" 
                                    volume={metronomeVolume} 
                                    onVolumeChange={vol => dispatch({ type: 'SET_METRONOME_VOLUME', payload: vol })} 
                                    pan={metronomePan} 
                                    onPanChange={pan => dispatch({ type: 'SET_METRONOME_PAN', payload: pan })} 
                                    color="#26C6DA" 
                                    outputId={metronomeOutputId} 
                                    onOutputChange={id => dispatch({ type: 'SET_METRONOME_OUTPUT', payload: id })} 
                                    isMetronome={true} 
                                />
                                <SpecialMixerStrip 
                                    name="Master" 
                                    volume={masterVolume} 
                                    onVolumeChange={vol => dispatch({ type: 'SET_MASTER_VOLUME', payload: vol })} 
                                    color="#90A4AE" 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showSettings && <SettingsModal />}
            {isMetronomeModalOpen && <MetronomeSettingsModal />}

            {isLoading && (
              <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] gap-4 backdrop-blur-sm">
                <HardDriveUpload size={48} className="text-cyan-400 animate-bounce" />
                <div className="text-white text-lg font-bold tracking-widest uppercase animate-pulse">Loading Project</div>
              </div>
            )}
        </div>
    );
};

const App: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;