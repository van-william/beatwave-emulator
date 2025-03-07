
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from '@/components/ui/sonner';
import { Pattern } from '../types';
import { DRUM_SOUNDS, TOTAL_STEPS } from './constants';

class VideoExporter {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isLoaded || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg wasm
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      console.log('FFmpeg loaded successfully');
      this.isLoaded = true;
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      this.isLoading = false;
      toast.error('Failed to load video export module');
    }
  }

  public async exportPattern(pattern: Pattern, canvasRef: React.RefObject<HTMLCanvasElement>) {
    if (!this.isLoaded) {
      await this.initialize();
      if (!this.isLoaded) {
        toast.error('Video export module is not loaded. Please try again.');
        return;
      }
    }
    
    if (!this.ffmpeg) {
      toast.error('FFmpeg is not initialized');
      return;
    }
    
    if (!canvasRef.current) {
      toast.error('Canvas element not found');
      return;
    }
    
    toast.info('Preparing to export video...');
    
    try {
      // Generate frames
      const canvas = canvasRef.current;
      const framesPerBeat = 10; // More frames = smoother animation but larger file
      const totalFrames = TOTAL_STEPS * framesPerBeat;
      
      for (let i = 0; i < totalFrames; i++) {
        const stepIndex = Math.floor(i / framesPerBeat);
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        // Draw background
        ctx.fillStyle = '#403E43';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw labels
        ctx.fillStyle = '#FF6A29';
        ctx.font = '20px sans-serif';
        ctx.fillText(`TR-808 Rhythm Composer - ${pattern.name}`, 20, 30);
        ctx.fillText(`BPM: ${pattern.bpm}`, 20, 60);
        
        // Draw steps
        const stepSize = (canvas.width - 40) / TOTAL_STEPS;
        for (let s = 0; s < TOTAL_STEPS; s++) {
          ctx.fillStyle = s === stepIndex ? '#FF6A29' : '#8A898C';
          ctx.fillRect(20 + s * stepSize, 80, stepSize - 4, 20);
        }
        
        // Draw drum patterns
        DRUM_SOUNDS.forEach((sound, index) => {
          const steps = pattern.steps[sound.id];
          ctx.fillStyle = '#C8C8C9';
          ctx.fillText(sound.shortName, 20, 130 + index * 30);
          
          if (steps) {
            steps.forEach((step, s) => {
              if (step.active) {
                ctx.fillStyle = s === stepIndex ? '#FFB240' : sound.color;
              } else {
                ctx.fillStyle = '#8A898C';
              }
              ctx.fillRect(20 + s * stepSize, 110 + index * 30, stepSize - 4, 20);
            });
          }
        });
        
        // Save frame
        const frameData = canvas.toDataURL('image/jpeg').split(',')[1];
        const frameBuffer = Uint8Array.from(atob(frameData), c => c.charCodeAt(0));
        await this.ffmpeg.writeFile(`frame${i.toString().padStart(5, '0')}.jpg`, frameBuffer);
      }
      
      toast.info('Creating video from frames...');
      
      // Use FFmpeg to create video from frames
      await this.ffmpeg.exec([
        '-framerate', '30',
        '-i', 'frame%05d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '23',
        'output.mp4'
      ]);
      
      // Read the output file
      const outputData = await this.ffmpeg.readFile('output.mp4');
      const blob = new Blob([outputData], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `TR808-Beat-${pattern.name}-${new Date().toISOString().slice(0, 10)}.mp4`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      toast.success('Video exported successfully!');
    } catch (error) {
      console.error('Error exporting video:', error);
      toast.error('Failed to export video');
    }
  }
}

const videoExporter = new VideoExporter();
export default videoExporter;
