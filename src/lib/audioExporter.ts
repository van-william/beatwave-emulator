import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';
import { AudioEngine } from './audioEngine';

export class AudioExporter {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  constructor(private audioEngine: AudioEngine) {}

  private async initialize() {
    if (this.isLoaded) return;
    if (this.isLoading) {
      toast.warning('FFmpeg is already loading...');
      return;
    }

    try {
      this.isLoading = true;
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg
      await this.ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
      
      this.isLoaded = true;
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      toast.error('Failed to load audio processing tools');
      this.isLoading = false;
      throw error;
    }
  }

  public async exportPattern(name: string): Promise<void> {
    try {
      await this.initialize();
      
      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }

      // Start recording
      this.audioEngine.startRecording();
      
      // Start playback if not already playing
      if (!this.audioEngine.isPlaying) {
        await this.audioEngine.start();
      }
      
      // Wait for one full pattern loop
      await new Promise(resolve => setTimeout(resolve, 2000)); // Adjust timing as needed
      
      // Stop recording and get the WAV blob
      const wavBlob = await this.audioEngine.stopRecording();
      
      // Convert WAV blob to array buffer
      const wavArrayBuffer = await wavBlob.arrayBuffer();
      
      // Write WAV file to FFmpeg's virtual filesystem
      await this.ffmpeg.writeFile('input.wav', new Uint8Array(wavArrayBuffer));
      
      // Convert to MP3
      await this.ffmpeg.exec(['-i', 'input.wav', 'output.mp3']);
      
      // Read the output MP3 file
      const mp3Data = await this.ffmpeg.readFile('output.mp3');
      
      // Create a download link
      const blob = new Blob([mp3Data], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Pattern exported successfully!');
    } catch (error) {
      console.error('Error exporting pattern:', error);
      toast.error('Failed to export pattern');
      
      // Ensure recording is stopped in case of error
      if (this.audioEngine.isPlaying) {
        this.audioEngine.stop();
      }
    }
  }
} 