import type { Section, DualHandState } from '../types';
import { getSectionFromX } from './coords';

export class DualHandGestureMachine {
  private state: DualHandState = {
    pointingHand: { present: false, x: 0.5, y: 0.5, section: null },
    conductingHand: { present: false, x: 0.5, y: 0.5, isPinching: false, isFist: false, velocity: 0 },
    isConducting: false,
  };
  
  private onStateChange?: (state: DualHandState) => void;
  private onDownbeat?: () => void;
  private onFist?: (isFist: boolean) => void;
  private wasPinching: boolean = false;
  private wasFist: boolean = false;

  constructor(options: {
    onStateChange?: (state: DualHandState) => void;
    onDownbeat?: () => void;
    onFist?: (isFist: boolean) => void;
  } = {}) {
    this.onStateChange = options.onStateChange;
    this.onDownbeat = options.onDownbeat;
    this.onFist = options.onFist;
  }

  update(
    pointingHand: { present: boolean; x: number; y: number } | null,
    conductingHand: { present: boolean; x: number; y: number; isPinching: boolean; isFist: boolean; velocity: number } | null
  ): void {
    const prevState = { ...this.state };

    // Update pointing hand (left hand - controls section selection)
    if (pointingHand) {
      this.state.pointingHand = {
        present: pointingHand.present,
        x: pointingHand.x,
        y: pointingHand.y,
        section: pointingHand.present ? getSectionFromX(pointingHand.x) : null,
      };
    } else {
      this.state.pointingHand = { present: false, x: 0.5, y: 0.5, section: null };
    }

    // Update conducting hand (right hand - controls playback)
    if (conductingHand) {
      this.state.conductingHand = {
        present: conductingHand.present,
        x: conductingHand.x,
        y: conductingHand.y,
        isPinching: conductingHand.isPinching,
        isFist: conductingHand.isFist,
        velocity: conductingHand.velocity,
      };

      // Detect fist gesture
      if (conductingHand.isFist && !this.wasFist) {
        this.onFist?.(true);
      } else if (!conductingHand.isFist && this.wasFist) {
        this.onFist?.(false);
      }

      // Detect pinch for downbeat
      if (conductingHand.isPinching && !this.wasPinching) {
        this.onDownbeat?.();
      }

      this.wasPinching = conductingHand.isPinching;
      this.wasFist = conductingHand.isFist;
    } else {
      this.state.conductingHand = { present: false, x: 0.5, y: 0.5, isPinching: false, isFist: false, velocity: 0 };
    }

    // Is conducting only when conducting hand is present and pinching
    this.state.isConducting = 
      this.state.conductingHand.present && 
      this.state.conductingHand.isPinching &&
      !this.state.conductingHand.isFist;

    // Notify if state changed
    if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
      this.onStateChange?.(this.state);
    }
  }

  getState(): DualHandState {
    return { ...this.state };
  }

  get selectedSection(): Section | null {
    return this.state.pointingHand.section;
  }

  get isConducting(): boolean {
    return this.state.isConducting;
  }

  get conductingHandY(): number {
    return this.state.conductingHand.y;
  }

  get conductingHandVelocity(): number {
    return this.state.conductingHand.velocity;
  }

  get isFist(): boolean {
    return this.state.conductingHand.isFist;
  }
}

export function createDualHandGestureMachine(options?: {
  onStateChange?: (state: DualHandState) => void;
  onDownbeat?: () => void;
  onFist?: (isFist: boolean) => void;
}): DualHandGestureMachine {
  return new DualHandGestureMachine(options);
}
