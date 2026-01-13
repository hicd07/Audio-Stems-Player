import { useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';

const useMidi = () => {
    const { state, dispatch } = useAppContext();
    const { enabledMidiDevices, isMidiLearn, midiMappingTarget, midiMappings } = state;

    const onMIDIMessage = useCallback((event: MIDIMessageEvent) => {
        if (!enabledMidiDevices.has((event.currentTarget as any).id)) return;
    
        const [command, note, velocity] = event.data;
        const isCC = (command & 0xF0) === 0xB0;
        const channel = command & 0x0F;

        if (isCC) {
            const midiId = `cc-${note}-ch-${channel}`;
            if (isMidiLearn && midiMappingTarget) {
                dispatch({ type: 'SET_MIDI_MAPPING', payload: { midiId, target: midiMappingTarget }});
                return;
            }
            
            const mapping = midiMappings[midiId];
            if (mapping) {
                const val = velocity / 127;
                switch(mapping.control) {
                    case 'volume': 
                        dispatch({ type: 'UPDATE_TRACK', payload: { id: mapping.trackId, updates: { volume: val } } });
                        break;
                    case 'pan':
                        dispatch({ type: 'UPDATE_TRACK', payload: { id: mapping.trackId, updates: { pan: (val * 2) - 1 } } });
                        break;
                    case 'dryWet': 
                        // Note: This requires effect state to be in context if we want to update it.
                        // For now, let's assume it is handled if the effect editor is open.
                        break;
                    case 'mute':
                        if (velocity > 0) dispatch({ type: 'TOGGLE_MUTE', payload: mapping.trackId });
                        break;
                    case 'solo': 
                        if (velocity > 0) dispatch({ type: 'TOGGLE_SOLO', payload: mapping.trackId });
                        break;
                }
            }
        }
      }, [enabledMidiDevices, isMidiLearn, midiMappingTarget, midiMappings, dispatch]);

    const refreshMidiDevices = useCallback(async () => {
        try {
            const access = await navigator.requestMIDIAccess();
            const inputs = [];
            access.inputs.forEach(input => {
                inputs.push({ id: input.id, name: input.name || 'Unknown Device', manufacturer: input.manufacturer || 'Unknown' });
                input.onmidimessage = onMIDIMessage;
            });
            dispatch({ type: 'SET_MIDI_DEVICES', payload: inputs });
        } catch (e) { console.error("Could not access MIDI devices.", e); }
    }, [onMIDIMessage, dispatch]);

    // Initial device scan and listener setup
    useEffect(() => {
        refreshMidiDevices();
    }, [refreshMidiDevices]);

    // Handle command actions from UI
    useEffect(() => {
        const unsubscribe = () => {
            // This is a placeholder for a more robust command handling system
            // if we were to move dispatch logic here. For now, commands are handled in context.
        };
        return unsubscribe;
    }, []);


};

export default useMidi;
