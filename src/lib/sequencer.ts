import type { Section } from '../types';
import type { Note } from './mountainKing';
import { audioEngine } from './audioEngine';

const SCHEDULE_AHEAD_TIME = 0.1; // 100ms lookahead
const SCHEDULE_INTERVAL = 0.05; // 50ms scheduling interval

interface SequencerOptions {
  onNotePlay?: (section: Section, intensity: number) => void;
  onLoopComplete?: (loopCount: number) => void;
}

export class Sequencer {
  private notes: Note[];
  private currentIndex = 0;
  private bpm = 120;
  private isPlaying = false;
  private nextNoteTime = 0;
  private timerID: number | null = null;
  private loopCount = 0;
  private options: SequencerOptions;
  private isFist = false;
  private prominentSection: Section | null = null;
  private handVelocity = 0;
  private isDownbeat = false;

  constructor(notes: Note[], options: SequencerOptions = {}) {
    this.notes = notes;
    this.options = options;
  }

  start(): void {
    if (this.isPlaying) return;
    if (!audioEngine.isInitialized) return;

    this.isPlaying = true;
    this.currentIndex = 0;
    this.nextNoteTime = audioEngine['ctx']!.currentTime + 0.1;
    this.scheduler();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler(): void {
    if (!this.isPlaying) return;

    const ctx = audioEngine['ctx'];
    if (!ctx) return;

    // Schedule notes ahead
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      if (this.isFist) {
        // Pause scheduling while fist is held
        this.nextNoteTime = ctx.currentTime + 0.1;
        break;
      }

      this.scheduleNote(this.nextNoteTime);
      this.advanceNote();
    }

    this.timerID = window.setTimeout(() => this.scheduler(), SCHEDULE_INTERVAL * 1000);
  }

  private scheduleNote(time: number): void {
    if (this.currentIndex >= this.notes.length) return;

    const note = this.notes[this.currentIndex];
    
    // Calculate note duration based on BPM
    const beatDuration = 60 / this.bpm;
    const noteDuration = note.duration * beatDuration;

    // Apply velocity-based dynamics
    const velocityMultiplier = Math.min(2.0, 0.5 + this.handVelocity / 500);
    const finalVelocity = Math.min(1.0, note.velocity * velocityMultiplier);

    // Set section prominence before playing
    if (this.prominentSection) {
      audioEngine.setProminentSection(this.prominentSection, time);
    } else {
      audioEngine.resetSectionVolumes(time);
    }

    // Play the note
    audioEngine.playNote(
      note.section,
      note.freq,
      noteDuration * 0.9, // Slight gap between notes
      finalVelocity,
      this.isDownbeat
    );

    // Trigger animation callback
    this.options.onNotePlay?.(note.section, finalVelocity);

    // Reset downbeat flag
    this.isDownbeat = false;
  }

  private advanceNote(): void {
    const note = this.notes[this.currentIndex];
    const beatDuration = 60 / this.bpm;
    this.nextNoteTime += note.duration * beatDuration;

    this.currentIndex++;

    // Loop complete
    if (this.currentIndex >= this.notes.length) {
      this.currentIndex = 0;
      this.loopCount++;
      
      // Speed up slightly each loop (cap at max BPM)
      const speedupFactor = Math.min(1.3, 1 + this.loopCount * 0.1);
      const newBpm = Math.min(200, 120 * speedupFactor);
      this.setBpm(newBpm);
      
      this.options.onLoopComplete?.(this.loopCount);
    }
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(200, bpm));
  }

  getBpmFromY(y: number): number {
    const normalizedY = Math.max(0, Math.min(1, y));
    return 40 + (1 - normalizedY) * 160;
  }

  setFist(isFist: boolean): void {
    this.isFist = isFist;
  }

  setProminentSection(section: Section | null): void {
    this.prominentSection = section;
  }

  setHandVelocity(velocity: number): void {
    this.handVelocity = velocity;
  }

  triggerDownbeat(): void {
    this.isDownbeat = true;
  }

  get currentBpm(): number {
    return this.bpm;
  }

  get progress(): number {
    return this.currentIndex / this.notes.length;
  }

  get currentLoop(): number {
    return this.loopCount;
  }

  get isRunning(): boolean {
    return this.isPlaying;
  }
}
