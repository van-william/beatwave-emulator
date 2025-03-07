
import React from 'react';
import TR808StepButton from './TR808StepButton';
import TR808Slider from './TR808Slider';
import TR808Knob from './TR808Knob';
import { DrumSound, Step } from '@/types';
import audioEngine from '@/lib/audioEngine';

interface TR808DrumTrackProps {
  sound: DrumSound;
  steps: Step[];
  currentStep: number;
  onStepToggle: (soundId: string, stepId: number) => void;
}

const TR808DrumTrack: React.FC<TR808DrumTrackProps> = ({
  sound,
  steps,
  currentStep,
  onStepToggle
}) => {
  const [volume, setVolume] = React.useState(0);
  const [pan, setPan] = React.useState(0);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    audioEngine.setVolume(sound.id, value);
  };

  const handlePanChange = (value: number) => {
    setPan(value);
    audioEngine.setPan(sound.id, value);
  };

  const handleSoundTest = () => {
    audioEngine.playSound(sound.id);
  };

  return (
    <div className="flex items-center py-2 px-1 border-b border-tr808-panel animate-slide-in opacity-0" style={{ animationDelay: `${parseInt(sound.id) * 0.05}s` }}>
      <div className="w-24 flex flex-col items-center">
        <button 
          className={`w-12 h-8 rounded-sm ${sound.color} text-white font-medium text-xs mb-1
                    border border-white/20 shadow-sm transition-transform hover:scale-105
                    active:scale-95 flex items-center justify-center`}
          onClick={handleSoundTest}
        >
          {sound.shortName}
        </button>
        <span className="text-xs text-tr808-silver">{sound.name}</span>
      </div>
      
      <div className="flex items-center mx-3 space-x-1">
        <TR808Knob 
          min={-20} 
          max={10} 
          value={volume} 
          onChange={handleVolumeChange} 
          label="Vol"
          size="sm"
        />
        <TR808Knob 
          min={-1} 
          max={1} 
          value={pan} 
          onChange={handlePanChange} 
          label="Pan"
          size="sm"
        />
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <div className="flex">
          {steps.map((step) => (
            <TR808StepButton
              key={step.id}
              active={step.active}
              isCurrentStep={currentStep === step.id}
              onClick={() => onStepToggle(sound.id, step.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TR808DrumTrack;
