import { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { audioEngine } from '../services/audioEngine';

const useAudioEngine = () => {
    const { state, dispatch } = useAppContext();
    const {
        tracks,
        masterVolume,
        metronomeVolume,
        metronomePan,
        metronomeSound,
        metronomeOutputId,
        masterOutputId,
        transport,
    } = state;

    const clipTimeouts = useRef<Map<number, number>>(new Map());

    // --- Clipping Handler ---
    const handleTrackClip = useCallback((trackId: number) => {
        if (clipTimeouts.current.has(trackId)) {
            clearTimeout(clipTimeouts.current.get(trackId));
        }
        dispatch({ type: 'SET_CLIPPING', payload: { trackId, isClipping: true } });

        const timeoutId = window.setTimeout(() => {
            dispatch({ type: 'SET_CLIPPING', payload: { trackId, isClipping: false } });
            clipTimeouts.current.delete(trackId);
        }, 1500);
        clipTimeouts.current.set(trackId, timeoutId);
    }, [dispatch]);

    // Initialize engine and callbacks on mount
    useEffect(() => {
        audioEngine.resume();
        audioEngine.setClipCallback(handleTrackClip);
        return () => {
            audioEngine.setClipCallback(null);
            clipTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
        };
    }, [handleTrackClip]);

    // --- Sync React State -> Audio Engine ---
    useEffect(() => { audioEngine.setMasterVolume(masterVolume); }, [masterVolume]);
    useEffect(() => { audioEngine.setMetronomeVolume(metronomeVolume); }, [metronomeVolume]);
    useEffect(() => { audioEngine.setMetronomePan(metronomePan); }, [metronomePan]);
    useEffect(() => { audioEngine.setMetronomeSound(metronomeSound); }, [metronomeSound]);
    useEffect(() => { audioEngine.setMetronomeOutputDevice(metronomeOutputId); }, [metronomeOutputId]);
    useEffect(() => { audioEngine.setMasterOutputDevice(masterOutputId); }, [masterOutputId]);
    
    // Sync individual track volumes/pans
    useEffect(() => {
        tracks.forEach(track => {
            audioEngine.setTrackVolume(track.id, track.volume);
            audioEngine.setTrackPan(track.id, track.pan);
        });
    }, [tracks]);

    // Metronome sync for global transport
    useEffect(() => {
        if (transport.isPlaying) {
            audioEngine.stopMetronome();
            if (transport.metronomeOn) {
                audioEngine.startMetronome(transport.bpm);
            }
        } else {
            audioEngine.stopMetronome();
        }
    }, [transport.isPlaying, transport.metronomeOn, transport.bpm]);
};

export default useAudioEngine;
