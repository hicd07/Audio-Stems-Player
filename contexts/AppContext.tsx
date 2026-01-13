import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { TrackData, TransportState, AudioDeviceInfo, MidiDeviceInfo, MidiMapping, MidiMappingTarget, EffectType, MetronomeSound } from '../types';
import JSZip from 'jszip';
import { audioEngine } from '../services/audioEngine';

// --- STATE ---
export interface AppState {
    tracks: TrackData[];
    selectedTrackId: number | null;
    transport: TransportState;
    viewMode: 'PLAYLIST' | 'MIXER';
    projectName: string;
    isLoading: boolean;
    // Modals
    showSettings: boolean;
    isMetronomeModalOpen: boolean;
    // Devices
    inputDevices: AudioDeviceInfo[];
    outputDevices: AudioDeviceInfo[];
    enabledAudioInputDevices: Set<string>;
    enabledAudioOutputDevices: Set<string>;
    masterOutputId: string;
    // Master/Metronome
    masterVolume: number;
    metronomeVolume: number;
    metronomePan: number;
    metronomeSound: MetronomeSound;
    metronomeOutputId: string;
    // MIDI
    midiInputs: MidiDeviceInfo[];
    enabledMidiDevices: Set<string>;
    isMidiLearn: boolean;
    midiMappings: MidiMapping;
    midiMappingTarget: MidiMappingTarget | null;
}

// --- INITIAL STATE ---
const createInitialTracks = (count = 8): TrackData[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      name: `Track ${i + 1}`,
      color: '#22d3ee',
      audioBuffer: null,
      isPlaying: false,
      isMuted: false,
      isSolo: false,
      volume: 0.8,
      pan: 0,
      effect: { type: EffectType.NONE, dryWet: 0, params: { param1: 0.5, param2: 0.5 }},
      inputDeviceId: '',
      outputDeviceId: '',
      trimStart: 0,
      trimEnd: 0,
      isClipping: false,
    }));
};

const initialTracks = createInitialTracks();
export const initialState: AppState = {
    tracks: initialTracks,
    selectedTrackId: initialTracks[0]?.id || null,
    transport: { isPlaying: false, bpm: 120, metronomeOn: false, isRecording: false, loop: false, currentTime: 0, duration: 32 },
    viewMode: 'PLAYLIST',
    projectName: 'New Project',
    isLoading: false,
    showSettings: false,
    isMetronomeModalOpen: false,
    inputDevices: [],
    outputDevices: [],
    enabledAudioInputDevices: new Set(),
    enabledAudioOutputDevices: new Set(),
    masterOutputId: '',
    masterVolume: 0.8,
    metronomeVolume: 0.5,
    metronomePan: 0,
    metronomeSound: 'classic',
    metronomeOutputId: '',
    midiInputs: [],
    enabledMidiDevices: new Set(),
    isMidiLearn: false,
    midiMappings: {},
    midiMappingTarget: null,
};


