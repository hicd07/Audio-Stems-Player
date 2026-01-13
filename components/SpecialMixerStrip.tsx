import React from 'react';
import Knob from './Knob';
import VerticalFader from './VerticalFader';
import { AudioDeviceInfo } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface SpecialMixerStripProps {
  name: string;
  volume: number;
  onVolumeChange: (val: number) => void;
  color: string;
  pan?: number;
  onPanChange?: (val: number) => void;
  outputId?: string;
  onOutputChange?: (deviceId: string) => void;
  isMetronome?: boolean;
}

const panSnapPoints = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const volumeSnapPoints = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.8, 0.875, 1];
const panColor = "#fbbf24";

const SpecialMixerStrip: React.FC<SpecialMixerStripProps> = ({
    name,
    volume,
    onVolumeChange,
    color,
    pan,
    onPanChange,
    outputId,
    onOutputChange,
    isMetronome = false
}) => {
  const { state } = useAppContext();
  const { outputDevices, enabledAudioOutputDevices } = state;

  const enabledOutputDevicesList = React.useMemo(() => outputDevices.filter(d => enabledAudioOutputDevices.has(d.deviceId)), [outputDevices, enabledAudioOutputDevices]);

  const formatPan = (panVal: number) => {
    if (Math.abs(panVal) < 0.01) return "C";
    const percent = Math.round(Math.abs(panVal) * 100);
    return panVal < 0 ? `L${percent}` : `R${percent}`;
  };

  return (
    <div 
      className="flex flex-col items-center p-2 rounded-lg border-2 min-w-[90px] h-full justify-between py-2 relative transition-colors bg-[#37474F]"
      style={{ borderColor: color }}
    >
      <div className="text-center mb-1 w-full">
        <div className="text-xs font-bold mb-1 tracking-wider" style={{ color }}>{name.toUpperCase()}</div>
      </div>
      
      <div className="flex justify-center items-start w-full my-3 h-[70px]">
        {typeof pan !== 'undefined' && onPanChange ? (
          <div className="flex flex-col items-center">
            <Knob 
                value={(pan + 1) / 2}
                onChange={(val) => onPanChange((val * 2) - 1)}
                onDoubleClick={() => onPanChange(0.0)}
                label="PAN"
                color={panColor}
                size={40}
                snapPoints={panSnapPoints}
            />
            <span className="text-[10px] font-mono text-gray-400 mt-1">{formatPan(pan)}</span>
          </div>
        ) : <div className="w-full h-full"></div> /* Spacer */}
      </div>

      <div className="flex-1 w-full py-1 flex justify-center items-center">
        <VerticalFader 
            value={volume}
            onChange={onVolumeChange}
            onDoubleClick={() => onVolumeChange(name === 'Master' ? 0.8 : 0.5)}
            color={color}
            snapPoints={volumeSnapPoints}
        />
      </div>

      <div className="mt-1 text-xs font-mono text-gray-300 mb-2">{Math.round(volume * 100)}%</div>
      
      {isMetronome && onOutputChange && (
        <div className="w-full">
          <select 
            value={outputId || ''} 
            onChange={(e) => onOutputChange(e.target.value)} 
            className="w-full bg-[#2B3539] text-[9px] text-gray-300 rounded border border-black/20 focus:border-green-400 p-1 truncate"
            onClick={(e) => e.stopPropagation()}
          >
              <option value="">Master</option>
              {enabledOutputDevicesList.map(d => (<option key={d.deviceId} value={d.deviceId}>{d.label.substring(0, 10)}...</option>))}
          </select>
        </div>
      )}
      {!isMetronome && <div className="h-[25px]"></div>} 
    </div>
  );
};

export default React.memo(SpecialMixerStrip);