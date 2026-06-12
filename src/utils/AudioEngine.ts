import { SongBlueprint } from '../types/game';

// Frequency table for notes in Octaves 2-5
const NOTE_FREQS: Record<string, number> = {
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private currentSong: SongBlueprint | null = null;
  
  // Scheduler variables
  private schedulerTimer: number | null = null;
  private nextNoteTime: number = 0.0;
  private currentBeatIndex: number = 0;
  private lookahead: number = 25.0; // milliseconds
  private scheduleAheadTime: number = 0.1; // seconds

  // Customizer Volume Control
  private masterGainNode: GainNode | null = null;

  constructor() {
    // We defer context creation until user tap to play nicely with Chrome/Safari mobile auto-block policy
  }

  // Initialized on User Gesture (Start Game / Play Song)
  public async init() {
    if (this.ctx) return;
    
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create master gain
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.value = 0.5; // default comfortable volume
    this.masterGainNode.connect(this.ctx.destination);

    this.createNoiseBuffer();
    
    // Resume context if suspended (crucial for iOS)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Pre-generates random white noise for hi-hats and snares
  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // Synthesize a retro heavy Kick Drum
  private playKick(time: number) {
    if (!this.ctx || !this.masterGainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGainNode);

    // Rapid frequency sweep downwards from 150Hz to 0.01Hz to simulate a drum head transient
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    // Snappy volume envelope
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Synthesize a retro snare / clap
  private playSnare(time: number) {
    if (!this.ctx || !this.noiseBuffer || !this.masterGainNode) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000; // mid frequency snare slap

    const gain = this.ctx.createGain();

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGainNode);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noiseSource.start(time);
    noiseSource.stop(time + 0.15);
  }

  // Synthesize a hi-hat or mat-squeak sound
  private playHiHat(time: number, isSqueak: boolean = false) {
    if (!this.ctx || !this.noiseBuffer || !this.masterGainNode) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = isSqueak ? 6000 : 9000; // higher freq for hats, lower metal/squeak

    const gain = this.ctx.createGain();

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGainNode);

    const volume = isSqueak ? 0.15 : 0.2;
    const decay = isSqueak ? 0.08 : 0.04;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + decay);

    noiseSource.start(time);
    noiseSource.stop(time + decay);
  }

  // Synthesize a groovy Bass Note
  private playBass(time: number, noteName: string, duration: number) {
    if (!this.ctx || !this.masterGainNode) return;

    const freq = NOTE_FREQS[noteName] || 65.41; // Fallback to C2
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + 0.1); // subtle filter sweep

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGainNode);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.02);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Synthesize a singing Lead Melody Note
  private playLead(time: number, noteName: string, duration: number) {
    if (!this.ctx || !this.masterGainNode) return;

    const freq = NOTE_FREQS[noteName] || 261.63; // Fallback to C4
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // smooth chip-tune feel
    osc.frequency.setValueAtTime(freq, time);
    
    // Add slide/vibrato
    osc.frequency.linearRampToValueAtTime(freq + 4, time + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(freq - 4, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGainNode);

    gain.gain.setValueAtTime(0.25, time);
    // Smooth release envelope
    gain.gain.linearRampToValueAtTime(0.2, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Advance to the next sequencer beat
  private nextBeat() {
    const secondsPerBeat = 60.0 / this.bpm;
    const subdivision = 0.25; // 16th notes
    this.nextNoteTime += subdivision * secondsPerBeat;

    this.currentBeatIndex = this.currentBeatIndex + 1; // grow indefinitely to play long songs
  }

  // Scheduled sequencer beats inside lookahead window
  private scheduleNote(beatIndex: number, time: number) {
    if (!this.currentSong) return;

    const notesCount = this.currentSong.bassNotes.length;
    const bassNote = this.currentSong.bassNotes[beatIndex % notesCount];
    const leadNote = this.currentSong.leadNotes[(beatIndex + 3) % notesCount];

    // 16-step grid
    const step = beatIndex % 16;

    // Standard Rhythm Patterns:
    // 1. Kick on 1, 5, 9, 13 (four on the floor)
    if (step === 0 || step === 4 || step === 8 || step === 12) {
      this.playKick(time);
    }

    // 2. Snare on 4, 12
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // 3. HiHats on offbeats (or dynamic mat squeaks!)
    if (step % 2 === 1) {
      this.playHiHat(time, step === 7 || step === 15);
    }

    // 4. Bassline pattern
    if (step % 2 === 0) {
      this.playBass(time, bassNote, (60 / this.bpm) * 0.5);
    }

    // 5. Lead melody on alternate intervals
    if (step % 4 === 2) {
      this.playLead(time, leadNote, (60 / this.bpm) * 0.4);
    }
  }

  // Timer loop that runs the advanced Web Audio scheduler
  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeatIndex, this.nextNoteTime);
      this.nextBeat();
    }
  }

  // Begins song synthesizer playback
  public play(song: SongBlueprint) {
    if (this.isPlaying) return;
    this.currentSong = song;
    this.bpm = song.bpm;
    this.isPlaying = true;

    if (!this.ctx) return;
    
    this.startTime = this.ctx.currentTime;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.currentBeatIndex = 0;

    // Start timer interval (using window.setInterval which runs safely on main thread)
    this.schedulerTimer = window.setInterval(() => this.scheduler(), this.lookahead);
  }

  // Stops song synthesizer
  public stop() {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.currentSong = null;
  }

  // Returns current precise duration in seconds
  public getCurrentTime(calibrationOffsetMs: number = 0): number {
    if (!this.ctx || !this.isPlaying) return 0;
    const time = this.ctx.currentTime - this.startTime;
    return time + (calibrationOffsetMs / 1000);
  }

  // Plays clean sound effects instantly
  public playSFX(type: 'oss' | 'good' | 'meh' | 'miss' | 'tap' | 'strain' | 'sweep') {
    if (!this.ctx || !this.masterGainNode) return;
    const now = this.ctx.currentTime;

    if (type === 'oss') {
      // Super sparkling arpeggiated triple-beep representing "OSS!"
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.04);
      osc.frequency.setValueAtTime(1760, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'good') {
      // Crisp clear standard chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'meh') {
      // Lower tone short chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'miss') {
      // Low friction detune buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'tap') {
      // Frantic high alarm dual-beep representing a BJJ choke tap out
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGainNode);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(1000, now);
      osc2.frequency.setValueAtTime(1500, now);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } else if (type === 'strain') {
      // Low sliding sound indicating muscle strain/struggle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'sweep') {
      // Swishing sound for sweeps or hips escapes
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  // Speaks dojo feedback (Dynamic Coach commentary) using Web Speech API
  public speakCoach(text: string) {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current coach talking first to prevent overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.6;
    utterance.rate = 1.2; // slightly fast and energetic
    utterance.pitch = 0.85; // solid martial arts guru pitch

    // Try to find a cool english sounding voice
    const voices = window.speechSynthesis.getVoices();
    const goodVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || 
                      voices.find(v => v.lang.includes('en'));
    if (goodVoice) {
      utterance.voice = goodVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

// Export single shared engine instance for the app context
export const audio = new AudioEngine();
