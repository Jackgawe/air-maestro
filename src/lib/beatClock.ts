import type { BeatClockConfig } from '../types';

const MIN_BPM = 40;
const MAX_BPM = 200;

export class BeatClock {
  private bpm: number = 120;
  private isRunning: boolean = false;
  private lastBeatTime: number = 0;
  private beatCount: number = 0;
  private rafId: number | null = null;
  private onBeat?: (beat: number) => void;
  private onDownbeat?: () => void;

  constructor(config: BeatClockConfig = { bpm: 120 }) {
    this.bpm = config.bpm;
    this.onBeat = config.onBeat;
    this.onDownbeat = config.onDownbeat;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastBeatTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const beatInterval = this.getBeatInterval();

    if (now - this.lastBeatTime >= beatInterval) {
      this.beatCount++;
      const isDownbeat = this.beatCount % 4 === 1;

      if (this.onBeat) {
        this.onBeat(this.beatCount);
      }

      if (isDownbeat && this.onDownbeat) {
        this.onDownbeat();
      }

      this.lastBeatTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  setBpm(bpm: number): void {
    this.bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  }

  getBpmFromY(y: number): number {
    const normalizedY = Math.max(0, Math.min(1, y));
    return MIN_BPM + (1 - normalizedY) * (MAX_BPM - MIN_BPM);
  }

  getBeatInterval(): number {
    return (60 / this.bpm) * 1000;
  }

  get currentBpm(): number {
    return this.bpm;
  }

  get isActive(): boolean {
    return this.isRunning;
  }
}

export function createBeatClock(config: BeatClockConfig): BeatClock {
  return new BeatClock(config);
}
