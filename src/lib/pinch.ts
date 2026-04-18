import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const PINCH_THRESHOLD = 0.05;

export function calculateDistance(
  a: NormalizedLandmark,
  b: NormalizedLandmark
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function isPinching(
  landmarks: NormalizedLandmark[],
  threshold: number = PINCH_THRESHOLD
): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = calculateDistance(thumbTip, indexTip);
  return distance < threshold;
}

export function getPinchStrength(
  landmarks: NormalizedLandmark[]
): number {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distance = calculateDistance(thumbTip, indexTip);
  return Math.max(0, 1 - distance / PINCH_THRESHOLD);
}
