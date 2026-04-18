import { useRef, useEffect, useState, useCallback } from 'react';
import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Musician } from './Musician';
import { useMediaPipe } from '../lib/useMediaPipe';
import { mirrorAndNormalize, smoothCoordinates, createVelocityTracker, type VelocityTracker } from '../lib/coords';
import { isPinching } from '../lib/pinch';
import { isFist } from '../lib/fist';
import { audioEngine } from '../lib/audioEngine';
import { Sequencer } from '../lib/sequencer';
import { DualHandGestureMachine } from '../lib/gestureMachine';
import { MOUNTAIN_KING_MELODY } from '../lib/mountainKing';
import { BatonCursor } from './BatonCursor';
import { CameraPreview } from './CameraPreview';
import { BPMCounter } from './ui/BPMCounter';
import { SectionLabel } from './ui/SectionLabel';
import { CameraToggle } from './ui/CameraToggle';
import { CameraSelector } from './ui/CameraSelector';
import type { Section, DualHandState } from '../types';

interface OrchestraProps {
  activeSection?: Section | null;
  playingSections?: Set<Section>;
  isDownbeat?: boolean;
  bpm?: number;
  loopCount?: number;
  intensity?: number;
  // Camera and gesture integration props
  enableCamera?: boolean;
  enableGestures?: boolean;
  onSectionChange?: (section: Section | null) => void;
  onBpmChange?: (bpm: number) => void;
  onLoopComplete?: (count: number) => void;
}

const SECTION_COLORS: Record<Section, string> = {
  strings: '#a855f7',
  winds: '#14b8a6',
  brass: '#f59e0b',
  percussion: '#ec4899',
};

interface MusicianData {
  id: string;
  section: Section;
  row: number;
  col: number;
}

const ORCHESTRA_LAYOUT: MusicianData[] = [
  // Row 1: Strings (6 violinists)
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `strings-${i}`,
    section: 'strings' as Section,
    row: 0,
    col: i,
  })),
  // Row 2: Winds (4 figures)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `winds-${i}`,
    section: 'winds' as Section,
    row: 1,
    col: i,
  })),
  // Row 3: Brass (4 figures)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `brass-${i}`,
    section: 'brass' as Section,
    row: 2,
    col: i,
  })),
  // Row 4: Percussion (2 figures)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `percussion-${i}`,
    section: 'percussion' as Section,
    row: 3,
    col: i,
  })),
];

const ROW_CONFIG = [
  { musicians: 6, spacing: 14 },
  { musicians: 4, spacing: 18 },
  { musicians: 4, spacing: 18 },
  { musicians: 2, spacing: 28 },
];

