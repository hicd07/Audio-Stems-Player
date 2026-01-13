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

// --- SVG Arc Helper Functions ---
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
  const d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  return d;
};
// --- End SVG Helpers ---


const Knob: React.FC<KnobProps> = ({ value, onChange, onDoubleClick, label, color = "#06b6d4", size = 60, snapPoints, snapThreshold = 0.05 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, value: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
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

  // --- New bipolar rendering logic ---
  const center = size / 2;
  const radius = size * 0.4;
  const strokeWidth = size * 0.22;
  const knobBodyRadius = radius * 0.9;

  const totalAngleRange = 270; // e.g. from ~7:30 to ~4:30
  const startAngle = -totalAngleRange / 2; // -135 degrees from center (UP)
  const endAngle = totalAngleRange / 2; // 135 degrees from center (UP)

  // Convert value (0..1) to pan (-1..1) then to angle
  const panValue = (value - 0.5) * 2;
  const currentAngle = panValue * (totalAngleRange / 2);

  return (
    <div className="flex flex-col items-center" onDoubleClick={onDoubleClick} style={{ cursor: 'ns-resize' }} onMouseDown={handleMouseDown}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
            <radialGradient id={`knobGradient-${label}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{stopColor: '#4A5568', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#2B3539', stopOpacity: 1}} />
            </radialGradient>
        </defs>

        {/* Background Track */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke="#2B3539"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value Track */}
        {panValue > 0 && (
            <path
              d={describeArc(center, center, radius, 0, currentAngle)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
        )}
        {panValue < 0 && (
             <path
              d={describeArc(center, center, radius, currentAngle, 0)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
        )}
        
        {/* Knob Body */}
        <circle
          cx={center}
          cy={center}
          r={knobBodyRadius}
          fill={`url(#knobGradient-${label})`}
          stroke="#1a2023"
          strokeWidth="1"
        />

        {/* Indicator Notch */}
        <line
          x1={center}
          y1={center - knobBodyRadius * 0.6}
          x2={center}
          y2={center - knobBodyRadius * 0.9}
          stroke={color}
          strokeWidth={size * 0.06}
          strokeLinecap="round"
          transform={`rotate(${currentAngle} ${center} ${center})`}
        />
      </svg>
      {label && <span className="text-xs font-bold mt-1 tracking-wider" style={{ color }}>{label}</span>}
    </div>
  );
};

export default React.memo(Knob);