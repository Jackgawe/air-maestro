// Coordinate utilities for hand tracking

const SMOOTHING_ALPHA = 0.15;
const VELOCITY_WINDOW = 5;

export interface Coordinates {
  x: number;
  y: number;
}

export interface VelocityTracker {
  velocity: number;
  addPosition: (x: number, y: number, timestamp: number) => void;
}

export function mirrorAndNormalize(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number
): Coordinates {
  const normalizedX = x / videoWidth;
  const normalizedY = y / videoHeight;
  return {
    x: 1 - normalizedX,
    y: normalizedY,
  };
}

export function exponentialSmooth(
  current: number,
  previous: number,
  alpha: number = SMOOTHING_ALPHA
): number {
  return alpha * current + (1 - alpha) * previous;
}

export function smoothCoordinates(
  current: Coordinates,
  previous: Coordinates | null,
  alpha: number = SMOOTHING_ALPHA
): Coordinates {
  if (!previous) return current;
  return {
    x: exponentialSmooth(current.x, previous.x, alpha),
    y: exponentialSmooth(current.y, previous.y, alpha),
  };
}

export function calculateVelocity(
  current: Coordinates,
  previous: Coordinates,
  deltaTime: number
): number {
  if (deltaTime === 0) return 0;
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance / deltaTime;
}

export function coordsToScreen(
  coords: Coordinates,
  screenWidth: number,
  screenHeight: number
): Coordinates {
  return {
    x: coords.x * screenWidth,
    y: coords.y * screenHeight,
  };
}

export function getSectionFromX(x: number): import('../types').Section {
  if (x < 0.25) return 'strings';
  if (x < 0.5) return 'winds';
  if (x < 0.75) return 'brass';
  return 'percussion';
}

// Velocity tracking for dynamics
interface PositionSample {
  x: number;
  y: number;
  timestamp: number;
}

export function createVelocityTracker(): VelocityTracker {
  const samples: PositionSample[] = [];
  
  return {
    velocity: 0,
    addPosition(x: number, y: number, timestamp: number) {
      samples.push({ x, y, timestamp });
      
      if (samples.length > VELOCITY_WINDOW) {
        samples.shift();
      }
      
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = last.timestamp - first.timestamp;
        
        if (dt > 0) {
          const dx = last.x - first.x;
          const dy = last.y - first.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          this.velocity = distance / dt * 1000; // pixels per second
        }
      }
    }
  };
}
