import React, { useState, useRef } from 'react';
import { Save, FolderOpen, RefreshCw, Radio, X } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import JSZip from 'jszip';
import { audioEngine } from '../services/audioEngine';

const SettingsModal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const {
        projectName,
        midiInputs, enabledMidiDevices,
        inputDevices, outputDevices,
        enabledAudioInputDevices, enabledAudioOutputDevices,
        masterOutputId,
    } = state;

    const [activeTab, setActiveTab] = useState<'PROJECT' | 'MIDI' | 'AUDIO'>('PROJECT');
    const loadProjectInputRef = useRef<HTMLInputElement>(null);

    const onClose = () => dispatch({ type: 'SET_SHOW_SETTINGS', payload: false });

    const handleSaveProject = async () => {
        const zip = new JSZip();
        const tracksToSave = state.tracks.map(t => ({ ...t, audioBuffer: undefined, isClipping: undefined }));
        const projectData = {
            projectName: state.projectName,
            tracks: tracksToSave,
            transport: state.transport,
            midiMappings: state.midiMappings
        };
        zip.file("project.json", JSON.stringify(projectData));

        for (const track of state.tracks) {
            if (track.audioBuffer) {
                const wavBlob = audioEngine.bufferToWav(track.audioBuffer);
                zip.file(`audio/${track.id}.wav`, wavBlob);
            }
        }
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${state.projectName.replace(/ /g, '_')}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleLoadProject = async (file: File) => {
        dispatch({ type: 'LOAD_PROJECT', payload: file });
        onClose();
    };

    const TabButton: React.FC<{ tabId: any, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-[#37474F] text-white' : 'bg-[#2B3539] text-gray-400 hover:bg-[#313D42]'}`}
        >
            {label}
        </button>
    );

    const enabledOutputDevicesList = outputDevices.filter(d => enabledAudioOutputDevices.has(d.deviceId));

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#2B3539] border border-black/30 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-2 border-b border-black/30 bg-[#37474F] rounded-t-lg">
                    <h2 className="text-lg font-bold text-gray-200 ml-2">Settings</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-black/20">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex border-b border-black/30 px-2 pt-2">
                    <TabButton tabId="PROJECT" label="Project" />
                    <TabButton tabId="MIDI" label="MIDI" />
                    <TabButton tabId="AUDIO" label="Audio" />
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {activeTab === 'PROJECT' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-300">Project Management</h3>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Project Name</label>
                                <input 
                                    type="text"
                                    value={projectName}
                                    onChange={e => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
                                    className="w-full bg-[#252E32] text-gray-200 p-2 rounded border border-black/30 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={handleSaveProject} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors">
                                    <Save size={16} /> Save Project
                                </button>
                                <button onClick={() => loadProjectInputRef.current?.click()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors">
                                    <FolderOpen size={16} /> Load Project
                                </button>
                                <input type="file" ref={loadProjectInputRef} className="hidden" accept=".zip" onChange={e => { if(e.target.files?.[0]) handleLoadProject(e.target.files[0])}}/>
                            </div>
                        </div>
                    )}
                    {activeTab === 'MIDI' && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-300">MIDI Input Devices</h3>
                                <button onClick={() => dispatch({ type: 'REFRESH_MIDI_DEVICES' })} className="flex items-center gap-2 text-xs bg-black/20 hover:bg-black/30 text-gray-300 py-1 px-3 rounded transition-colors">
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {midiInputs.length > 0 ? midiInputs.map(device => (
                                    <li key={device.id} className="flex items-center justify-between bg-[#37474F] p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <Radio size={16} className={enabledMidiDevices.has(device.id) ? 'text-cyan-400' : 'text-gray-600'}/>
                                            <div>
                                                <div className="font-bold text-gray-200">{device.name}</div>
                                                <div className="text-xs text-gray-400">{device.manufacturer}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => dispatch({ type: 'TOGGLE_MIDI_DEVICE', payload: device.id })} className={`px-3 py-1 rounded text-xs font-bold transition-all ${enabledMidiDevices.has(device.id) ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                                            {enabledMidiDevices.has(device.id) ? 'Disable' : 'Enable'}
                                        </button>
                                    </li>
                                )) : <p className="text-gray-500">No MIDI devices found.</p>}
                            </ul>
                        </div>
                    )}
                     {activeTab === 'AUDIO' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-300">Audio Devices</h3>
                                <button onClick={() => dispatch({ type: 'REFRESH_AUDIO_DEVICES' })} className="flex items-center gap-2 text-xs bg-black/20 hover:bg-black/30 text-gray-300 py-1 px-3 rounded transition-colors">
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-gray-400 text-sm mb-2">Input Devices</h4>
                                <ul className="space-y-2">
                                    {inputDevices.length > 0 ? inputDevices.map(device => (
                                        <li key={device.deviceId} className="flex items-center justify-between bg-[#37474F] p-2 rounded">
                                            <div className="flex items-center gap-2">
                                                <Radio size={16} className={enabledAudioInputDevices.has(device.deviceId) ? 'text-cyan-400' : 'text-gray-600'}/>
                                                <p className="text-gray-200 truncate">{device.label}</p>
                                            </div>
                                            <button onClick={() => dispatch({ type: 'TOGGLE_AUDIO_DEVICE', payload: { deviceId: device.deviceId, kind: 'audioinput' }})} className={`px-3 py-1 rounded text-xs font-bold transition-all ${enabledAudioInputDevices.has(device.deviceId) ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                                                {enabledAudioInputDevices.has(device.deviceId) ? 'Disable' : 'Enable'}
                                            </button>
                                        </li>
                                    )) : <p className="text-gray-500">No audio input devices found.</p>}
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-gray-400 text-sm mb-2">Output Devices</h4>
                                <ul className="space-y-2">
                                    {outputDevices.length > 0 ? outputDevices.map(device => (
                                        <li key={device.deviceId} className="flex items-center justify-between bg-[#37474F] p-2 rounded">
                                             <div className="flex items-center gap-2">
                                                <Radio size={16} className={enabledAudioOutputDevices.has(device.deviceId) ? 'text-cyan-400' : 'text-gray-600'}/>
                                                <p className="text-gray-200 truncate">{device.label}</p>
                                            </div>
                                            <button onClick={() => dispatch({ type: 'TOGGLE_AUDIO_DEVICE', payload: { deviceId: device.deviceId, kind: 'audiooutput' }})} className={`px-3 py-1 rounded text-xs font-bold transition-all ${enabledAudioOutputDevices.has(device.deviceId) ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                                                {enabledAudioOutputDevices.has(device.deviceId) ? 'Disable' : 'Enable'}
                                            </button>
                                        </li>
                                    )) : <p className="text-gray-500">No audio output devices found.</p>}
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1 font-semibold">Master Output</label>
                                <select 
                                    value={masterOutputId}
                                    onChange={e => dispatch({ type: 'SET_MASTER_OUTPUT', payload: e.target.value })}
                                    className="w-full bg-[#252E32] text-gray-200 p-2 rounded border border-black/30 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Default (Follow System)</option>
                                    {enabledOutputDevicesList.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
