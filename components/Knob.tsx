import React, { useState, useRef, useEffect, useCallback } from 'react';

interface KnobProps {
  value: number; // 0 to 1
  onChange: (val: number) => void;
  onDoubleClick?: () => void;
  label?: string;
  color?: string;
  size?: number;
  snapPoints?: number[];
  snapThreshold?: number;
}

const Knob: React.FC<KnobProps> = ({ value, onChange, onDoubleClick, label, color = "#06b6d4", size = 60, snapPoints, snapThreshold = 0.05 }) => {
  const knobRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, value: 0 });

  const minAngle = -135;
  const maxAngle = 135;
  const angleRange = maxAngle - minAngle;

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ y: e.clientY, value });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStart.y - e.clientY;
    const sensitivity = 200; // pixels per full turn
    const deltaValue = deltaY / sensitivity;
    
    let newValue = dragStart.value + deltaValue;
    newValue = Math.max(0, Math.min(1, newValue)); // Clamp between 0 and 1
    
    // Snapping logic
    if (snapPoints && snapPoints.length > 0) {
      let closestPoint = -1;
      let minDistance = Infinity;

      for (const point of snapPoints) {
        const distance = Math.abs(newValue - point);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }
      
      if (closestPoint !== -1 && minDistance < snapThreshold) {
        newValue = closestPoint;
      }
    }
    
    onChange(newValue);
  }, [isDragging, dragStart, onChange, snapPoints, snapThreshold]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const rotation = minAngle + (value * angleRange);
  const center = size / 2;
  const radius = size * 0.4;
  const strokeWidth = size * 0.15;

  return (
    <div className="flex flex-col items-center" onDoubleClick={onDoubleClick} style={{ cursor: 'ns-resize' }}>
      <svg
        ref={knobRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseDown={handleMouseDown}
      >
        {/* Background */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#374151"
          stroke="#2B3539"
          strokeWidth={strokeWidth}
        />
        {/* Indicator Line */}
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - radius * 0.9}
          stroke={color}
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${center} ${center})`}
        />
      </svg>
      {label && <span className="text-xs font-bold mt-1" style={{ color }}>{label}</span>}
    </div>
  );
};

export default React.memo(Knob);