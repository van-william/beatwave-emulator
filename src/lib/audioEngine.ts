
import * as Tone from 'tone';
import { DRUM_SOUNDS, TOTAL_STEPS } from './constants';
import { Pattern } from '../types';
import { toast } from 'sonner';

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
  private soundsLoaded = 0;
  private totalSounds = DRUM_SOUNDS.length;

  constructor() {
    this.initializeTone();
  }
  
  private async initializeTone() {
    try {
      // Create a limiter to prevent clipping
      const limiter = new Tone.Limiter(-3).toDestination();
      
      // Load all drum sounds
      this.soundsLoaded = 0;
      
      // Log available sounds
      console.log("Loading sounds from:", DRUM_SOUNDS.map(s => `/sounds/${s.soundFile}`));
      
      // Create placeholder silent buffer for initial loading
      const silentBuffer = Tone.context.createBuffer(2, 44100, 44100);
      
      DRUM_SOUNDS.forEach(async (sound) => {
        try {
          // Create volume and panner nodes for each sound
          const volume = new Tone.Volume(0);
          const panner = new Tone.Panner(0);
          
          // Create the player with placeholder buffer first
          const player = new Tone.Player({
            url: `/sounds/${sound.soundFile}`,
            onload: () => {
              console.log(`Loaded sound: ${sound.name}`);
              this.soundsLoaded++;
              
              if (this.soundsLoaded === this.totalSounds) {
                console.log('All sounds loaded successfully!');
                this.isLoaded = true;
                
                if (this.isLoadedCallback) {
                  this.isLoadedCallback();
                }
              }
            },
            onerror: (err) => {
              console.error(`Error loading sound ${sound.name}:`, err);
              
              // Create a fallback sound (sine wave 1s long)
              const fallbackBuffer = Tone.context.createBuffer(2, 44100, 44100);
              for (let channel = 0; channel < 2; channel++) {
                const channelData = fallbackBuffer.getChannelData(channel);
                for (let i = 0; i < 44100; i++) {
                  // Create a short percussive envelope
                  const env = Math.exp(-i / 2000);
                  channelData[i] = Math.sin(i * 0.1) * env * 0.5;
                }
              }
              
              player.buffer = fallbackBuffer;
              this.soundsLoaded++;
              
              if (this.soundsLoaded === this.totalSounds) {
                this.isLoaded = true;
                toast.warning("Some sounds failed to load. Using fallback sounds.");
                
                if (this.isLoadedCallback) {
                  this.isLoadedCallback();
                }
              }
            }
          }).connect(volume);
          
          // Connect the volume to the panner, and the panner to the limiter
          volume.connect(panner);
          panner.connect(limiter);
          
          // Store the nodes
          this.volumes.set(sound.id, volume);
          this.panners.set(sound.id, panner);
          this.players.set(sound.id, player);
        } catch (error) {
          console.error(`Error setting up sound ${sound.name}:`, error);
          toast.error(`Failed to initialize sound: ${sound.name}`);
        }
      });
      
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
      // Ensure audio context is running
      if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("Tone.js context started:", Tone.context.state);
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
      // Request microphone access explicitly with visible message
      toast.info("Please allow microphone access to record your beat...");
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
      if (player.loaded) {
        player.start();
      } else {
        console.warn(`Sound ${soundId} not loaded yet`);
        toast.warning("Some sounds are still loading...");
      }
    }
  }
}

// Create a singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;
