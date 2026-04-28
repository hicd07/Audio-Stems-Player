"use client";

import React from 'react';
import Knob from './Knob';
import VerticalFader from './VerticalFader';
import { TrackData } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface MixerStripProps {
  track: TrackData;
  channelNumber: number;
}

const panSnapPoints = [0, 0.25, 0.5, 0.75, 1];

const MixerStrip: React.FC<MixerStripProps> = ({ 
    track,
    channelNumber, 
}) => {
  const { state, dispatch } = useAppContext();
  const { outputDevices, enabledAudioOutputDevices, selectedTrackId, isMidiLearn, midiMappingTarget } = state;
  const isSelected = selectedTrackId === track.id;

  const handleSetMappingTarget = (control: 'volume' | 'pan') => {
    if (isMidiLearn) {
      dispatch({ type: 'SET_MIDI_MAPPING_TARGET', payload: { trackId: track.id, control } });
    }
  };
  
  const isTarget = (control: string) => midiMappingTarget?.trackId === track.id && midiMappingTarget?.control === control;

  const formatPan = (panVal: number) => {
    if (Math.abs(panVal) < 0.01) return "C";
    const percent = Math.round(Math.abs(panVal) * 100);
    return panVal < 0 ? `L${percent}` : `R${percent}`;
  };

  const enabledOutputDevices = React.useMemo(() => outputDevices.filter(d => enabledAudioOutputDevices.has(d.deviceId)), [outputDevices, enabledAudioOutputDevices]);

  return (
    <div 
      className={`flex flex-col items-center p-inline-2 p-block-3 rounded-xl border-2 transition-all duration-200 min-w-[100px] max-w-[140px] h-full shadow-lg ${isSelected ? 'bg-[#546E7A] border-cyan-400 -translate-y-1' : 'bg-[#37474F] border-transparent'}`}
      onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })}
    >
      {/* Track Header */}
      <div className="text-center w-full mb-3 flex-none">
        <div className="text-[10px] font-black text-gray-400 tracking-tighter uppercase mb-1">CH {channelNumber}</div>
        <div className="text-xs font-bold truncate p-inline-1 rounded" style={{ color: track.color, backgroundColor: 'rgba(0,0,0,0.2)' }}>
          {track.name}
        </div>
      </div>

      {/* Meter / Peak */}
      <div className={`w-3 h-3 rounded-full mb-4 flex-none shadow-inner transition-colors duration-75 ${track.isClipping ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-black/40'}`}></div>

      {/* Pan Knob */}
      <div 
          className={`relative group p-2 rounded-lg transition-all flex-none ${isMidiLearn ? 'cursor-help' : ''} ${isTarget('pan') ? 'outline outline-2 outline-yellow-400 animate-pulse' : 'hover:bg-black/10'}`}
          onMouseDown={(e) => { e.stopPropagation(); handleSetMappingTarget('pan'); }}
      >
          <Knob 
              value={(track.pan + 1) / 2}
              onChange={(val) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { pan: (val * 2) - 1 } } })}
              onDoubleClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { pan: 0 } } })}
              label="PAN"
              color="#FBC02D"
              size={48}
              snapPoints={panSnapPoints}
          />
          <div className="text-[9px] font-mono text-center text-gray-400 mt-1 font-bold">{formatPan(track.pan)}</div>
      </div>

      {/* Volume Fader Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-block-4 min-h-0 overflow-hidden">
        <div 
            className={`h-full max-h-[300px] flex items-center justify-center ${isMidiLearn ? 'cursor-help' : ''} ${isTarget('volume') ? 'outline outline-2 outline-yellow-400 animate-pulse rounded-lg' : ''}`}
            onMouseDown={(e) => {
                if (isMidiLearn) {
                    e.stopPropagation();
                    handleSetMappingTarget('volume');
                }
            }}
        >
            <VerticalFader 
                value={track.volume}
                onChange={(val) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { volume: val } } })}
                onDoubleClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { volume: 0.8 } } })}
                color={track.color}
                disabled={isMidiLearn}
            />
        </div>
        <div className="text-[10px] font-mono font-bold text-gray-300 mt-2 bg-black/30 p-inline-2 rounded shadow-inner flex-none">
            {Math.round(track.volume * 100)}%
        </div>
      </div>

      {/* Output Routing Select */}
      <div className="w-full p-inline-1 flex-none">
          <select 
              value={track.outputDeviceId || ''} 
              onChange={(e) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { outputDeviceId: e.target.value } } })} 
              className="w-full bg-[#2B3539] text-[9px] text-gray-300 rounded-md border border-black/30 focus:border-cyan-400 p-1 font-bold tracking-tight shadow-inner appearance-none text-center"
              onClick={(e) => e.stopPropagation()}
          >
              <option value="">MASTER</option>
              {enabledOutputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label.substring(0, 12)}</option>
              ))}
          </select>
      </div>
    </div>
  );
};

export default React.memo(MixerStrip);