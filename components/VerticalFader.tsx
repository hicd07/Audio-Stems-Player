"use client";

import React, { useRef, useCallback } from 'react';

interface VerticalFaderProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
  onDoubleClick?: () => void;
  color?: string;
  disabled?: boolean;
}

const VerticalFader: React.FC<VerticalFaderProps> = ({ value, onChange, onDoubleClick, color, disabled = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current || disabled) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    let newValue = (rect.bottom - clientY) / rect.height;
    newValue = Math.max(0, Math.min(1, newValue));

    onChange(newValue);
  }, [onChange, disabled]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    handleInteraction(e);

    const onMouseMove = (moveEvent: MouseEvent) => handleInteraction(moveEvent);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    e.stopPropagation();
    handleInteraction(e);

    const onTouchMove = (moveEvent: TouchEvent) => handleInteraction(moveEvent);
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };
  
  // Calculate thumb position: Value 1.0 (top) -> bottom = calc(100% - 18px)
  const thumbBottomPosition = `calc(${value * 100}% - ${18 * value}px)`;

  return (
    <div 
      className="fader-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
      style={{ cursor: disabled ? 'default' : 'ns-resize' }}
    >
      <div className="fader-track-bg" />
      <div 
        className="fader-fill" 
        style={{ 
            height: `${value * 100}%`, 
            backgroundColor: color || '#90A4AE',
            boxShadow: `0 0 10px ${color}44` 
        }} 
      />
      <div 
        className="fader-thumb"
        style={{ bottom: thumbBottomPosition }}
      />
    </div>
  );
};

export default React.memo(VerticalFader);