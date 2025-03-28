import React from 'react';
import { Slider } from './ui/slider';

interface TR808BpmControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const TR808BpmControl: React.FC<TR808BpmControlProps> = ({
  value,
  onChange,
  min = 20,
  max = 300,
  step = 1
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        className="w-16 px-2 py-1 bg-black text-white border border-tr808-orange rounded text-center font-mono font-bold"
      />
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="w-32"
      />
    </div>
  );
}; 