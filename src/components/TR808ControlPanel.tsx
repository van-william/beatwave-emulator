import React, { useState } from 'react';
import TR808Button from './TR808Button';
import TR808Knob from './TR808Knob';
import TR808Slider from './TR808Slider';
import { Pattern } from '@/types';
import { DEFAULT_BPM } from '@/lib/constants';
import audioEngine from '@/lib/audioEngine';
import videoExporter from '@/lib/videoExporter';
import { Play, Pause, Square, Save, Upload, Download, Music, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface TR808ControlPanelProps {
  pattern: Pattern;
  onBpmChange: (bpm: number) => void;
  onSavePattern: () => void;
  onLoadPattern: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const TR808ControlPanel: React.FC<TR808ControlPanelProps> = ({
  pattern,
  onBpmChange,
  onSavePattern,
  onLoadPattern,
  canvasRef
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(pattern.bpm || DEFAULT_BPM);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      audioEngine.start();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    
    if (isRecording) {
      audioEngine.stopRecording();
      setIsRecording(false);
    }
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    onBpmChange(newBpm);
    audioEngine.setBpm(newBpm);
  };

  const handleRecording = () => {
    if (isRecording) {
      audioEngine.stopRecording();
      setIsRecording(false);
    } else {
      audioEngine.startRecording();
      setIsRecording(true);
      
      // Auto-start playback if not already playing
      if (!isPlaying) {
        audioEngine.start();
        setIsPlaying(true);
      }
    }
  };

  const handleExport = async () => {
    await videoExporter.exportPattern(pattern, canvasRef);
  };

  return (
    <div className="tr808-panel p-4 rounded-lg shadow-md animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <TR808Button 
            onClick={handlePlayPause} 
            variant={isPlaying ? "orange" : "default"}
            active={isPlaying}
            className="w-14 h-14 rounded-full"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </TR808Button>
          
          <TR808Button 
            onClick={handleStop} 
            className="w-12 h-12 rounded-full"
          >
            <Square size={18} />
          </TR808Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <TR808Slider
            min={60}
            max={200}
            value={bpm}
            onChange={handleBpmChange}
            label="BPM"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <TR808Button 
            onClick={onSavePattern} 
            variant="default"
          >
            <Save size={16} className="mr-1" /> Save
          </TR808Button>
          
          <TR808Button 
            onClick={onLoadPattern} 
            variant="default"
          >
            <Upload size={16} className="mr-1" /> Load
          </TR808Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <TR808Button 
            onClick={handleRecording} 
            variant={isRecording ? "orange" : "default"}
            active={isRecording}
          >
            <Mic size={16} className="mr-1" /> 
            {isRecording ? "Stop Rec" : "Record"}
          </TR808Button>
          
          <TR808Button 
            onClick={handleExport} 
            variant="amber"
          >
            <Download size={16} className="mr-1" /> Export MP3
          </TR808Button>
        </div>
        
        <div className="w-full text-center text-tr808-orange text-lg font-bold mt-2">
          Rhythm Composer TR-808
        </div>
      </div>
    </div>
  );
};

export default TR808ControlPanel;
