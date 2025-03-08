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
      
      // Reset sound loading counters
      this.soundsLoaded = 0;
      this.isLoaded = false;
      
      // Load all drum sounds
      console.log("Loading sounds from:", DRUM_SOUNDS.map(s => `/sounds/${s.soundFile}`));
      
      // Make individual player for each sound with proper path
      for (const sound of DRUM_SOUNDS) {
        try {
          // Create volume and panner nodes for each sound
          const volume = new Tone.Volume(0);
          const panner = new Tone.Panner(0);
          
          // Create the player with the correct sound file path
          const player = new Tone.Player({
            url: `/sounds/${sound.soundFile}`,
            onload: () => {
              console.log(`Loaded sound: ${sound.name} (${sound.soundFile})`);
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
              console.error(`Error loading sound ${sound.name} (${sound.soundFile}):`, err);
              toast.error(`Failed to load: ${sound.name}`);
              
              // Create a unique fallback sound for each instrument type
              // Customize the fallback sound to better match the instrument type
              const fallbackBuffer = Tone.context.createBuffer(2, 44100, 44100);
              
              // Create more distinct fallback sounds based on instrument type
              for (let channel = 0; channel < 2; channel++) {
                const channelData = fallbackBuffer.getChannelData(channel);
                
                // Apply different sound characteristics based on instrument type
                if (sound.id.includes('kick')) {
                  // Low frequency for kick
                  for (let i = 0; i < 44100; i++) {
                    const env = Math.exp(-i / 3000);
                    channelData[i] = Math.sin(i * 0.05) * env * 0.8;
                  }
                } else if (sound.id.includes('snare') || sound.id.includes('clap')) {
                  // Noise component for snare/clap
                  for (let i = 0; i < 44100; i++) {
                    const env = Math.exp(-i / 1000);
                    channelData[i] = (Math.random() * 2 - 1) * env * 0.7;
                  }
                } else if (sound.id.includes('hat') || sound.id.includes('cymbal')) {
                  // High frequency noise for hats/cymbals
                  for (let i = 0; i < 44100; i++) {
                    const env = Math.exp(-i / (sound.id.includes('open') ? 4000 : 800));
                    channelData[i] = (Math.random() * 2 - 1) * env * 0.6;
                  }
                } else if (sound.id.includes('tom')) {
                  // Medium frequency for toms
                  for (let i = 0; i < 44100; i++) {
                    const env = Math.exp(-i / 1500);
                    // Adjust frequency based on tom type (low/mid/high)
                    const freq = sound.id.includes('low') ? 0.1 : 
                                sound.id.includes('mid') ? 0.15 : 0.2;
                    channelData[i] = Math.sin(i * freq) * env * 0.7;
                  }
                } else {
                  // Default percussive sound for other instruments
                  for (let i = 0; i < 44100; i++) {
                    const env = Math.exp(-i / 2000);
                    channelData[i] = Math.sin(i * 0.15) * env * 0.6;
                  }
                }
              }
              
              player.buffer = new Tone.ToneAudioBuffer(fallbackBuffer);
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
          
          console.log(`Set up audio pipeline for ${sound.id}`);
        } catch (error) {
          console.error(`Error setting up sound ${sound.name}:`, error);
          toast.error(`Failed to initialize sound: ${sound.name}`);
        }
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
    if (!this.pattern) {
      console.warn("No pattern loaded for playback");
      return;
    }
    
    // Log the current step for debugging
    console.log(`Playing step ${this.currentStep}`);
    
    // Check each drum sound to see if it should play on this step
    DRUM_SOUNDS.forEach(sound => {
      const steps = this.pattern?.steps[sound.id];
      
      if (steps && steps[this.currentStep] && steps[this.currentStep].active) {
        console.log(`  -> Playing ${sound.name} on step ${this.currentStep}`);
        const player = this.players.get(sound.id);
        if (player) {
          // Make sure we're not still playing the previous trigger
          player.stop();
          player.start(time);
        } else {
          console.warn(`Player not found for sound: ${sound.id}`);
        }
      }
    });
    
    // Update the UI with current step
    if (this.stepCallback) {
      // Use setTimeout to ensure the UI update happens after the current stack resolves
      setTimeout(() => this.stepCallback && this.stepCallback(this.currentStep), 0);
    }
    
    // Move to the next step
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
    
    if (!this.pattern) {
      console.warn("No pattern loaded for playback");
      toast.warning("No pattern loaded. Please create a pattern first.");
      return;
    }
    
    try {
      // Ensure audio context is running
      if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("Tone.js context started:", Tone.context.state);
      }
      
      // Reset to first step when starting
      this.currentStep = 0;
      Tone.Transport.start();
      this.isPlaying = true;
      console.log("Sequencer started with pattern:", this.pattern);
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
        // Stop any previous playback to avoid overlaps
        player.stop();
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
