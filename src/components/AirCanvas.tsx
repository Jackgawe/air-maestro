import { useRef, useState, useCallback, useEffect } from 'react';
import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useMediaPipe } from '../lib/useMediaPipe';
import { mirrorAndNormalize, smoothCoordinates, createVelocityTracker, type VelocityTracker } from '../lib/coords';
import { isPinching } from '../lib/pinch';
import { isFist } from '../lib/fist';
import { audioEngine } from '../lib/audioEngine';
import { Sequencer } from '../lib/sequencer';
import { DualHandGestureMachine } from '../lib/gestureMachine';
import { MOUNTAIN_KING_MELODY } from '../lib/mountainKing';
import { Orchestra } from './Orchestra';
import { BatonCursor } from './BatonCursor';
import { Spotlight } from './Spotlight';
import { BPMCounter } from './ui/BPMCounter';
import { SectionLabel } from './ui/SectionLabel';
import { CameraToggle } from './ui/CameraToggle';
import { CameraSelector } from './ui/CameraSelector';
import { CameraPreview } from './CameraPreview';
import type { Section, DualHandState } from '../types';

interface AirCanvasProps {
  isActive: boolean;
}

const HandIcon = ({ type, isFist, isPinching, active }: { type: 'left' | 'right', isFist?: boolean, isPinching?: boolean, active?: boolean }) => (
  <div className={`w-10 h-10 flex items-center justify-center bg-gray-800/50 rounded-lg border transition-all duration-300 ${active ? 'border-amber-400/50 shadow-lg shadow-amber-400/20 scale-110' : 'border-gray-700'}`}>
    {type === 'left' ? (
      isFist ? (
        <span className="text-2xl animate-pulse" role="img" aria-label="fist">✊</span>
      ) : (
        <span className="text-2xl animate-bounce" style={{ animationDuration: '2s' }} role="img" aria-label="pointing">☝️</span>
      )
    ) : (
      isPinching ? (
        <span className="text-2xl animate-ping" style={{ animationDuration: '1.5s' }} role="img" aria-label="pinch">👌</span>
      ) : (
        <span className="text-2xl animate-pulse" role="img" aria-label="wave">👋</span>
      )
    )}
  </div>
);

