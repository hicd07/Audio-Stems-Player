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
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    // Calculate value from 0 (bottom) to 1 (top)
    let newValue = (rect.bottom - clientY) / rect.height;
    newValue = Math.max(0, Math.min(1, newValue)); // Clamp value

    onChange(newValue);
  }, [onChange]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent parent handlers
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
  
  const onDoubleClickInternal = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onDoubleClick?.();
  }

  const thumbHeight = 18; // Corresponds to CSS height
  // Calculate thumb position from bottom. Value 0 = 0% from bottom. Value 1 = 100% - thumb height
  const thumbBottomPosition = `calc(${value * 100}% - ${thumbHeight * value}px)`;

  return (
    <div 
      className="fader-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={onDoubleClickInternal}
      style={{ cursor: disabled ? 'pointer' : 'ns-resize' }}
    >
      <div className="fader-track-bg" />
      <div className="fader-fill" style={{ height: `${value * 100}%`, backgroundColor: color }} />
      <div 
        className="fader-thumb"
        style={{ bottom: thumbBottomPosition }}
      />
    </div>
  );
};

export default React.memo(VerticalFader);