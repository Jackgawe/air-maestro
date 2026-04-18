import { useEffect, useRef, useCallback } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

interface UseMediaPipeOptions {
  onResults: (results: HandLandmarkerResult) => void;
  enabled: boolean;
}

export function useMediaPipe({ onResults, enabled }: UseMediaPipeOptions) {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultsRef = useRef(onResults);
  const detectFrameRef = useRef<() => void>(() => {});

  // Keep onResultsRef up to date
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  const initialize = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
    );

    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2, // Track both hands for dual-hand operation
    });
  }, []);

  const detectFrame = useCallback(() => {
    if (!videoRef.current || !handLandmarkerRef.current) return;

    const results = handLandmarkerRef.current.detectForVideo(
      videoRef.current,
      performance.now()
    );

    onResultsRef.current(results);
    rafRef.current = requestAnimationFrame(() => detectFrameRef.current?.());
  }, []);

  // Store detectFrame in ref to avoid circular dependency
  useEffect(() => {
    detectFrameRef.current = detectFrame;
  }, [detectFrame]);

  const startCamera = useCallback(async () => {
    if (!handLandmarkerRef.current) {
      await initialize();
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        // Start detection loop
        detectFrame();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, [initialize, detectFrame]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  return { videoRef, startCamera, stopCamera };
}