export function Orchestra({
  activeSection: externalActiveSection,
  playingSections: externalPlayingSections,
  isDownbeat: externalIsDownbeat,
  bpm: externalBpm,
  loopCount: externalLoopCount = 0,
  enableCamera = false,
  enableGestures = false,
  onSectionChange,
  onBpmChange,
  onLoopComplete,
}: OrchestraProps) {
  const musicianRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera and gesture state (only used when enableCamera/enableGestures is true)
  const [internalBpm, setInternalBpm] = useState(120);
  const [internalActiveSection, setInternalActiveSection] = useState<Section | null>(null);
  const [internalPlayingSections, setInternalPlayingSections] = useState<Set<Section>>(new Set());
  const [internalIsDownbeat, setInternalIsDownbeat] = useState(false);
  const [internalLoopCount, setInternalLoopCount] = useState(0);
  const [pointingHandPos, setPointingHandPos] = useState({ x: 0, y: 0 });
  const [conductingHandPos, setConductingHandPos] = useState({ x: 0, y: 0 });
  const [showCamera, setShowCamera] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dualHandState, setDualHandState] = useState<DualHandState | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);


  const smoothedPointingRef = useRef({ x: 0.5, y: 0.5 });
  const smoothedConductingRef = useRef({ x: 0.5, y: 0.5 });
  const gestureMachineRef = useRef<DualHandGestureMachine | null>(null);
  const sequencerRef = useRef<Sequencer | null>(null);
  const conductingVelocityTrackerRef = useRef<VelocityTracker | null>(null);

  // Determine if we're using internal or external control
  const isGestureControlled = enableCamera && enableGestures;
  const bpm = isGestureControlled ? internalBpm : (externalBpm ?? 120);
  const activeSection = isGestureControlled ? internalActiveSection : externalActiveSection ?? null;
  const playingSections = isGestureControlled ? internalPlayingSections : externalPlayingSections ?? new Set();
  const isDownbeat = isGestureControlled ? internalIsDownbeat : externalIsDownbeat ?? false;
  const loopCount = isGestureControlled ? internalLoopCount : externalLoopCount;

  // Gesture handling callbacks
  const handleNotePlay = useCallback((section: Section) => {
    const selectedSection = gestureMachineRef.current?.selectedSection;
    if (selectedSection === section) {
      setInternalPlayingSections((prev) => {
        const next = new Set(prev);
        next.add(section);
        return next;
      });
      
      setTimeout(() => {
        setInternalPlayingSections((prev) => {
          const next = new Set(prev);
          next.delete(section);
          return next;
        });
      }, 150);
    }
  }, []);

  const handleLoopComplete = useCallback((count: number) => {
    setInternalLoopCount(count);
    onLoopComplete?.(count);
  }, [onLoopComplete]);

  const handleDownbeat = useCallback(() => {
    setInternalIsDownbeat(true);
    sequencerRef.current?.triggerDownbeat();
    setTimeout(() => setInternalIsDownbeat(false), 200);
  }, []);

  const handleFist = useCallback((fistDetected: boolean) => {
    setIsPaused(fistDetected);
    sequencerRef.current?.setFist(fistDetected);
  }, []);

  // Hand processing function
  const processHand = useCallback((
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
  }, []);

  // MediaPipe results handler
  const handleResults = useCallback((results: HandLandmarkerResult) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const now = performance.now();

    let pointingHand: { present: boolean; x: number; y: number } | null = null;
    let conductingHand: { present: boolean; x: number; y: number; isPinching: boolean; isFist: boolean; velocity: number } | null = null;

    if (results.landmarks.length >= 1) {
      const hand1 = processHand(results.landmarks[0], smoothedPointingRef, rect);
      pointingHand = {
        present: true,
        x: hand1.x,
        y: hand1.y,
      };
      setPointingHandPos({ x: hand1.screenX, y: hand1.screenY });
      setHandDetected(true);
    } else {
      setHandDetected(false);
    }

    if (results.landmarks.length >= 2) {
      const hand2 = processHand(results.landmarks[1], smoothedConductingRef, rect);
      
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

      const newBpm = sequencerRef.current?.getBpmFromY(hand2.y) ?? 120;
      sequencerRef.current?.setBpm(newBpm);
      setInternalBpm(newBpm);
      onBpmChange?.(newBpm);

      sequencerRef.current?.setHandVelocity(velocity);
    }

    gestureMachineRef.current?.update(pointingHand, conductingHand);

    const selectedSection = gestureMachineRef.current?.selectedSection ?? null;
    setInternalActiveSection(selectedSection);
    onSectionChange?.(selectedSection);
    sequencerRef.current?.setProminentSection(selectedSection);

  }, [processHand, onSectionChange, onBpmChange]);

  // MediaPipe hook - videoRef is used for hand tracking detection
  const { videoRef, stream, cameras } = useMediaPipe({
    onResults: handleResults,
    enabled: isGestureControlled && hasStarted,
    deviceId: selectedCameraId,
  });

  // Start/stop sequencer based on hand detection
  useEffect(() => {
    if (isGestureControlled && hasStarted && handDetected && !isPaused) {
      sequencerRef.current?.start();
    } else {
      sequencerRef.current?.stop();
    }
  }, [isGestureControlled, hasStarted, handDetected, isPaused]);

  // Initialize gesture system
  useEffect(() => {
    if (isGestureControlled && hasStarted) {
      conductingVelocityTrackerRef.current = createVelocityTracker();

      gestureMachineRef.current = new DualHandGestureMachine({
        onStateChange: (state) => {
          setDualHandState(state);
          setInternalActiveSection(state.pointingHand.section);
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
      });

      return () => {
        sequencerRef.current?.stop();
      };
    }
  }, [isGestureControlled, hasStarted, handleNotePlay, handleDownbeat, handleFist, handleLoopComplete]);

  const handleStart = async () => {
    await audioEngine.initialize();
    setHasStarted(true);
  };

  // Existing orchestra animation effect
  useEffect(() => {
    ORCHESTRA_LAYOUT.forEach((musician) => {
      const el = musicianRefs.current.get(musician.id);
      if (el) {
        const isActive = activeSection === musician.section;
        const isPlaying = playingSections.has(musician.section);
        
        // Section "wakes up" based on loop progression
        const sectionEntryLoop: Record<Section, number> = {
          strings: 0,
          winds: 1,
          brass: 2,
          percussion: 3,
        };
        const isAwake = loopCount >= sectionEntryLoop[musician.section];

        el.classList.toggle('swaying', isAwake);
        el.classList.toggle('active-section', isActive && isAwake);
        el.classList.toggle('playing', isPlaying && isAwake);
        el.classList.toggle('downbeat', isDownbeat);
        el.classList.toggle('asleep', !isAwake);
        
        // Set animation intensity based on loop count
        el.style.setProperty('--intensity', String(Math.min(1, loopCount / 3)));
      }
    });
  }, [activeSection, playingSections, isDownbeat, loopCount]);

  const getRowStyle = (rowIndex: number): React.CSSProperties => {
    const config = ROW_CONFIG[rowIndex];
    return {
      display: 'flex',
      gap: `${config.spacing}%`,
      justifyContent: 'center',
      paddingLeft: `${rowIndex * 5}%`,
      paddingRight: `${rowIndex * 5}%`,
      transform: `translateY(${rowIndex * 10}px)`,
    };
  };

  const rows = [0, 1, 2, 3].map((rowIndex) =>
    ORCHESTRA_LAYOUT.filter((m) => m.row === rowIndex)
  );

  // Render start screen for gesture-controlled mode
  if (isGestureControlled && !hasStarted) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden flex items-center justify-center"
      >
        <div className="text-center">
          <h1 className="text-5xl font-bold text-amber-400 mb-4">Air Orchestra</h1>
          <p className="text-gray-400 mb-4 max-w-md mx-auto">
            Conduct a virtual orchestra with your hand movements.
            Pinch to trigger downbeats, move vertically to control tempo.
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
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden"
    >
      {/* Camera and Gesture UI Overlay */}
      {isGestureControlled && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-40">
          <div className="flex items-center gap-4">
            <BPMCounter bpm={bpm} />
            <SectionLabel section={activeSection} />
            <div className="px-3 py-1 bg-gray-900/80 rounded-lg border border-gray-700 text-sm">
              <span className="text-gray-400">Loop:</span>
              <span className="text-amber-400 font-bold ml-1">{loopCount + 1}</span>
            </div>
            {!handDetected && (
              <div className="px-3 py-1 bg-yellow-900/80 rounded-lg border border-yellow-700 text-sm text-yellow-300 font-medium animate-pulse">
                Waiting for hands...
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
      )}

      {/* Orchestra Layout */}
      <div className="absolute inset-0 flex items-center justify-center pt-20">
        <div className="orchestra w-full max-w-4xl mx-auto">
          {rows.map((rowMusicians, rowIdx) => (
            <div key={rowIdx} className="orchestra__row mb-8" style={getRowStyle(rowIdx)}>
              {rowMusicians.map((musician) => (
                <Musician
                  key={musician.id}
                  ref={(el) => {
                    if (el) musicianRefs.current.set(musician.id, el);
                  }}
                  section={musician.section}
                  isActive={activeSection === musician.section}
                  isPlaying={playingSections.has(musician.section)}
                  isDownbeat={isDownbeat}
                  bpm={bpm}
                  color={SECTION_COLORS[musician.section]}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Gesture Cursors */}
      {isGestureControlled && (
        <>
          {/* Hidden video element for MediaPipe hand tracking */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />

          {/* Pointing hand cursor (left hand) */}
          <BatonCursor
            x={pointingHandPos.x}
            y={pointingHandPos.y}
            isVisible={dualHandState?.pointingHand.present ?? false}
          />
          
          {/* Conducting hand cursor (right hand) */}
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

          {/* Camera Preview */}
          <CameraPreview key={stream?.id || 'no-stream'} stream={stream} isVisible={showCamera} />
        </>
      )}
    </div>
  );
}
