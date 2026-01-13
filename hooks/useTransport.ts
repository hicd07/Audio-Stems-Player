import { useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { audioEngine } from '../services/audioEngine';

const useTransport = () => {
    const { state, dispatch } = useAppContext();
    const { transport, tracks } = state;

    const animationFrameRef = useRef<number | null>(null);
    const playbackStartTimeRef = useRef<number>(0);
    const seekOffsetRef = useRef<number>(0);

    const stopAll = useCallback(() => {
        audioEngine.stopAll();
        dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, currentTime: 0 } });
        seekOffsetRef.current = 0;
    }, [dispatch]);

    const handlePlayPause = useCallback(() => {
        if (transport.isPlaying) {
            seekOffsetRef.current = transport.currentTime;
            dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false } });
            audioEngine.stopAll(false);
        } else {
            playbackStartTimeRef.current = audioEngine.ctx.currentTime;
            dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: true } });
            const onTrackEnd = (id: number) => { /* Can dispatch actions here if needed */ };
            audioEngine.startPlayback(tracks, onTrackEnd, transport.loop, seekOffsetRef.current);
        }
    }, [transport.isPlaying, transport.currentTime, transport.loop, tracks, dispatch]);

    useEffect(() => {
        const updatePlaybackTime = () => {
            if (!transport.isPlaying) return;

            const elapsedTime = audioEngine.ctx.currentTime - playbackStartTimeRef.current;
            let newTime = seekOffsetRef.current + elapsedTime;
            
            if (transport.loop && transport.duration > 0) {
                newTime %= transport.duration;
            }

            if (newTime >= transport.duration && !transport.loop) {
                stopAll();
            } else {
                dispatch({ type: 'SET_TRANSPORT', payload: { currentTime: newTime } });
                animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
            }
        };

        if (transport.isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
        } else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [transport.isPlaying, transport.duration, transport.loop, stopAll, dispatch]);

    return { handlePlayPause, stopAll };
};

export default useTransport;
