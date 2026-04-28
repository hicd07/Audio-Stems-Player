"use client";

import React from 'react';
import Knob from './Knob';
import VerticalFader from './VerticalFader';
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

const panSnapPoints = [0, 0.25, 0.5, 0.75, 1];

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
      className="flex flex-col items-center p-inline-2 p-block-3 rounded-xl border-2 min-w-[100px] h-full bg-[#37474F] shadow-2xl"
      style={{ borderColor: color }}
    >
      <div className="text-center w-full mb-4">
        <div className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color }}>{name}</div>
      </div>
      
      <div className="h-[80px] flex flex-col items-center justify-center">
        {typeof pan !== 'undefined' && onPanChange ? (
          <>
            <Knob 
                value={(pan + 1) / 2}
                onChange={(val) => onPanChange((val * 2) - 1)}
                onDoubleClick={() => onPanChange(0.0)}
                label="PAN"
                color="#FBC02D"
                size={44}
                snapPoints={panSnapPoints}
            />
            <span className="text-[9px] font-mono text-gray-400 mt-1 font-bold">{formatPan(pan)}</span>
          </>
        ) : <div className="h-full" />}
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center p-block-4">
        <VerticalFader 
            value={volume}
            onChange={onVolumeChange}
            onDoubleClick={() => onVolumeChange(name === 'Master' ? 0.8 : 0.5)}
            color={color}
        />
        <div className="text-[10px] font-mono font-bold text-gray-300 mt-2 bg-black/30 p-inline-2 rounded shadow-inner">
            {Math.round(volume * 100)}%
        </div>
      </div>

      <div className="w-full p-inline-1 h-[28px]">
        {isMetronome && onOutputChange ? (
          <select 
            value={outputId || ''} 
            onChange={(e) => onOutputChange(e.target.value)} 
            className="w-full bg-[#2B3539] text-[9px] text-gray-300 rounded-md border border-black/30 p-1 font-bold shadow-inner appearance-none text-center"
          >
              <option value="">MASTER</option>
              {enabledOutputDevicesList.map(d => (<option key={d.deviceId} value={d.deviceId}>{d.label.substring(0, 10)}</option>))}
          </select>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(SpecialMixerStrip);