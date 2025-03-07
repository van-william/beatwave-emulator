
import * as Tone from 'tone';
import { DRUM_SOUNDS, TOTAL_STEPS } from './constants';
import { Pattern } from '../types';
import { toast } from '@/components/ui/sonner';

class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;
  private currentStep = 0;
  private pattern: Pattern | null = null;
  private isPlaying = false;
  
  private volumes: Map<string, Tone.Volume> = new Map();
  private panners: Map<string, Tone.Panner> = new Map();
  
  private stepCallback: ((step: number) => void) | null = null;
  private isLoadedCallback: (() => void) | null = null;
  private isLoaded = false;

  constructor() {
    this.initializeTone();
  }
  
  private async initializeTone() {
    try {
      // Create a limiter to prevent clipping
      const limiter = new Tone.Limiter(-3).toDestination();
      
      // Load all drum sounds
      const bufferPromises = DRUM_SOUNDS.map(async (sound) => {
        try {
          // Create volume and panner nodes for each sound
          const volume = new Tone.Volume(0);
          const panner = new Tone.Panner(0);
          
          // Create the player and connect it to the volume and panner
          const player = new Tone.Player({
            url: `/sounds/${sound.soundFile}`,
            onload: () => {
              console.log(`Loaded sound: ${sound.name}`);
            }
          }).connect(volume);
          
          // Connect the volume to the panner, and the panner to the limiter
          volume.connect(panner);
          panner.connect(limiter);
          
          // Store the nodes
          this.volumes.set(sound.id, volume);
          this.panners.set(sound.id, panner);
          this.players.set(sound.id, player);
          
          return player.loaded;
        } catch (error) {
          console.error(`Error loading sound ${sound.name}:`, error);
          throw error;
        }
      });
      
      // Wait for all sounds to load
      await Promise.all(bufferPromises);
      
      console.log('All sounds loaded successfully!');
      this.isLoaded = true;
      
      if (this.isLoadedCallback) {
        this.isLoadedCallback();
      }
      
      // Set up the main sequencer
      Tone.Transport.scheduleRepeat((time) => {
        this.playCurrentStep(time);
      }, '16n');
      
      // Set default BPM
      Tone.Transport.bpm.value = 120;
      
    } catch (error) {
      console.error('Error initializing audio engine:', error);
      toast.error('Failed to load audio samples. Please refresh the page.');
    }
  }
  
  private playCurrentStep(time: number) {
    if (!this.pattern) return;
    
    DRUM_SOUNDS.forEach(sound => {
      const steps = this.pattern?.steps[sound.id];
      if (steps && steps[this.currentStep].active) {
        const player = this.players.get(sound.id);
        if (player) {
          player.start(time);
        }
      }
    });
    
    if (this.stepCallback) {
      this.stepCallback(this.currentStep);
    }
    
    this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
  }
  
  public onStepChange(callback: (step: number) => void) {
    this.stepCallback = callback;
  }
  
  public onLoaded(callback: () => void) {
    if (this.isLoaded) {
      callback();
    } else {
      this.isLoadedCallback = callback;
    }
  }
  
  public setPattern(pattern: Pattern) {
    this.pattern = pattern;
    Tone.Transport.bpm.value = pattern.bpm;
  }
  
  public async start() {
    if (!this.isLoaded) {
      toast.error('Still loading sounds, please wait...');
      return;
    }
    
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      
      Tone.Transport.start();
      this.isPlaying = true;
    } catch (error) {
      console.error('Error starting playback:', error);
      toast.error('Failed to start playback');
    }
  }
  
  public stop() {
    Tone.Transport.stop();
    this.currentStep = 0;
    if (this.stepCallback) {
      this.stepCallback(-1); // -1 indicates no active step
    }
    this.isPlaying = false;
  }
  
  public isCurrentlyPlaying() {
    return this.isPlaying;
  }
  
  public setVolume(soundId: string, value: number) {
    const volume = this.volumes.get(soundId);
    if (volume) {
      volume.volume.value = value;
    }
  }
  
  public setPan(soundId: string, value: number) {
    const panner = this.panners.get(soundId);
    if (panner) {
      panner.pan.value = value;
    }
  }
  
  public setBpm(bpm: number) {
    Tone.Transport.bpm.value = bpm;
    if (this.pattern) {
      this.pattern.bpm = bpm;
    }
  }
  
  public getCurrentBpm(): number {
    return Tone.Transport.bpm.value;
  }
  
  public async startRecording() {
    if (!this.isLoaded) {
      toast.error('Still loading sounds, please wait...');
      return;
    }
    
    if (this.isRecording) {
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorder = new MediaRecorder(stream);
      this.chunks = [];
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        this.chunks = [];
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `TR808-Beat-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.isRecording = false;
        toast.success('Recording saved successfully!');
      };
      
      this.recorder.start();
      this.isRecording = true;
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  }
  
  public stopRecording() {
    if (this.recorder && this.isRecording) {
      this.recorder.stop();
      this.isRecording = false;
    }
  }
  
  public isCurrentlyRecording() {
    return this.isRecording;
  }
  
  public playSound(soundId: string) {
    const player = this.players.get(soundId);
    if (player) {
      player.start();
    }
  }
}

// Create a singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;
