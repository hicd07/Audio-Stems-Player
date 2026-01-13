export enum EffectType {
  NONE = 'None',
  REVERB = 'Reverb',
  FILTER = 'Low-Pass',
  DELAY = 'Delay',
  FLANGER = 'Flanger',
  CHORUS = 'Chorus',
}

export interface EffectConfig {
  type: EffectType;
  dryWet: number; // 0 to 1
  params: {
    param1: number; // Generic param 1 (e.g., Room Size, Cutoff, Time)
    param2: number; // Generic param 2 (e.g., Decay, Res, Feedback)
    param3?: number; // Generic param 3 (e.g., Rate)
  };
}

export interface TrackData {
  id: number;
  name: string;
  color: string;
  icon?: string;
  audioBuffer: AudioBuffer | null;
  isMuted: boolean;
  isSolo: boolean;
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  effect: EffectConfig;
  inputDeviceId?: string; // ID of the input device for recording to this track
  outputDeviceId?: string; // ID of the output device (hardware routing)
  isClipping: boolean;

  // Editing
  trimStart: number; // seconds
  trimEnd: number; // seconds
}

export interface TransportState {
  isPlaying: boolean;
  bpm: number;
  metronomeOn: boolean;
  isRecording: boolean;
  loop: boolean;
  currentTime: number;
  duration: number;
}

export type MappingType = 'MASTER_VOL' | 'METRO_VOL';

export interface MappingTarget {
  padId: number; // Kept for type compatibility, -1 for global
  type: MappingType;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export type MidiControl = 'volume' | 'pan' | 'mute' | 'solo' | 'dryWet';

export interface MidiMapping {
    [midiId: string]: { // e.g., "cc-7-ch-1"
        trackId: number;
        control: MidiControl;
    }
}

export interface MidiMappingTarget {
    trackId: number;
    control: MidiControl;
}

export type MetronomeSound = 'classic' | 'beep' | 'woodblock' | 'cowbell';

export const METRONOME_SOUNDS: { id: MetronomeSound; name: string }[] = [
    { id: 'classic', name: 'Classic Click' },
    { id: 'beep', name: 'Beep' },
    { id: 'woodblock', name: 'Woodblock' },
    { id: 'cowbell', name: 'Cowbell' },
];

// Curated color palette for tracks
export const TRACK_COLORS = [
    '#78909C', // Blue Grey (Default)
    '#EF5350', // Red
    '#EC407A', // Pink
    '#AB47BC', // Purple
    '#5C6BC0', // Indigo
    '#42A5F5', // Blue
    '#26C6DA', // Cyan
    '#26A69A', // Teal
    '#66BB6A', // Green
    '#FFEE58', // Yellow
    '#FFA726', // Orange
];