// --- ACTIONS ---
type Action =
  | { type: 'SET_TRACKS'; payload: TrackData[] }
  | { type: 'ADD_TRACK' }
  | { type: 'REMOVE_TRACK'; payload: number }
  | { type: 'UPDATE_TRACK'; payload: { id: number; updates: Partial<TrackData> } }
  | { type: 'LOAD_AUDIO_TO_TRACK'; payload: { id: number; buffer: AudioBuffer; fileName: string } }
  | { type: 'SET_SELECTED_TRACK'; payload: number | null }
  | { type: 'TOGGLE_MUTE'; payload: number }
  | { type: 'TOGGLE_SOLO'; payload: number }
  | { type: 'SET_CLIPPING'; payload: { trackId: number; isClipping: boolean } }
  | { type: 'SET_TRANSPORT'; payload: Partial<TransportState> }
  | { type: 'SET_VIEW_MODE'; payload: 'PLAYLIST' | 'MIXER' }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'LOAD_PROJECT'; payload: File }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_METRONOME_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_AUDIO_DEVICES'; payload: { inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] } }
  | { type: 'TOGGLE_AUDIO_DEVICE'; payload: { deviceId: string; kind: 'audioinput' | 'audiooutput' } }
  | { type: 'REFRESH_AUDIO_DEVICES' }
  | { type: 'SET_MASTER_OUTPUT'; payload: string }
  | { type: 'SET_MASTER_VOLUME'; payload: number }
  | { type: 'SET_METRONOME_VOLUME'; payload: number }
  | { type: 'SET_METRONOME_PAN'; payload: number }
  | { type: 'SET_METRONOME_SOUND'; payload: MetronomeSound }
  | { type: 'SET_METRONOME_OUTPUT'; payload: string }
  | { type: 'SET_MIDI_DEVICES'; payload: MidiDeviceInfo[] }
  | { type: 'TOGGLE_MIDI_DEVICE'; payload: string }
  | { type: 'REFRESH_MIDI_DEVICES' }
  | { type: 'TOGGLE_MIDI_LEARN' }
  | { type: 'SET_MIDI_MAPPING'; payload: { midiId: string, target: MidiMappingTarget } }
  | { type: 'SET_MIDI_MAPPING_TARGET'; payload: MidiMappingTarget | null }
  | { type: 'RESET_STATE'; payload: AppState };