export function AirCanvas({ isActive }: AirCanvasProps) {
  const [bpm, setBpm] = useState(120);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [playingSections, setPlayingSections] = useState<Set<Section>>(new Set());
  const [isDownbeat, setIsDownbeat] = useState(false);
  const [pointingHandPos, setPointingHandPos] = useState({ x: 0, y: 0 });
  const [conductingHandPos, setConductingHandPos] = useState({ x: 0, y: 0 });
  const [pointingX, setPointingX] = useState(0.5); // For spotlight, synced with ref
  const [showCamera, setShowCamera] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dualHandState, setDualHandState] = useState<DualHandState | null>(null);
  const [detectedHandCount, setDetectedHandCount] = useState(0); // Track number of hands detected
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [conductingEnergy, setConductingEnergy] = useState(0);

  const smoothedPointingRef = useRef({ x: 0.5, y: 0.5 });
  const smoothedConductingRef = useRef({ x: 0.5, y: 0.5 });
  const lastConductingYRef = useRef(0.5);
  const conductingStrikeVelocityRef = useRef(0);
  const gestureMachineRef = useRef<DualHandGestureMachine | null>(null);
  const sequencerRef = useRef<Sequencer | null>(null);
  const conductingVelocityTrackerRef = useRef<VelocityTracker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNotePlay = useCallback((section: Section) => {
    // Only play if the pointing hand has selected this section
    const selectedSection = gestureMachineRef.current?.selectedSection;
    if (selectedSection === section) {
      setPlayingSections((prev) => {
        const next = new Set(prev);
        next.add(section);
        return next;
      });
      
      setTimeout(() => {
        setPlayingSections((prev) => {
          const next = new Set(prev);
          next.delete(section);
          return next;
        });
      }, 150);
    }
  }, []);

  const handleLoopComplete = useCallback((count: number) => {
    setLoopCount(count);
  }, []);

  const handleDownbeat = useCallback(() => {
    setIsDownbeat(true);
    sequencerRef.current?.triggerDownbeat();
    setTimeout(() => setIsDownbeat(false), 200);
  }, []);

  const handleFist = useCallback((fistDetected: boolean) => {
    setIsPaused(fistDetected);
    sequencerRef.current?.setFist(fistDetected);
  }, []);

  const processHand = (
    landmarks: NormalizedLandmark[],
    smoothedRef: React.MutableRefObject<{ x: number; y: number }>,
    rect: DOMRect,
    vw: number,
    vh: number
  ) => {
    const indexTip = landmarks[8];
    
    // Use the mirrorAndNormalize utility if available, or do it manually
    // MediaPipe landmarks are already normalized (0-1)
    // We mirror X for selfie view (1-x)
    const rawCoords = mirrorAndNormalize(
      indexTip.x * vw,
      indexTip.y * vh,
      vw,
      vh
    );

    smoothedRef.current = smoothCoordinates(
      rawCoords,
      smoothedRef.current
    );

    return {
      x: smoothedRef.current.x,
      y: smoothedRef.current.y,
      screenX: smoothedRef.current.x * rect.width,
      screenY: smoothedRef.current.y * rect.height,
      isPinching: isPinching(landmarks),
      isFist: isFist(landmarks),
    };
  };

  const handleResults = useCallback((results: HandLandmarkerResult) => {
    if (!containerRef.current || !videoRef.current) return;

    // Use latest rect to handle window resizing
    const rect = containerRef.current.getBoundingClientRect();
    const now = performance.now();
    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;

    // Process up to 2 hands
    let pointingHand: { present: boolean; x: number; y: number; isFist: boolean } | null = null;
    let conductingHand: { present: boolean; x: number; y: number; isPinching: boolean; isFist: boolean; velocity: number } | null = null;

    // Process hands
    if (results.landmarks.length > 0) {
      // Sort hands by X coordinate to reliably assign Left/Right regardless of MediaPipe labels
      // 1-x is our mirrored coordinate. Smaller 1-x means left side of screen.
      const sortedIndices = results.landmarks
        .map((_, i) => i)
        .sort((a, b) => (1 - results.landmarks[a][8].x) - (1 - results.landmarks[b][8].x));

      sortedIndices.forEach((resultIndex, sortIndex) => {
        const landmarks = results.landmarks[resultIndex];
        
        // If 2 hands: first sorted is Left, second is Right
        // If 1 hand: use its position to decide
        let isLeftHand = false;
        if (results.landmarks.length >= 2) {
          isLeftHand = sortIndex === 0;
        } else {
          const rawX = 1 - landmarks[8].x;
          isLeftHand = rawX < 0.5;
        }

        if (isLeftHand) {
          const hand = processHand(landmarks, smoothedPointingRef, rect, vw, vh);
          pointingHand = {
            present: true,
            x: hand.x,
            y: hand.y,
            isFist: hand.isFist,
          };
          setPointingHandPos({ x: hand.screenX, y: hand.screenY });
          setPointingX(hand.x);
        } else {
          const hand = processHand(landmarks, smoothedConductingRef, rect, vw, vh);
          
          // Track velocity for conducting hand
          conductingVelocityTrackerRef.current?.addPosition(hand.screenX, hand.screenY, now);
          const velocity = conductingVelocityTrackerRef.current?.velocity ?? 0;
          
          conductingHand = {
            present: true,
            x: hand.x,
            y: hand.y,
            isPinching: hand.isPinching,
            isFist: hand.isFist,
            velocity: velocity,
          };
          setConductingHandPos({ x: hand.screenX, y: hand.screenY });

          // Update tempo from conducting hand Y position with smoothing
          const targetBpm = sequencerRef.current?.getBpmFromY(hand.y) ?? 120;
          setBpm(prev => {
            const smoothedBpm = prev * 0.9 + targetBpm * 0.1;
            const finalBpm = Math.round(smoothedBpm);
            if (Math.abs(finalBpm - prev) >= 1) {
              sequencerRef.current?.setBpm(finalBpm);
              return finalBpm;
            }
            return prev;
          });

          // Update velocity for dynamics
          sequencerRef.current?.setHandVelocity(velocity);

          // Update conducting energy for visuals
          const energy = Math.min(1, velocity / 1500);
          setConductingEnergy(energy);

          // Strike detection (conducting gesture)
          const dy = hand.y - lastConductingYRef.current;
          const verticalVelocity = dy * 60; // Approximate per second if 60fps
          
          // If moving down fast (positive dy), track it
          if (verticalVelocity > 0.1) {
            conductingStrikeVelocityRef.current = Math.max(conductingStrikeVelocityRef.current, verticalVelocity);
          } else if (verticalVelocity < -0.05 && conductingStrikeVelocityRef.current > 0.4) {
            // Sharp reversal at high speed = STRIKE
            handleDownbeat();
            conductingStrikeVelocityRef.current = 0;
          } else if (Math.abs(verticalVelocity) < 0.01) {
            // Sharp stop at high speed = STRIKE
            if (conductingStrikeVelocityRef.current > 0.5) {
              handleDownbeat();
            }
            conductingStrikeVelocityRef.current = 0;
          }
          
          lastConductingYRef.current = hand.y;
        }
      });

      setDetectedHandCount(results.landmarks.length);
    } else {
      setDetectedHandCount(0);
      setConductingEnergy(0);
    }

    // Update gesture machine with both hands
    gestureMachineRef.current?.update(pointingHand, conductingHand);

    // Update UI based on pointing hand section
    const selectedSection = gestureMachineRef.current?.selectedSection ?? null;
    setActiveSection(selectedSection);
    sequencerRef.current?.setProminentSection(selectedSection);

  }, []);

  const { videoRef, stream, cameras } = useMediaPipe({
    onResults: handleResults,
    enabled: isActive && hasStarted,
    deviceId: selectedCameraId,
  });

  // Start/stop sequencer based on hand detection
  useEffect(() => {
    if (hasStarted && detectedHandCount > 0 && !isPaused) {
      sequencerRef.current?.start();
    } else {
      sequencerRef.current?.stop();
    }
  }, [hasStarted, detectedHandCount, isPaused]);

  useEffect(() => {
    if (isActive && hasStarted) {
      conductingVelocityTrackerRef.current = createVelocityTracker();

      gestureMachineRef.current = new DualHandGestureMachine({
        onStateChange: (state) => {
          setDualHandState(state);
          setActiveSection(state.pointingHand.section);
        },
        onDownbeat: handleDownbeat,
        onFist: handleFist,
      });

      sequencerRef.current = new Sequencer(MOUNTAIN_KING_MELODY, {
        onNotePlay: handleNotePlay,
        onLoopComplete: handleLoopComplete,
      });

      audioEngine.resume();

      return () => {
        sequencerRef.current?.stop();
      };
    }
  }, [isActive, hasStarted, handleNotePlay, handleDownbeat, handleFist, handleLoopComplete]);

  const handleStart = async () => {
    await audioEngine.initialize();
    audioEngine.resume(); // Ensure it's resumed immediately
    setHasStarted(true);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden"
    >
      {!hasStarted ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-amber-400 mb-4">Air Orchestra</h1>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">
              Conduct a virtual orchestra. Use your <strong>Left Hand</strong> to select sections and stop (fist).
              Use your <strong>Right Hand</strong> for BPM, volume, and downbeats (pinch or strike).
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Made by{' '}
              <a 
                href="https://github.com/jackgawe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                @jackgawe
              </a>
              {' '}•{' '}
              <a 
                href="https://github.com/Jackgawe/air-maestro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                GitHub Repo
              </a>
            </p>
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-xl transition-colors text-lg"
            >
              Start Conducting
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* How to Guide (Left Sidebar) */}
          <div className="absolute left-6 top-24 z-40 w-64 space-y-4">
            <div className="p-4 bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-800 shadow-2xl">
              <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                How to Conduct
              </h3>
              
              <div className="space-y-4">
                <div className={`flex items-start gap-3 transition-opacity ${dualHandState?.pointingHand.present ? 'opacity-100' : 'opacity-50'}`}>
                  <HandIcon type="left" isFist={isPaused} active={dualHandState?.pointingHand.present} />
                  <div>
                    <p className="text-sm font-bold text-gray-200">Left Hand</p>
                    <p className="text-xs text-gray-400">Move to select section. Make a fist to stop/pause.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 transition-opacity ${dualHandState?.conductingHand.present ? 'opacity-100' : 'opacity-50'}`}>
                  <HandIcon type="right" isPinching={dualHandState?.conductingHand.isPinching} active={dualHandState?.conductingHand.present} />
                  <div>
                    <p className="text-sm font-bold text-gray-200">Right Hand</p>
                    <p className="text-xs text-gray-400">Vertical movement for BPM. Pinch for downbeat. Velocity for volume.</p>
                  </div>
                </div>
              </div>
            </div>

            {detectedHandCount < 2 && (
              <div className="p-4 bg-amber-900/20 backdrop-blur-md rounded-2xl border border-amber-900/40 text-center">
                <p className="text-sm text-amber-200 animate-pulse font-medium">
                  {detectedHandCount === 0 
                    ? "Show both hands to begin" 
                    : "Show your other hand to conduct"}
                </p>
              </div>
            )}
          </div>

          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
            <div className="flex items-center gap-4">
              <BPMCounter bpm={bpm} />
              <SectionLabel section={activeSection} />
              <div className="px-3 py-1 bg-gray-900/80 rounded-lg border border-gray-700 text-sm">
                <span className="text-gray-400">Loop:</span>
                <span className="text-amber-400 font-bold ml-1">{loopCount + 1}</span>
              </div>
              {detectedHandCount === 0 && (
                <div className="px-3 py-1 bg-yellow-900/80 rounded-lg border border-yellow-700 text-sm text-yellow-300 font-medium animate-pulse">
                  Waiting for hands...
                </div>
              )}
              {detectedHandCount === 1 && (
                <div className="px-3 py-1 bg-blue-900/80 rounded-lg border border-blue-700 text-sm text-blue-300 font-medium animate-pulse">
                  1 Hand Detected
                </div>
              )}
              {isPaused && (
                <div className="px-3 py-1 bg-red-900/80 rounded-lg border border-red-700 text-sm text-red-300 font-medium animate-pulse">
                  PAUSED (Fist Detected)
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <CameraSelector
                cameras={cameras}
                selectedDeviceId={selectedCameraId}
                onSelect={setSelectedCameraId}
              />
              <CameraToggle isVisible={showCamera} onToggle={() => setShowCamera(!showCamera)} />
            </div>
          </div>

          <Spotlight x={pointingX} isVisible={!!activeSection} />

          <div className="absolute inset-0 flex items-center justify-center pt-20">
            <Orchestra
              activeSection={activeSection}
              playingSections={playingSections}
              isDownbeat={isDownbeat}
              bpm={bpm}
              loopCount={loopCount}
            />
          </div>

          {/* Pointing hand cursor (left hand) */}
          <BatonCursor
            x={pointingHandPos.x}
            y={pointingHandPos.y}
            isVisible={dualHandState?.pointingHand.present ?? false}
          />
          
          {/* Conducting hand cursor (right hand) - different color (blue/cyan) */}
          <BatonCursor
            x={conductingHandPos.x}
            y={conductingHandPos.y}
            isVisible={dualHandState?.conductingHand.present ?? false}
            energy={conductingEnergy}
            color={conductingEnergy > 0.5 ? '#60a5fa' : '#3b82f6'}
          />

          {/* Downbeat Flash Effect */}
          {isDownbeat && (
            <div className="fixed inset-0 pointer-events-none bg-white/10 z-30 animate-out fade-out duration-300" />
          )}

          {/* Conducting Energy Meter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden z-40">
            <div 
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${conductingEnergy * 100}%`, opacity: conductingEnergy * 0.8 + 0.2 }}
            />
          </div>

          {/* Hidden video element for MediaPipe hand tracking */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />

          <CameraPreview key={stream?.id || 'no-stream'} stream={stream} isVisible={showCamera} />
        </>
      )}
    </div>
  );
}
