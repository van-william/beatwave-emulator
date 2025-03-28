import * as Tone from 'tone';
import { DRUM_SOUNDS, TOTAL_STEPS } from './constants';
import { Pattern } from '../types';
import { toast } from 'sonner';
import * as lamejs from 'lamejs';

export class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;
  private currentStep = 0;
  private pattern: Pattern | null = null;
  private _isPlaying = false;
  
  private volumes: Map<string, Tone.Volume> = new Map();
  private panners: Map<string, Tone.Panner> = new Map();
  
  private stepCallback: ((step: number) => void) | null = null;
  private isLoadedCallback: (() => void) | null = null;
  private isLoaded = false;
  private soundsLoaded = 0;
  private totalSounds = DRUM_SOUNDS.length;

  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micDestination: MediaStreamAudioDestinationNode | null = null;

  constructor() {
    console.log('AudioEngine constructor called');
    this.initializeTone();
  }
  
  private async initializeTone() {
    try {
      console.log('Initializing Tone.js...');
      
      // Create a limiter to prevent clipping
      const limiter = new Tone.Limiter(-3).toDestination();
      
      // Reset sound loading counters
      this.soundsLoaded = 0;
      this.isLoaded = false;
      
      // Create synthesized sounds for each drum
      for (const sound of DRUM_SOUNDS) {
        try {
          console.log(`Setting up sound: ${sound.name}`);
          
          // Create volume and panner nodes for each sound
          const volume = new Tone.Volume(0);
          const panner = new Tone.Panner(0);
          
          // Create a buffer for the synthesized sound
          const buffer = Tone.context.createBuffer(2, 44100, 44100);
          
          // Create more distinct synthesized sounds based on instrument type
          for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            
            // Apply different sound characteristics based on instrument type
            if (sound.id.includes('kick')) {
              // More authentic kick drum sound
              for (let i = 0; i < 44100; i++) {
                // Pitch sweep
                const sweep = Math.exp(-i / 1000);
                // Low frequency component
                const lowFreq = Math.sin(i * 0.05) * sweep;
                // High frequency component
                const highFreq = Math.sin(i * 0.2) * sweep * 0.5;
                // Noise component
                const noise = (Math.random() * 2 - 1) * sweep * 0.3;
                channelData[i] = (lowFreq + highFreq + noise) * 0.8;
              }
            } else if (sound.id.includes('snare')) {
              // More authentic snare sound
              for (let i = 0; i < 44100; i++) {
                // Body
                const body = Math.sin(i * 0.15) * Math.exp(-i / 2000);
                // Noise component
                const noise = (Math.random() * 2 - 1) * Math.exp(-i / 800);
                // High frequency component
                const highFreq = Math.sin(i * 0.4) * Math.exp(-i / 500);
                channelData[i] = (body + noise + highFreq) * 0.7;
              }
            } else if (sound.id.includes('clap')) {
              // More authentic clap sound
              for (let i = 0; i < 44100; i++) {
                // Multiple noise components with different decay rates
                const noise1 = (Math.random() * 2 - 1) * Math.exp(-i / 400);
                const noise2 = (Math.random() * 2 - 1) * Math.exp(-i / 800);
                const noise3 = (Math.random() * 2 - 1) * Math.exp(-i / 1200);
                channelData[i] = (noise1 + noise2 + noise3) * 0.6;
              }
            } else if (sound.id.includes('hat') || sound.id.includes('cymbal')) {
              // More authentic hi-hat/cymbal sound
              for (let i = 0; i < 44100; i++) {
                // Multiple noise components with different frequencies
                const noise1 = (Math.random() * 2 - 1) * Math.exp(-i / (sound.id.includes('open') ? 4000 : 800));
                const noise2 = (Math.random() * 2 - 1) * Math.exp(-i / (sound.id.includes('open') ? 6000 : 1200));
                const noise3 = (Math.random() * 2 - 1) * Math.exp(-i / (sound.id.includes('open') ? 8000 : 1600));
                channelData[i] = (noise1 + noise2 + noise3) * 0.5;
              }
            } else if (sound.id.includes('tom')) {
              // More authentic tom sound
              for (let i = 0; i < 44100; i++) {
                const env = Math.exp(-i / 1500);
                // Adjust frequency based on tom type (low/mid/high)
                const freq = sound.id.includes('low') ? 0.1 : 
                            sound.id.includes('mid') ? 0.15 : 0.2;
                // Add some noise for texture
                const noise = (Math.random() * 2 - 1) * env * 0.3;
                channelData[i] = (Math.sin(i * freq) * env + noise) * 0.7;
              }
            } else if (sound.id.includes('cowbell')) {
              // More authentic cowbell sound
              for (let i = 0; i < 44100; i++) {
                const env = Math.exp(-i / 1000);
                // Multiple frequencies for metallic sound
                const freq1 = Math.sin(i * 0.3) * env;
                const freq2 = Math.sin(i * 0.5) * env * 0.5;
                const freq3 = Math.sin(i * 0.7) * env * 0.3;
                channelData[i] = (freq1 + freq2 + freq3) * 0.6;
              }
            } else {
              // Default percussive sound for other instruments
              for (let i = 0; i < 44100; i++) {
                const env = Math.exp(-i / 2000);
                // Multiple frequencies for richer sound
                const freq1 = Math.sin(i * 0.15) * env;
                const freq2 = Math.sin(i * 0.3) * env * 0.5;
                const noise = (Math.random() * 2 - 1) * env * 0.3;
                channelData[i] = (freq1 + freq2 + noise) * 0.6;
              }
            }
          }
          
          // Create a player with the synthesized buffer
          const player = new Tone.Player(new Tone.ToneAudioBuffer(buffer)).connect(volume);
          
          // Connect the volume to the panner, and the panner to the limiter
          volume.connect(panner);
          panner.connect(limiter);
          
          // Store the nodes
          this.volumes.set(sound.id, volume);
          this.panners.set(sound.id, panner);
          this.players.set(sound.id, player);
          
          console.log(`Set up audio pipeline for ${sound.id}`);
          this.soundsLoaded++;
          
          if (this.soundsLoaded === this.totalSounds) {
            console.log('All sounds initialized successfully!');
            this.isLoaded = true;
            
            if (this.isLoadedCallback) {
              this.isLoadedCallback();
            }
          }
        } catch (error) {
          console.error(`Error setting up sound ${sound.name}:`, error);
        }
      }
      
      // Set up the main sequencer
      Tone.Transport.scheduleRepeat((time) => {
        this.playCurrentStep(time);
      }, '16n');
      
      // Set default BPM
      Tone.Transport.bpm.value = 120;
      
      console.log('Tone.js initialization complete');
      
    } catch (error) {
      console.error('Error initializing audio engine:', error);
      toast.error('Failed to initialize audio engine. Please refresh the page.');
      throw error;
    }
  }
  
  private playCurrentStep(time: number) {
    if (!this.pattern) {
      console.warn("No pattern loaded for playback");
      return;
    }
    
    // Check each drum sound to see if it should play on this step
    DRUM_SOUNDS.forEach(sound => {
      const steps = this.pattern?.steps[sound.id];
      
      if (steps && steps[this.currentStep] && steps[this.currentStep].active) {
        const player = this.players.get(sound.id);
        if (player) {
          // Make sure we're not still playing the previous trigger
          player.stop();
          player.start(time);
        }
      }
    });
    
    // Update the UI with current step
    if (this.stepCallback) {
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
    try {
      // Store current playback state
      const wasPlaying = this._isPlaying;
      
      // Update pattern
      this.pattern = pattern;
      
      // Update BPM if it changed
      if (pattern.bpm !== Tone.Transport.bpm.value) {
        if (wasPlaying) {
          Tone.Transport.bpm.rampTo(pattern.bpm, 0.1);
        } else {
          Tone.Transport.bpm.value = pattern.bpm;
        }
      }
      
      // If we were playing, ensure we stay playing
      if (wasPlaying && Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
    } catch (error) {
      console.error('Error updating pattern:', error);
      toast.error('Failed to update pattern');
    }
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
      }
      
      // Reset to first step when starting
      this.currentStep = 0;
      Tone.Transport.start();
      this._isPlaying = true;
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
    this._isPlaying = false;
  }
  
  public get isPlaying(): boolean {
    return this._isPlaying;
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
    try {
      if (this._isPlaying) {
        // Use rampTo for smooth transitions when playing
        Tone.Transport.bpm.rampTo(bpm, 0.1);
      } else {
        // Set immediately if not playing
        Tone.Transport.bpm.value = bpm;
      }
      
      // Update pattern BPM if it exists
      if (this.pattern) {
        this.pattern.bpm = bpm;
      }
    } catch (error) {
      console.error('Error setting BPM:', error);
      toast.error('Failed to update BPM');
    }
  }
  
  public getCurrentBpm(): number {
    return Tone.Transport.bpm.value;
  }
  
  public async startRecording(includeMic: boolean = false) {
    if (!this.isRecording) {
      try {
        // Create a MediaStreamDestination to capture the audio output
        const destination = Tone.context.createMediaStreamDestination();
        
        // Connect all players to the destination
        this.players.forEach(player => {
          player.connect(destination);
        });

        // If microphone is enabled, get the mic stream and mix it with the output
        if (includeMic) {
          try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micSource = Tone.context.createMediaStreamSource(this.micStream);
            this.micDestination = Tone.context.createMediaStreamDestination();
            
            // Connect mic to destination
            this.micSource.connect(this.micDestination);
            
            // Mix mic with TR-808 output
            const mixer = Tone.context.createGain();
            mixer.gain.value = 0.5; // Reduce mic volume to 50%
            this.micSource.connect(mixer);
            mixer.connect(destination);
          } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Failed to access microphone');
            return;
          }
        }
        
        // Create a MediaRecorder that captures the audio output
        this.chunks = [];
        this.recorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        this.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.chunks.push(e.data);
          }
        };
        
        // Start recording
        this.recorder.start();
        this.isRecording = true;
        toast.success('Audio recording started');
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error('Failed to start recording');
      }
    }
  }
  
  public async stopRecording() {
    if (this.recorder && this.isRecording) {
      return new Promise<void>((resolve) => {
        this.recorder!.onstop = async () => {
          try {
            const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
            
            // Create download link
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TR808-Recording-${new Date().toISOString().slice(0, 10)}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Cleanup
            URL.revokeObjectURL(url);
            toast.success('Recording saved!');
          } catch (error) {
            console.error('Error saving recording:', error);
            toast.error('Failed to save recording');
          } finally {
            // Cleanup microphone resources
            if (this.micStream) {
              this.micStream.getTracks().forEach(track => track.stop());
              this.micStream = null;
            }
            if (this.micSource) {
              this.micSource.disconnect();
              this.micSource = null;
            }
            if (this.micDestination) {
              this.micDestination.disconnect();
              this.micDestination = null;
            }
            
            this.isRecording = false;
            this.chunks = [];
            this.recorder = null;
            resolve();
          }
        };
        
        this.recorder.stop();
      });
    }
  }
  
  public async exportPattern(pattern: Pattern) {
    try {
      // Create a buffer for the pattern
      const buffer = await this.recordPattern(pattern);
      
      // Convert to WAV
      const wavBlob = await this.audioBufferToWav(buffer);
      
      // Create download link
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TR808-Pattern-${pattern.name || 'Untitled'}.wav`;
      a.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
      toast.success('Pattern exported successfully');
    } catch (error) {
      console.error('Error exporting pattern:', error);
      toast.error('Failed to export pattern');
    }
  }
  
  private async recordPattern(pattern: Pattern): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create offline context for recording
        const offlineContext = new OfflineAudioContext(2, 44100 * 4, 44100);
        
        // Create a buffer for the pattern
        const buffer = offlineContext.createBuffer(2, 44100 * 4, 44100);
        
        // Schedule pattern playback
        const stepDuration = 60 / pattern.bpm / 4; // 16th note duration
        
        for (let step = 0; step < 16; step++) {
          const time = step * stepDuration;
          
          // Check each drum sound
          DRUM_SOUNDS.forEach(sound => {
            const steps = pattern.steps[sound.id];
            if (steps && steps[step] && steps[step].active) {
              const player = this.players.get(sound.id);
              if (player) {
                player.start(time);
              }
            }
          });
        }
        
        // Render the pattern
        offlineContext.startRendering().then(renderedBuffer => {
          resolve(renderedBuffer);
        }).catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    return new Promise((resolve) => {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1;
      const bitDepth = 16;
      
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;
      
      const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
      const view = new DataView(wav);
      
      // Write WAV header
      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + buffer.length * blockAlign, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, buffer.length * blockAlign, true);
      
      // Write audio data
      const offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), sample * 0x7FFF, true);
        }
      }
      
      resolve(new Blob([wav], { type: 'audio/wav' }));
    });
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
      }
    }
  }
}

// Create a singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;