// --- REDUCER ---
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_TRACKS': return { ...state, tracks: action.payload };
    case 'ADD_TRACK':
        const newTrack: TrackData = { id: Date.now(), name: `Track ${state.tracks.length + 1}`, color: '#22d3ee', audioBuffer: null, isPlaying: false, isMuted: false, isSolo: false, volume: 0.8, pan: 0, effect: { type: EffectType.NONE, dryWet: 0, params: { param1: 0.5, param2: 0.5 }}, trimStart: 0, trimEnd: 0, isClipping: false };
        return { ...state, tracks: [...state.tracks, newTrack] };
    case 'REMOVE_TRACK': return { ...state, tracks: state.tracks.filter(t => t.id !== action.payload) };
    case 'UPDATE_TRACK':
        return { ...state, tracks: state.tracks.map(t => t.id === action.payload.id ? { ...t, ...action.payload.updates } : t) };
    case 'LOAD_AUDIO_TO_TRACK':
        const newTracks = state.tracks.map(t => t.id === action.payload.id ? { ...t, audioBuffer: action.payload.buffer, name: action.payload.fileName.replace(/\.[^/.]+$/, "").substring(0, 20), trimStart: 0, trimEnd: action.payload.buffer.duration } : t);
        const maxDuration = newTracks.reduce((max, track) => (track.audioBuffer ? Math.max(max, track.audioBuffer.duration) : max), state.transport.duration);
        return { ...state, tracks: newTracks, transport: { ...state.transport, duration: Math.max(state.transport.duration, Math.ceil(maxDuration)) } };
    case 'SET_SELECTED_TRACK': return { ...state, selectedTrackId: action.payload };
    case 'TOGGLE_MUTE': return { ...state, tracks: state.tracks.map(t => t.id === action.payload ? { ...t, isMuted: !t.isMuted } : t) };
    case 'TOGGLE_SOLO': return { ...state, tracks: state.tracks.map(t => t.id === action.payload ? { ...t, isSolo: !t.isSolo } : t) };
    case 'SET_CLIPPING': return { ...state, tracks: state.tracks.map(t => t.id === action.payload.trackId ? { ...t, isClipping: action.payload.isClipping } : t) };
    
    case 'SET_TRANSPORT': return { ...state, transport: { ...state.transport, ...action.payload } };
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload };
    case 'SET_IS_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_PROJECT_NAME': return { ...state, projectName: action.payload };
    case 'LOAD_PROJECT': // This is a command action, handled by middleware/hook
        return state;
    case 'RESET_STATE': return { ...action.payload };

    case 'SET_SHOW_SETTINGS': return { ...state, showSettings: action.payload };
    case 'SET_METRONOME_MODAL_OPEN': return { ...state, isMetronomeModalOpen: action.payload };
    
    case 'SET_AUDIO_DEVICES': return { ...state, inputDevices: action.payload.inputs, outputDevices: action.payload.outputs };
    case 'TOGGLE_AUDIO_DEVICE':
        const { deviceId, kind } = action.payload;
        const set = kind === 'audioinput' ? state.enabledAudioInputDevices : state.enabledAudioOutputDevices;
        const newSet = new Set(set);
        if (newSet.has(deviceId)) newSet.delete(deviceId); else newSet.add(deviceId);
        return kind === 'audioinput' ? { ...state, enabledAudioInputDevices: newSet } : { ...state, enabledAudioOutputDevices: newSet };
    case 'REFRESH_AUDIO_DEVICES': // Command action
        return state;
    case 'SET_MASTER_OUTPUT': return { ...state, masterOutputId: action.payload };
    
    case 'SET_MASTER_VOLUME': return { ...state, masterVolume: action.payload };
    case 'SET_METRONOME_VOLUME': return { ...state, metronomeVolume: action.payload };
    case 'SET_METRONOME_PAN': return { ...state, metronomePan: action.payload };
    case 'SET_METRONOME_SOUND': return { ...state, metronomeSound: action.payload };
    case 'SET_METRONOME_OUTPUT': return { ...state, metronomeOutputId: action.payload };

    case 'SET_MIDI_DEVICES': return { ...state, midiInputs: action.payload };
    case 'TOGGLE_MIDI_DEVICE':
        const newMidiSet = new Set(state.enabledMidiDevices);
        if (newMidiSet.has(action.payload)) newMidiSet.delete(action.payload); else newMidiSet.add(action.payload);
        return { ...state, enabledMidiDevices: newMidiSet };
    case 'REFRESH_MIDI_DEVICES': // Command action
        return state;
    case 'TOGGLE_MIDI_LEARN': return { ...state, isMidiLearn: !state.isMidiLearn, midiMappingTarget: null };
    case 'SET_MIDI_MAPPING':
        return { ...state, midiMappings: { ...state.midiMappings, [action.payload.midiId]: action.payload.target }, isMidiLearn: false, midiMappingTarget: null };
    case 'SET_MIDI_MAPPING_TARGET': return { ...state, midiMappingTarget: action.payload };
    
    default: return state;
  }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
    state: initialState,
    dispatch: () => null,
});

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    const asyncDispatch = async (action: Action) => {
        if (action.type === 'LOAD_PROJECT') {
            dispatch({ type: 'SET_IS_LOADING', payload: true });
            audioEngine.stopAll();
            audioEngine.reset();
            try {
                const zip = await JSZip.loadAsync(action.payload);
                const projectFile = zip.file("project.json");
                if (!projectFile) throw new Error("Invalid Project File");

                const projectData = JSON.parse(await projectFile.async("string"));
                const loadedTracks = [];
                for (const trackData of projectData.tracks) {
                    const audioFile = zip.file(`audio/${trackData.id}.wav`);
                    let audioBuffer = null;
                    if (audioFile) {
                        const buffer = await audioFile.async("arraybuffer");
                        audioBuffer = await audioEngine.decodeAudioData(buffer);
                    }
                    loadedTracks.push({ ...trackData, audioBuffer, isClipping: false });
                }

                // Create a full state object to reset to
                const newState: AppState = {
                    ...initialState, // Start with defaults
                    ...projectData, // Overwrite with project data
                    tracks: loadedTracks, // Use the processed tracks
                    isLoading: false, // Ensure loading is false
                };
                dispatch({ type: 'RESET_STATE', payload: newState });

            } catch (e) {
                console.error("Failed to load project:", e);
                alert("Failed to load project file.");
            } finally {
                dispatch({ type: 'SET_IS_LOADING', payload: false });
            }
        } else {
            dispatch(action);
        }
    };
    
    return <AppContext.Provider value={{ state, dispatch: asyncDispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
