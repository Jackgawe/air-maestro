# Air Orchestra App - Implementation Plan

## Architecture Overview

```
src/
├── components/
│   ├── AirCanvas.tsx          # Main conductor component
│   ├── Musician.tsx           # Individual musician SVG component
│   ├── Orchestra.tsx          # Orchestra layout container
│   ├── BatonCursor.tsx        # Hand position cursor with trail
│   ├── Spotlight.tsx          # Following spotlight effect
│   └── ui/
│       ├── BPMCounter.tsx     # BPM display
│       ├── SectionLabel.tsx   # Active section indicator
│       └── CameraToggle.tsx   # Show/hide camera feed
├── lib/
│   ├── coords.ts              # Coordinate mapping & smoothing
│   ├── pinch.ts               # Pinch gesture detection
│   ├── gestureMachine.ts      # Gesture state machine
│   ├── audioEngine.ts         # Web Audio API synthesis
│   ├── beatClock.ts           # BPM-based timing system
│   └── useMediaPipe.ts        # MediaPipe hook
├── types/
│   └── index.ts               # TypeScript interfaces
├── App.tsx
└── main.tsx
```

## Task Breakdown

### Task 1: Project Setup
- Initialize Vite + React + TypeScript project
- Install dependencies: `@mediapipe/tasks-vision`, `clsx`, `tailwindcss`
- Configure Tailwind with custom colors (orchestra section colors)
- Set up project structure

### Task 2: Type Definitions
Define TypeScript interfaces for:
- `Section`: 'strings' | 'brass' | 'winds' | 'percussion'
- `MusicianData`: id, section, position, color
- `HandData`: x, y, velocity, isPinching
- `AnimationState`: playing, swaying, activeSection, downbeat
- `AudioConfig`: waveforms, frequencies per section

### Task 3: Coordinate & Gesture Utilities (coords.ts, pinch.ts)
- Mirror and normalize MediaPipe coordinates (0-1 range)
- Exponential smoothing with α=0.15
- Velocity calculation from position deltas
- Pinch detection: thumb-index tip distance threshold

### Task 4: Audio Engine (audioEngine.ts)
- Web Audio API context management
- Oscillator types per section:
  - Strings: sawtooth
  - Brass: square
  - Winds: sine
  - Percussion: triangle + noise buffer
- Section note frequencies (chord on downbeat)
- Gain envelopes for natural sound

### Task 5: Beat Clock (beatClock.ts)
- BPM to millisecond conversion
- RequestAnimationFrame-based scheduler
- Beat callbacks for animation triggers
- Dynamic BPM updates from hand Y position

### Task 6: Gesture State Machine (gestureMachine.ts)
- States: idle, conducting, pinching
- Transitions based on hand presence and pinch
- Section selection from hand X position
- Downbeat trigger on pinch detection

### Task 7: Musician SVG Component (Musician.tsx)
- Props: section, isActive, isPlaying, isDownbeat, bpm
- SVG structure: head (circle), body (rounded rect), instrument shape
- CSS class application for animations:
  - `.swaying`: continuous gentle rotation
  - `.playing`: section-specific animation (0.15s)
  - `.active-section`: forward translate + brightness
  - `.downbeat`: scale bounce

### Task 8: Orchestra Layout (Orchestra.tsx)
- 4 rows in shallow arc formation
- Row 1: 6 violinists (strings, purple)
- Row 2: 4 wind figures (teal)
- Row 3: 4 brass figures (amber)
- Row 4: 2 percussion figures (pink)
- Section highlighting based on active section

### Task 9: Baton Cursor (BatonCursor.tsx)
- Glowing dot at hand position
- Trail: last 8 positions with fading opacity
- Smooth position updates via CSS transforms

### Task 10: Spotlight Effect (Spotlight.tsx)
- SVG radial gradient
- Position follows baton X
- Low opacity warm tone

### Task 11: Main AirCanvas Component (AirCanvas.tsx)
- MediaPipe initialization in VIDEO mode
- ResizeObserver for responsive sizing
- rAF loop for hand tracking
- All animation state in refs (no re-renders during performance)
- ClassName toggling for musician animations
- Integration of all sub-components

### Task 12: UI Components
- Top bar: BPM counter, active section name
- Camera toggle button (hidden by default)
- Start button for camera + AudioContext unlock

### Task 13: Styling
- Dark concert hall background (#0d0d18)
- Section accent colors (CSS custom properties)
- Animation keyframes for all musician motions
- Floor reflection effect

### Task 14: Integration & Testing
- Wire up all components
- Verify hand tracking accuracy
- Test audio synthesis
- Validate animation timing with BPM
- Performance optimization (GPU delegate)

## Key Technical Decisions

1. **No React State During Performance**: All animation state stored in refs, updated via className manipulation to avoid re-render overhead
2. **CSS Animations**: Hardware-accelerated transforms for 60fps performance
3. **Web Audio API**: Synthesis instead of samples for instant playback
4. **MediaPipe VIDEO Mode**: Better for continuous tracking than LIVE_STREAM
5. **GPU Delegate**: Enabled where available for performance

## File Dependencies

```
App.tsx
└── AirCanvas.tsx
    ├── Orchestra.tsx
    │   └── Musician.tsx
    ├── BatonCursor.tsx
    ├── Spotlight.tsx
    └── UI components
        ├── BPMCounter.tsx
        ├── SectionLabel.tsx
        └── CameraToggle.tsx

Supporting:
- useMediaPipe.ts (hook)
- coords.ts, pinch.ts (utilities)
- gestureMachine.ts (state)
- audioEngine.ts, beatClock.ts (audio)
```