import { useEffect, useRef, useCallback, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

interface UseMediaPipeOptions {
  onResults: (results: HandLandmarkerResult) => void;
  enabled: boolean;
  deviceId?: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export function useMediaPipe({ onResults, enabled, deviceId }: UseMediaPipeOptions) {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onResultsRef = useRef(onResults);
  const detectFrameRef = useRef<() => void>(() => {});
  const isSettingUpRef = useRef(false);
  const activeStreamRef = useRef<MediaStream | null>(null); // Ref to hold the active stream tracks
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);

  // Keep onResultsRef up to date
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Enumerate available cameras
  useEffect(() => {
    const getCameras = async () => {
      let permissionStream: MediaStream | undefined;
      try {
        // Request permission first to get labeled devices
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
          }));
        setCameras(videoDevices);
      } catch (error) {
        console.error('Error enumerating cameras:', error);
      } finally {
        // Ensure we clean up the permission stream to avoid keeping camera active
        if (permissionStream) {
          permissionStream.getTracks().forEach((track) => track.stop());
        }
      }
    };

    getCameras();
  }, []);

  const initialize = useCallback(async () => {
    if (handLandmarkerRef.current) return;
    
    try {
      console.log('useMediaPipe: Initializing HandLandmarker...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      console.log('useMediaPipe: HandLandmarker initialized successfully');
    } catch (error) {
      console.error('useMediaPipe: Failed to initialize HandLandmarker:', error);
    }
  }, []);

  const detectFrame = useCallback(() => {
    if (!videoRef.current || !handLandmarkerRef.current || videoRef.current.paused || videoRef.current.ended) {
      if (videoRef.current?.paused) console.log('useMediaPipe: Detection skipped (video paused)');
      return;
    }

    try {
      const results = handLandmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      );
      
      if (results.landmarks.length > 0) {
        console.log(`MediaPipe: Detected ${results.landmarks.length} hand(s)`);
      }
      
      onResultsRef.current(results);
    } catch (error) {
      console.error('useMediaPipe: Detection error:', error);
    }

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
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      };

      console.log('useMediaPipe: Requesting camera access...');
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('useMediaPipe: Camera access granted, stream ID:', newStream.id);

      // Stop previous tracks using ref to avoid depending on `stream` state
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      activeStreamRef.current = newStream;
      setStream(newStream);
    } catch (error) {
      console.error('useMediaPipe: Error accessing camera:', error);
    }
  }, [initialize, deviceId]);

  // Effect to handle video element setup and start detection when stream is available
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    let isActive = true;
    const video = videoRef.current;

    const setupVideoAndStartDetection = async () => {
      try {
        video.srcObject = stream;
        
        // Wait for metadata if not already loaded
        if (video.readyState < 1) { // 1 = HAVE_METADATA
          await new Promise<void>((resolve) => {
            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            };
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            // Timeout as fallback
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            }, 1000);
          });
        }

        if (!isActive) return;

        await video.play();
        console.log('useMediaPipe: Video playing, starting detection');
        detectFrameRef.current?.();
      } catch (error) {
        console.warn('useMediaPipe: Video setup failed:', error);
      }
    };

    setupVideoAndStartDetection();

    return () => {
      isActive = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    
    setStream(null);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []); // No dependencies! Stable.

  useEffect(() => {
    let isMounted = true;
    
    const setupCamera = async () => {
      if (isSettingUpRef.current) return;
      isSettingUpRef.current = true;
      
      try {
        if (enabled && isMounted) {
          await startCamera();
        } else if (!enabled) {
          stopCamera();
        }
      } finally {
        isSettingUpRef.current = false;
      }
    };
    
    setupCamera();
    
    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  return { videoRef, stream, cameras, startCamera, stopCamera };
}
