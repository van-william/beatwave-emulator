import React, { useState, useEffect, useRef } from 'react';
import TR808DrumTrack from './TR808DrumTrack';
import TR808ControlPanel from './TR808ControlPanel';
import TR808PatternManager from './TR808PatternManager';
import { DRUM_SOUNDS, TOTAL_STEPS, INITIAL_PATTERN } from '../lib/constants';
import { Pattern } from '../types';
import audioEngine from '../lib/audioEngine';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

const TR808: React.FC = () => {
  const [pattern, setPattern] = useState<Pattern>(INITIAL_PATTERN);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPatternManagerOpen, setIsPatternManagerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();

  // Initialize audio engine
  useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      try {
        // Initialize canvas for video export
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = 800;
          canvas.height = 600;
        }
        
        // Initialize audio engine
        audioEngine.onStepChange((step) => {
          if (isMounted) {
            setCurrentStep(step);
          }
        });
        
        audioEngine.onLoaded(() => {
          if (isMounted) {
            setIsLoaded(true);
            // Set initial pattern to the audio engine
            audioEngine.setPattern(pattern);
          }
        });
      } catch (err) {
        console.error('Error initializing TR808:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize TR-808');
          toast.error('Failed to initialize TR-808');
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      audioEngine.stop();
    };
  }, [pattern, user]); // Add pattern as a dependency
  
  // Update audio engine when pattern changes
  useEffect(() => {
    if (isLoaded) {
      try {
        audioEngine.setPattern(pattern);
      } catch (err) {
        console.error('Error updating pattern:', err);
        toast.error('Failed to update pattern');
      }
    }
  }, [pattern, isLoaded]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-destructive/10 p-6 rounded-lg shadow-xl text-center">
          <h2 className="text-destructive text-xl font-bold mb-3">Error</h2>
          <p className="text-destructive/90">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

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
        {/* Roland TR-808 Title Block */}
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-4xl bg-black border-b-2 border-tr808-orange pb-2">
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-tr808-orange text-3xl font-medium tracking-wide">Rhythm Composer</span>
              <span className="text-tr808-orange text-3xl font-bold tracking-wider">TR-808</span>
            </div>
          </div>
        </div>
        
        {/* Hidden canvas for video export */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Control Panel */}
        <TR808ControlPanel
          pattern={pattern}
          onPatternChange={(updatedPattern) => {
            setPattern(updatedPattern);
            handleBpmChange(updatedPattern.bpm);
          }}
        />
        
        {/* Main Sequencer */}
        <div className="tr808-panel p-4 rounded-lg shadow-md">
          {/* Step Labels */}
          <div className="flex mb-2 ml-[13.5rem] mr-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <div 
                key={index} 
                className={`w-10 flex-shrink-0 text-center text-xs font-mono
                           ${currentStep === index ? 'text-tr808-orange font-bold' : 'text-tr808-silver-dark'}`}
              >
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
