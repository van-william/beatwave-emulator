
import React from 'react';

interface TR808SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

const TR808Slider: React.FC<TR808SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  orientation = 'horizontal',
  label
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  return (
    <div className={`flex ${orientation === 'vertical' ? 'flex-col h-32' : 'flex-col w-32'}`}>
      {label && (
        <div className="text-xs text-tr808-silver font-medium mb-1">
          {label}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={`tr808-slider ${orientation === 'vertical' ? 'h-full -rotate-90 origin-left mt-16' : 'w-full'}`}
      />
    </div>
  );
};

export default TR808Slider;
