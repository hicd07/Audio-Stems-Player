import React from 'react';
import Knob from './Knob';
import VerticalFader from './VerticalFader';
import { TrackData } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface MixerStripProps {
  track: TrackData;
  channelNumber: number;
}

const panSnapPoints = [0, 0.25, 0.5, 0.75, 1]; // 100L, 50L, C, 50R, 100R

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

  const panColor = "#fbbf24";
  
  const enabledOutputDevices = React.useMemo(() => outputDevices.filter(d => enabledAudioOutputDevices.has(d.deviceId)), [outputDevices, enabledAudioOutputDevices]);

  const handlePanChange = (val: number) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { pan: (val * 2) - 1 } } });
  const handleVolumeChange = (val: number) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { volume: val } } });
  const handleOutputChange = (deviceId: string) => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { outputDeviceId: deviceId } } });

  return (
    <div 
      className={`flex flex-col items-center p-2 rounded-lg border-2 min-w-[90px] h-full justify-between py-2 relative transition-all duration-200 ${isSelected ? 'bg-[#546E7A] scale-105' : 'bg-[#37474F] border-transparent'}`}
      style={{ borderColor: isSelected ? track.color : 'transparent' }}
      onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })}
    >
      <div className="text-center mb-1 w-full">
        <div className="text-xs font-bold text-gray-300 mb-1">CH {channelNumber}</div>
        <div className="text-[10px] font-bold truncate w-full px-1" style={{ color: track.color }}>{track.name}</div>
      </div>

      <div className={`h-2 w-2 mb-1 rounded-full transition-colors ${track.isClipping ? 'bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.7)]' : 'bg-black/30'}`}></div>

      <div className="flex justify-center items-start w-full my-3 h-[70px]">
        <div 
            className={`flex flex-col items-center p-1 rounded-md ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('pan') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse' : ''}`}
            onMouseDown={(e) => { e.stopPropagation(); handleSetMappingTarget('pan'); }}
        >
            <Knob 
                value={(track.pan + 1) / 2}
                onChange={handlePanChange}
                onDoubleClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, updates: { pan: 0 } } })}
                label="PAN"
                color={panColor}
                size={40}
                snapPoints={panSnapPoints}
            />
            <span className="text-[10px] font-mono text-gray-400 mt-1">{formatPan(track.pan)}</span>
        </div>
      </div>


      <div className="flex-1 w-full py-1 flex justify-center items-center">
        <div 
            className={`h-full ${isMidiLearn ? 'cursor-pointer' : ''} ${isTarget('volume') ? 'outline outline-2 outline-yellow-400 outline-offset-2 animate-pulse rounded-lg' : ''}`}
            onMouseDown={(e) => {
                if (isMidiLearn) {
                    e.stopPropagation();
                    handleSetMappingTarget('volume');
                }
            }}
        >
            <VerticalFader 
                value={track.volume}
                onChange={handleVolumeChange}
                onDoubleClick={() => handleVolumeChange(0.8)}
                color={track.color}
                disabled={isMidiLearn}
            />
        </div>
      </div>

      <div className="mt-1 text-xs font-mono text-gray-300 mb-2">{Math.round(track.volume * 100)}%</div>
      
      <div className="w-full">
          <select value={track.outputDeviceId || ''} onChange={(e) => handleOutputChange(e.target.value)} className="w-full bg-[#2B3539] text-[9px] text-gray-300 rounded border border-black/20 focus:border-cyan-400 p-1 truncate" onClick={(e) => e.stopPropagation()}>
              <option value="">Master</option>
              {enabledOutputDevices.map(d => (<option key={d.deviceId} value={d.deviceId}>{d.label.substring(0, 10)}...</option>))}
          </select>
      </div>
    </div>
  );
};

export default React.memo(MixerStrip);