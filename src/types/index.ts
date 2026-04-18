export type Section = 'strings' | 'brass' | 'winds' | 'percussion';

export interface MusicianData {
  id: string;
  section: Section;
  position: { x: number; y: number };
  color: string;
}

export interface HandData {
  x: number;
  y: number;
  velocity: number;
  isPinching: boolean;
}

export interface AnimationState {
  playing: boolean;
  swaying: boolean;
  activeSection: Section | null;
  downbeat: boolean;
}

export interface AudioConfig {
  waveforms: Record<Section, OscillatorType>;
  frequencies: Record<Section, number[]>;
}

export interface BeatClockConfig {
  bpm: number;
  onBeat?: (beat: number) => void;
  onDownbeat?: () => void;
}

export interface GestureState {
  state: 'idle' | 'conducting' | 'pinching' | 'fist';
  section: Section | null;
  handPresent: boolean;
}

export interface DualHandState {
  pointingHand: {
    present: boolean;
    x: number;
    y: number;
    section: Section | null;
  };
  conductingHand: {
    present: boolean;
    x: number;
    y: number;
    isPinching: boolean;
    isFist: boolean;
    velocity: number;
  };
  isConducting: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}
