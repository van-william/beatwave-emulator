
import React, { useState, useRef, useEffect } from 'react';

interface TR808KnobProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TR808Knob: React.FC<TR808KnobProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  size = 'md'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  // Calculate rotation based on value (0 to 270 degrees)
  const calculateRotation = (val: number) => {
    const percentage = (val - min) / (max - min);
    return percentage * 270 - 135; // -135 to 135 degrees
  };

  const rotation = calculateRotation(value);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate value change based on vertical movement
      // Moving up = increasing value, moving down = decreasing value
      const deltaY = startYRef.current - e.clientY;
      const sensitivity = (max - min) / 200; // Adjust sensitivity as needed
      const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity));
      
      onChange(newValue);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const deltaY = startYRef.current - e.touches[0].clientY;
      const sensitivity = (max - min) / 200;
      const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity));
      
      onChange(newValue);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, onChange]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const indicatorClasses = {
    sm: 'top-1.5 h-2',
    md: 'top-2 h-3',
    lg: 'top-3 h-4'
  };

  return (
    <div className="flex flex-col items-center mx-1">
      <div
        ref={knobRef}
        className={`tr808-knob ${sizeClasses[size]} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className={`tr808-knob-indicator ${indicatorClasses[size]}`} />
      </div>
      {label && (
        <div className="mt-1 text-xs text-tr808-silver font-medium">
          {label}
        </div>
      )}
    </div>
  );
};

export default TR808Knob;
