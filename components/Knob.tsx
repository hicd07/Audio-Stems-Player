"use client";

import React, { useState, useEffect, useCallback } from 'react';

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

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
};

const Knob: React.FC<KnobProps> = ({ value, onChange, onDoubleClick, label, color = "#26C6DA", size = 60, snapPoints, snapThreshold = 0.05 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, value: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ y: e.clientY, value });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart({ y: e.touches[0].clientY, value });
  };

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    
    const deltaY = dragStart.y - clientY;
    const sensitivity = 200; 
    const deltaValue = deltaY / sensitivity;
    
    let newValue = Math.max(0, Math.min(1, dragStart.value + deltaValue));
    
    if (snapPoints && snapPoints.length > 0) {
      const closest = snapPoints.reduce((prev, curr) => Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev);
      if (Math.abs(newValue - closest) < snapThreshold) newValue = closest;
    }
    
    onChange(newValue);
  }, [isDragging, dragStart, onChange, snapPoints, snapThreshold]);

  useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
      const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
      const onEnd = () => setIsDragging(false);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
      
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onEnd);
      };
    }
  }, [isDragging, handleMove]);

  const center = size / 2;
  const radius = size * 0.38;
  const strokeWidth = size * 0.18;
  const totalRange = 270;
  const panValue = (value - 0.5) * 2;
  const currentAngle = panValue * (totalRange / 2);

  return (
    <div 
        className="flex flex-col items-center select-none" 
        style={{ cursor: 'ns-resize', touchAction: 'none' }} 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={onDoubleClick}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
            <radialGradient id={`grad-${label}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4A585D" />
                <stop offset="100%" stopColor="#252E32" />
            </radialGradient>
        </defs>

        {/* Track Background */}
        <path
          d={describeArc(center, center, radius, -135, 135)}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value Fill (Bipolar for Pan) */}
        {panValue !== 0 && (
            <path
              d={describeArc(center, center, radius, panValue > 0 ? 0 : currentAngle, panValue > 0 ? currentAngle : 0)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
        )}
        
        {/* Knob Face */}
        <circle cx={center} cy={center} r={radius * 0.9} fill={`url(#grad-${label})`} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />

        {/* Indicator */}
        <line
          x1={center} y1={center - radius * 0.5} x2={center} y2={center - radius * 0.9}
          stroke={color} strokeWidth={size * 0.08} strokeLinecap="round"
          transform={`rotate(${currentAngle} ${center} ${center})`}
        />
      </svg>
      {label && <span className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color }}>{label}</span>}
    </div>
  );
};

export default React.memo(Knob);