import React, { useState } from 'react';
import { TR808Button } from './TR808Button';
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
  const [bpm, setBpm] = useState(pattern.bpm || DEFAULT_BPM);
  const { user } = useAuth();

  const handlePlayPause = () => {
    if (isPlaying) {
      audioEngine.stop();
    } else {
      audioEngine.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleBpmChange = (newBpm: number) => {
    if (newBpm >= 20 && newBpm <= 300) {
      setBpm(newBpm);
      audioEngine.setBpm(newBpm);
      onPatternChange({ ...pattern, bpm: newBpm });
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      await audioEngine.stopRecording();
      setIsRecording(false);
    } else {
      await audioEngine.startRecording();
      setIsRecording(true);
    }
  };

  const handleExport = async () => {
    try {
      await audioEngine.exportPattern();
    } catch (error) {
      console.error('Error exporting pattern:', error);
      toast.error('Failed to export pattern');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save patterns');
      return;
    }

    try {
      await patternService.savePattern(pattern, user.id);
      toast.success('Pattern saved successfully!');
    } catch (error) {
      console.error('Error saving pattern:', error);
      toast.error('Failed to save pattern');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-tr808-black rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TR808Button
            onClick={handlePlayPause}
            active={isPlaying}
            className="bg-tr808-orange hover:bg-tr808-orange-light"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </TR808Button>
          <div className="flex items-center gap-2">
            <label htmlFor="bpm" className="text-tr808-cream">BPM:</label>
            <input
              id="bpm"
              type="number"
              min="20"
              max="300"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              className="w-16 px-2 py-1 bg-tr808-black border border-tr808-orange text-tr808-cream rounded"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <TR808Button
            onClick={handleRecordToggle}
            active={isRecording}
            className="bg-tr808-red hover:bg-tr808-red-light"
          >
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </TR808Button>
          <TR808Button
            onClick={handleExport}
            className="bg-tr808-amber hover:bg-tr808-amber-light"
          >
            Export Loop
          </TR808Button>
          {user && (
            <TR808Button
              onClick={handleSave}
              className="bg-tr808-cream hover:bg-tr808-cream-light text-tr808-black"
            >
              Save Pattern
            </TR808Button>
          )}
        </div>
      </div>
      <div className="w-full text-center text-tr808-orange text-lg font-bold mt-2">
        Rhythm Composer TR-808
      </div>
    </div>
  );
};

export default TR808ControlPanel;
