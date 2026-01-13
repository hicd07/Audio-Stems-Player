import React, { useEffect, useRef, useState } from 'react';
import { TrackData } from '../types';

interface AudioEditorProps {
  pad: TrackData;
  onSave: (trimStart: number, trimEnd: number) => void;
  onClose: () => void;
}

const AudioEditor: React.FC<AudioEditorProps> = ({ pad, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [start, setStart] = useState(pad.trimStart);
  const [end, setEnd] = useState(pad.trimEnd > 0 ? pad.trimEnd : (pad.audioBuffer?.duration || 0));
  const [isDragging, setIsDragging] = useState<'START' | 'END' | null>(null);

  const buffer = pad.audioBuffer;
  const duration = buffer?.duration || 1;

  useEffect(() => {
    if (!canvasRef.current || !buffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw Waveform
    const data = buffer.getChannelData(0); // Left channel
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    // Draw Masks (Trimmed areas)
    const startX = (start / duration) * width;
    const endX = (end / duration) * width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    // Draw Handles
    ctx.strokeStyle = '#facc15'; // yellow
    ctx.lineWidth = 2;
    
    // Start Handle
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();

    // End Handle
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    // Time Labels
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`S: ${start.toFixed(2)}s`, startX + 5, 12);
    ctx.fillText(`E: ${end.toFixed(2)}s`, endX - 60, height - 5);

  }, [buffer, start, end, duration]);

  const handleMouseDown = (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = (x / canvas.width) * duration;
      
      const startDist = Math.abs(t - start);
      const endDist = Math.abs(t - end);

      if (startDist <= endDist) {
          setIsDragging('START');
          setStart(Math.min(t, end - 0.01)); // Prevent crossing
      } else {
          setIsDragging('END');
          setEnd(Math.max(t, start + 0.01));
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const t = (x / rect.width) * duration;

      if (isDragging === 'START') {
          setStart(Math.min(t, end - 0.01));
      } else {
          setEnd(Math.max(t, start + 0.01));
      }
  };

  const handleMouseUp = () => {
      setIsDragging(null);
  };

  if (!buffer) return <div className="text-gray-400 p-4">No Audio Loaded</div>;

  return (
    <div className="flex flex-col gap-4">
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={200} 
            className="w-full h-48 bg-gray-900 rounded cursor-crosshair border border-gray-700"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
        <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>Duration: {duration.toFixed(2)}s</span>
            <span>Selection: {(end - start).toFixed(2)}s</span>
        </div>
        <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Cancel</button>
            <button onClick={() => onSave(start, end)} className="px-4 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 rounded text-white">Save Trim</button>
        </div>
    </div>
  );
};

export default AudioEditor;