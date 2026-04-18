import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export function isFist(landmarks: NormalizedLandmark[]): boolean {
  const wrist = landmarks[0];
  const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  const bases = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

  let curledFingers = 0;
  for (let i = 0; i < 4; i++) {
    const tipToWrist = distance(tips[i], wrist);
    const baseToWrist = distance(bases[i], wrist);
    if (tipToWrist < baseToWrist * 1.2) {
      curledFingers++;
    }
  }

  return curledFingers >= 3;
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
