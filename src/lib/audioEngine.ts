import type { Section } from '../types';

// ADSR Envelope configuration for each section
interface ADSRConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

const ADSR_ENVELOPES: Record<Section, ADSRConfig> = {
  strings: { attack: 0.15, decay: 0.3, sustain: 0.7, release: 0.4 },
  brass: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.3 },
  winds: { attack: 0.08, decay: 0.25, sustain: 0.6, release: 0.35 },
  percussion: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.2 },
};

// Frequency ranges for each section (in Hz)
const SECTION_RANGES: Record<Section, { min: number; max: number; base: number }> = {
  strings: { min: 130, max: 880, base: 440 },    // A3 to A5
  brass: { min: 146, max: 698, base: 293.66 },   // D3 to F5
  winds: { min: 220, max: 880, base: 440 },      // A3 to A5
  percussion: { min: 60, max: 500, base: 100 },  // Low to mid
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sectionGains: Map<Section, GainNode> = new Map();

  async initialize(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      return;
    }

    this.ctx = new AudioContext();
    
    // Master chain
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(40, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    
    // Simple algorithmic reverb
    this.reverbNode = await this.createReverb();
    
    // Connect chain: Sections -> Reverb -> Compressor -> Master -> Destination
    this.reverbNode.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const sections: Section[] = ['strings', 'brass', 'winds', 'percussion'];
    sections.forEach((section) => {
      const gain = this.ctx!.createGain();
      gain.gain.value = 1;
      gain.connect(this.reverbNode!);
      this.sectionGains.set(section, gain);
    });
  }

  private async createReverb(): Promise<GainNode> {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    
    const input = this.ctx.createGain();
    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    
    dry.gain.value = 0.8;
    wet.gain.value = 0.4;
    
    // Create a very simple "space" using a short delay with feedback
    // In a real app, we'd use a ConvolverNode with an impulse response
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.05;
    
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.4;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    input.connect(dry);
    input.connect(delay);
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    feedback.connect(wet);
    
    const output = this.ctx.createGain();
    dry.connect(output);
    wet.connect(output);
    
    return output;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createStringTone(freq: number, time: number, dest: AudioNode): OscillatorNode[] {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    
    // Strings: Sawtooth with lowpass filter for warmth
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    // Add subtle detuned oscillator for richness
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 1.003; // Slight detune
    
    // Add subtle LFO for vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5.5; // 5.5Hz vibrato
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 2.0; // depth in Hz
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibratoGain.connect(osc2.frequency);
    vibrato.start(time);
    
    // Lowpass filter to soften the sawtooth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    filter.Q.value = 0.5;
    
    // Connect full graph to destination
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(dest);
    
    osc.start(time);
    osc2.start(time);
    
    return [osc, osc2, vibrato];
  }

  private createBrassTone(freq: number, time: number, dest: AudioNode): OscillatorNode[] {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    
    // Brass: Square wave with pulse width modulation effect
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    // Add second oscillator an octave lower for body
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 0.5;
    
    // Filter sweep for brass "blat"
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 0.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 4, time + 0.1);
    filter.Q.value = 4;
    
    // Connect full graph to destination
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(dest);
    
    osc.start(time);
    osc2.start(time);
    
    return [osc, osc2];
  }

  private createWindsTone(freq: number, time: number, dest: AudioNode): OscillatorNode[] {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    
    // Winds: Sine with subtle harmonics
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    // Vibrato for woodwinds
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 6.0;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 3.0;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(time);
    
    // Add subtle white noise for breathiness
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 1.0;
    
    noise.connect(noiseFilter);
    noiseFilter.connect(dest);
    noise.start(time);
    
    // Lowpass for breathy quality
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    
    osc.connect(filter);
    filter.connect(dest);
    
    osc.start(time);
    
    return [osc, vibrato, (noise as unknown as OscillatorNode)];
  }

  private createPercussionTone(freq: number, time: number, dest: AudioNode): { oscillators: OscillatorNode[]; noise: AudioBufferSourceNode | null } {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    
    // Percussion: Mix of noise and low sine
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    // Create noise buffer for percussion attack
    const bufferSize = this.ctx.sampleRate * 0.5; // 500ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Highpass filter for noise
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    
    // Connect noise through filter to destination
    noise.connect(noiseFilter);
    noiseFilter.connect(dest);
    noise.start(time);
    
    osc.connect(dest);
    osc.start(time);
    
    return { oscillators: [osc], noise };
  }

  private applyADSREnvelope(
    gainNode: GainNode,
    velocity: number,
    duration: number,
    adsr: ADSRConfig,
    time: number
  ): void {
    const peakGain = Math.min(1.0, velocity * 0.5);
    const sustainGain = peakGain * adsr.sustain;
    
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(peakGain, time + adsr.attack);
    gainNode.gain.exponentialRampToValueAtTime(sustainGain, time + adsr.attack + adsr.decay);
    gainNode.gain.setValueAtTime(sustainGain, time + duration - adsr.release);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
  }

  playNote(
    section: Section,
    frequency: number,
    duration: number,
    velocity: number,
    isDownbeat: boolean = false
  ): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const sectionGain = this.sectionGains.get(section);
    if (!sectionGain) return;

    // Clamp frequency to section range
    const range = SECTION_RANGES[section];
    const clampedFreq = Math.max(range.min, Math.min(range.max, frequency));

    // Apply downbeat boost
    const downbeatBoost = isDownbeat ? 1.3 : 1.0;
    const finalVelocity = Math.min(1.0, velocity * downbeatBoost);

    // Create note gain for ADSR
    const noteGain = this.ctx.createGain();
    noteGain.connect(sectionGain);

    let oscillators: OscillatorNode[] = [];

    if (section === 'percussion') {
      // Special handling for percussion
      const { oscillators: percOscs } = this.createPercussionTone(clampedFreq, now, noteGain);
      oscillators = percOscs;
      
      // Apply ADSR to the main note gain
      this.applyADSREnvelope(noteGain, finalVelocity, duration, ADSR_ENVELOPES.percussion, now);
    } else {
      // Create appropriate tone for section
      switch (section) {
        case 'strings':
          oscillators = this.createStringTone(clampedFreq, now, noteGain);
          break;
        case 'brass':
          oscillators = this.createBrassTone(clampedFreq, now, noteGain);
          break;
        case 'winds':
          oscillators = this.createWindsTone(clampedFreq, now, noteGain);
          break;
        default: {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = clampedFreq;
          osc.connect(noteGain);
          osc.start(now);
          oscillators = [osc];
          break;
      }
      }

      this.applyADSREnvelope(noteGain, finalVelocity, duration, ADSR_ENVELOPES[section], now);
    }

    // Stop all oscillators after the note duration
    const stopTime = now + duration + 0.3;
    oscillators.forEach(o => o.stop(stopTime));
  }

  // Legacy method for compatibility
  playSectionTone(section: Section, duration: number = 0.15): void {
    const baseFreq = SECTION_RANGES[section].base;
    this.playNote(section, baseFreq, duration, 0.5);
  }

  playDownbeatChord(): void {
    if (!this.ctx) return;

    // More musical chord voicing (A minor 7 add 9)
    const chordVoicing: { section: Section; freq: number; velocity: number }[] = [
      { section: 'strings', freq: 220.0, velocity: 0.6 },    // A3
      { section: 'brass', freq: 329.63, velocity: 0.5 },     // E4
      { section: 'winds', freq: 440.0, velocity: 0.55 },     // A4
      { section: 'percussion', freq: 110.0, velocity: 0.7 }, // A2 (bass)
    ];

    chordVoicing.forEach(({ section, freq, velocity }) => {
      this.playNote(section, freq, 1.0, velocity, true);
    });
  }

  setSectionVolume(section: Section, volume: number, time?: number): void {
    const gain = this.sectionGains.get(section);
    if (gain && this.ctx) {
      const targetTime = time ?? this.ctx.currentTime;
      gain.gain.setTargetAtTime(volume, targetTime, 0.1);
    }
  }

  setProminentSection(section: Section | null, time?: number): void {
    const sections: Section[] = ['strings', 'brass', 'winds', 'percussion'];
    const targetTime = time ?? this.ctx?.currentTime ?? 0;
    
    sections.forEach((s) => {
      const volume = s === section ? 1.8 : 0.4;
      this.setSectionVolume(s, volume, targetTime);
    });
  }

  resetSectionVolumes(time?: number): void {
    const sections: Section[] = ['strings', 'brass', 'winds', 'percussion'];
    const targetTime = time ?? this.ctx?.currentTime ?? 0;
    
    sections.forEach((s) => {
      this.setSectionVolume(s, 1.0, targetTime);
    });
  }

  get isInitialized(): boolean {
    return this.ctx !== null;
  }
}

export const audioEngine = new AudioEngine();
