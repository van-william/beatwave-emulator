
import React, { useState, useEffect, useRef } from 'react';
import TR808DrumTrack from './TR808DrumTrack';
import TR808ControlPanel from './TR808ControlPanel';
import TR808PatternManager from './TR808PatternManager';
import TR808StepButton from './TR808StepButton';
import { DRUM_SOUNDS, TOTAL_STEPS, INITIAL_PATTERN } from '@/lib/constants';
import { Pattern, Step } from '@/types';
import audioEngine from '@/lib/audioEngine';
import { toast } from '@/components/ui/sonner';

const TR808: React.FC = () => {
  const [pattern, setPattern] = useState<Pattern>(INITIAL_PATTERN);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPatternManagerOpen, setIsPatternManagerOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize canvas for video export
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 800;
      canvas.height = 600;
    }
    
    // Initialize audio engine
    audioEngine.onStepChange((step) => {
      setCurrentStep(step);
    });
    
    audioEngine.onLoaded(() => {
      setIsLoaded(true);
      audioEngine.setPattern(pattern);
      toast.success('TR-808 loaded and ready');
    });
    
    return () => {
      // Cleanup
      audioEngine.stop();
    };
  }, []);
  
  useEffect(() => {
    audioEngine.setPattern(pattern);
  }, [pattern]);

  const handleStepToggle = (soundId: string, stepId: number) => {
    setPattern((prevPattern) => {
      const newSteps = { ...prevPattern.steps };
      
      if (newSteps[soundId]) {
        newSteps[soundId] = newSteps[soundId].map((step) => 
          step.id === stepId ? { ...step, active: !step.active } : step
        );
      }
      
      return {
        ...prevPattern,
        steps: newSteps
      };
    });
  };

  const handleBpmChange = (bpm: number) => {
    setPattern((prevPattern) => ({
      ...prevPattern,
      bpm
    }));
  };

  const handleSavePattern = () => {
    setIsPatternManagerOpen(true);
  };

  const handleLoadPattern = () => {
    setIsPatternManagerOpen(true);
  };

  const handlePatternLoad = (loadedPattern: Pattern) => {
    setPattern(loadedPattern);
  };

  return (
    <div className="min-h-screen bg-tr808-body text-tr808-silver flex flex-col px-4 py-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Hidden canvas for video export */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Control Panel */}
        <TR808ControlPanel
          pattern={pattern}
          onBpmChange={handleBpmChange}
          onSavePattern={handleSavePattern}
          onLoadPattern={handleLoadPattern}
          canvasRef={canvasRef}
        />
        
        {/* Main Sequencer */}
        <div className="tr808-panel p-4 rounded-lg shadow-md">
          {/* Step Labels */}
          <div className="flex mb-2 ml-[13.5rem] mr-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div key={index} className="w-10 flex-shrink-0 text-center text-xs text-tr808-silver-dark font-mono">
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Drum Tracks */}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
            {DRUM_SOUNDS.map((sound) => (
              <TR808DrumTrack
                key={sound.id}
                sound={sound}
                steps={pattern.steps[sound.id] || []}
                currentStep={currentStep}
                onStepToggle={handleStepToggle}
              />
            ))}
          </div>
        </div>
        
        {/* Pattern Manager Dialog */}
        <TR808PatternManager
          currentPattern={pattern}
          onPatternLoad={handlePatternLoad}
          onClose={() => setIsPatternManagerOpen(false)}
          open={isPatternManagerOpen}
        />
        
        {/* Instruments LED Panel */}
        <div className="tr808-panel p-3 flex justify-center rounded-lg animate-fade-in">
          <div className="flex space-x-2">
            {DRUM_SOUNDS.map((sound) => (
              <button
                key={sound.id}
                className={`w-12 h-10 ${sound.color} rounded-sm
                           border border-white/20 shadow-sm transition-transform hover:scale-105
                           active:scale-95 flex items-center justify-center`}
                onClick={() => audioEngine.playSound(sound.id)}
              >
                <span className="text-xs font-medium text-white/90">
                  {sound.shortName}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-center mt-4 text-tr808-silver-dark text-xs opacity-60">
          © Rhythm Composer TR-808 Emulator
        </div>
      </div>
    </div>
  );
};

export default TR808;
