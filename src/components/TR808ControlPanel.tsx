import React, { useState } from 'react';
import { TR808Button } from './TR808Button';
import { TR808BpmControl } from './TR808BpmControl';
import TR808Knob from './TR808Knob';
import TR808Slider from './TR808Slider';
import { Pattern } from '@/types';
import { DEFAULT_BPM } from '@/lib/constants';
import audioEngine from '../lib/audioEngine';
import videoExporter from '@/lib/videoExporter';
import { Play, Pause, Square, Save, Upload, Download, Music, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { patternService } from '../services/patternService';
import TR808PatternManager from './TR808PatternManager';

interface TR808ControlPanelProps {
  pattern: Pattern;
  onPatternChange: (pattern: Pattern) => void;
}

export const TR808ControlPanel: React.FC<TR808ControlPanelProps> = ({
  pattern,
  onPatternChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPatternManagerOpen, setIsPatternManagerOpen] = useState(false);
  const [includeMic, setIncludeMic] = useState(false);
  const { user } = useAuth();

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        audioEngine.stop();
        setIsPlaying(false);
      } else {
        await audioEngine.start();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      toast.error('Failed to toggle playback');
    }
  };

  const handleBpmChange = (bpm: number) => {
    onPatternChange({ ...pattern, bpm });
  };

  const handleRecordToggle = async () => {
    try {
      if (isRecording) {
        await audioEngine.stopRecording();
        setIsRecording(false);
        toast.success('Recording saved');
      } else {
        await audioEngine.startRecording(includeMic);
        setIsRecording(true);
        toast.success('Recording started');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error('Failed to toggle recording');
    }
  };

  const handleSavePattern = () => {
    setIsPatternManagerOpen(true);
  };

  return (
    <div className="tr808-panel p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <TR808Button
            onClick={handlePlayPause}
            className="bg-tr808-black text-tr808-cream border border-tr808-orange hover:bg-tr808-orange-light"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </TR808Button>
          
          <TR808BpmControl
            value={pattern.bpm}
            onChange={handleBpmChange}
          />
          
          <div className="flex items-center space-x-2">
            <TR808Button
              onClick={handleRecordToggle}
              className={`bg-tr808-black text-tr808-cream border ${isRecording ? 'border-red-500' : 'border-tr808-orange'} hover:bg-tr808-orange-light`}
            >
              {isRecording ? 'Stop Recording' : 'Record Audio'}
            </TR808Button>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={includeMic}
                  onChange={(e) => setIncludeMic(e.target.checked)}
                />
                <div className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                  includeMic ? 'bg-tr808-orange' : 'bg-tr808-silver-dark'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${
                    includeMic ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </div>
              </div>
              <span className="text-xs text-tr808-silver">Mic</span>
            </label>
          </div>
          
          {user && (
            <TR808Button
              onClick={handleSavePattern}
              className="bg-tr808-black text-tr808-cream border border-tr808-orange hover:bg-tr808-orange-light"
            >
              Save Pattern
            </TR808Button>
          )}
        </div>
      </div>

      <TR808PatternManager
        currentPattern={pattern}
        onPatternLoad={onPatternChange}
        onClose={() => setIsPatternManagerOpen(false)}
        open={isPatternManagerOpen}
      />
    </div>
  );
};

export default TR808ControlPanel;
