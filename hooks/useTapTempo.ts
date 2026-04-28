"use client";

import { useState, useCallback, useRef } from 'react';

export const useTapTempo = (onTempoChange: (bpm: number) => void) => {
    const tapTimes = useRef<number[]>([]);
    
    const tap = useCallback(() => {
        const now = performance.now();
        
        // Si la última pulsación fue hace más de 2 segundos, reiniciamos el conteo
        if (tapTimes.current.length > 0 && now - tapTimes.current[tapTimes.current.length - 1] > 2000) {
            tapTimes.current = [];
        }
        
        tapTimes.current.push(now);
        
        // Necesitamos al menos 2 pulsaciones para calcular el tempo
        if (tapTimes.current.length > 1) {
            // Mantener solo las últimas 8 pulsaciones para el promedio
            if (tapTimes.current.length > 8) {
                tapTimes.current.shift();
            }
            
            const intervals = [];
            for (let i = 1; i < tapTimes.current.length; i++) {
                intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
            }
            
            const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;
            const bpm = 60000 / averageInterval;
            
            // Redondear a 2 decimales para precisión pero legibilidad
            onTempoChange(Math.round(bpm * 100) / 100);
        }
    }, [onTempoChange]);

    return { tap };
};