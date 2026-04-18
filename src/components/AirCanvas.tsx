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
import type { Section, DualHandState } from '../types';

interface AirCanvasProps {
  isActive: boolean;
}

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

  const smoothedPointingRef = useRef({ x: 0.5, y: 0.5 });
  const smoothedConductingRef = useRef({ x: 0.5, y: 0.5 });
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
    rect: DOMRect
  ) => {
    const indexTip = landmarks[8];
    
    const rawCoords = mirrorAndNormalize(
      indexTip.x * 640,
      indexTip.y * 480,
      640,
      480
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
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const now = performance.now();

    // Process up to 2 hands
    let pointingHand: { present: boolean; x: number; y: number } | null = null;
    let conductingHand: { present: boolean; x: number; y: number; isPinching: boolean; isFist: boolean; velocity: number } | null = null;

    if (results.landmarks.length >= 1) {
      // First hand - use as pointing hand (left hand typically)
      const hand1 = processHand(results.landmarks[0], smoothedPointingRef, rect);
      pointingHand = {
        present: true,
        x: hand1.x,
        y: hand1.y,
      };
      setPointingHandPos({ x: hand1.screenX, y: hand1.screenY });
      setPointingX(hand1.x);
    }

    if (results.landmarks.length >= 2) {
      // Second hand - use as conducting hand (right hand typically)
      const hand2 = processHand(results.landmarks[1], smoothedConductingRef, rect);
      
      // Track velocity for conducting hand
      conductingVelocityTrackerRef.current?.addPosition(hand2.screenX, hand2.screenY, now);
      const velocity = conductingVelocityTrackerRef.current?.velocity ?? 0;
      
      conductingHand = {
        present: true,
        x: hand2.x,
        y: hand2.y,
        isPinching: hand2.isPinching,
        isFist: hand2.isFist,
        velocity: velocity,
      };
      setConductingHandPos({ x: hand2.screenX, y: hand2.screenY });

      // Update tempo from conducting hand Y position
      const newBpm = sequencerRef.current?.getBpmFromY(hand2.y) ?? 120;
      sequencerRef.current?.setBpm(newBpm);
      setBpm(newBpm);

      // Update velocity for dynamics
      sequencerRef.current?.setHandVelocity(velocity);
    }

    // Update gesture machine with both hands
    gestureMachineRef.current?.update(pointingHand, conductingHand);

    // Update UI based on pointing hand section
    const selectedSection = gestureMachineRef.current?.selectedSection ?? null;
    setActiveSection(selectedSection);
    sequencerRef.current?.setProminentSection(selectedSection);

  }, []);

  const { videoRef } = useMediaPipe({
    onResults: handleResults,
    enabled: isActive && hasStarted,
  });

  // Ensure camera plays when shown
  useEffect(() => {
    if (showCamera && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [showCamera, videoRef]);

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

      audioEngine.initialize().then(() => {
        audioEngine.resume();
        sequencerRef.current?.start();
      });

      return () => {
        sequencerRef.current?.stop();
      };
    }
  }, [isActive, hasStarted, handleNotePlay, handleDownbeat, handleFist, handleLoopComplete]);

  const handleStart = async () => {
    await audioEngine.initialize();
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
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Conduct a virtual orchestra with your hand movements.
              Pinch to trigger downbeats, move vertically to control tempo.
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
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
            <div className="flex items-center gap-4">
              <BPMCounter bpm={bpm} />
              <SectionLabel section={activeSection} />
              <div className="px-3 py-1 bg-gray-900/80 rounded-lg border border-gray-700 text-sm">
                <span className="text-gray-400">Loop:</span>
                <span className="text-amber-400 font-bold ml-1">{loopCount + 1}</span>
              </div>
              {isPaused && (
                <div className="px-3 py-1 bg-red-900/80 rounded-lg border border-red-700 text-sm text-red-300 font-medium animate-pulse">
                  PAUSED (Fist Detected)
                </div>
              )}
            </div>
            <CameraToggle isVisible={showCamera} onToggle={() => setShowCamera(!showCamera)} />
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
          
          {/* Conducting hand cursor (right hand) - different color */}
          {dualHandState?.conductingHand.present && (
            <div
              className="pointer-events-none fixed z-50 w-6 h-6 -ml-3 -mt-3"
              style={{ 
                left: 0, 
                top: 0,
                transform: `translate(${conductingHandPos.x}px, ${conductingHandPos.y}px)`
              }}
            >
              <div className={`w-full h-full rounded-full shadow-lg ${
                dualHandState.conductingHand.isPinching 
                  ? 'bg-green-400 shadow-green-500/50' 
                  : 'bg-blue-400 shadow-blue-500/50'
              }`} />
            </div>
          )}

          {showCamera && (
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-gray-700 z-40 bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                playsInline
                muted
                autoPlay
                style={{ minWidth: '100%', minHeight: '100%' }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
