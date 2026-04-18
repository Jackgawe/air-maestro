# Air Orchestra

A gesture-controlled virtual orchestra application that lets you conduct music using hand movements. Built with React 19, TypeScript, Vite, and MediaPipe for real-time hand tracking.

## Features

### Dual-Hand Operation System

Air Orchestra uses a sophisticated dual-hand control scheme:

- **Left Hand (Pointing Hand)**: Controls section selection
  - Move horizontally across the screen to select different orchestra sections
  - Sections: Strings (left), Winds (center-left), Brass (center-right), Percussion (right)
  - Visual spotlight follows your pointing hand to highlight the selected section

- **Right Hand (Conducting Hand)**: Controls music playback and expression
  - **Pinch** (thumb + index finger) to activate conducting and play notes
  - **Vertical position** controls tempo (low = slow/dramatic, high = fast/chaotic)
  - **Hand velocity** affects dynamics (fast movements = louder, accented notes)
  - **Fist** gesture to pause the music

### Hall of the Mountain King (BETA!!)

The application features a complete implementation of Edvard Grieg's "In the Hall of the Mountain King":

- Full melody progression with authentic A minor descending motif
- Progressive section entry: Strings → Winds → Brass → Percussion
- Automatic tempo acceleration on each loop (up to 200 BPM max)
- Loop counter to track progression through the piece

### Enhanced Audio Engine

Professional-quality synthesized instruments with:

- **Strings**: Dual detuned sawtooth oscillators with lowpass filtering for warm, rich string tones
- **Brass**: Square wave with sub-octave oscillator and bandpass filtering for brass character
- **Winds**: Sine wave with triangle harmonics and breathy lowpass filtering
- **Percussion**: Mixed sine tones with filtered noise for percussive attack

Each instrument features:
- **ADSR Envelopes**: Attack, Decay, Sustain, Release tailored per section
- **Frequency Ranges**: Properly clamped to realistic instrument ranges
- **Dynamic Gain Control**: Section prominence and velocity-based volume
- **Musical Chord Voicing**: A minor 7 add 9 downbeat chord

### Real-Time Conducting Controls

| Gesture | Control |
|---------|---------|
| Left Hand X Position | Section Selection |
| Right Hand Pinch | Activate Conducting |
| Right Hand Y Position | Tempo (40-200 BPM) |
| Right Hand Velocity | Dynamics/Volume |
| Right Hand Fist | Pause Music |
| Pinch on Downbeat | Accent/Gain Boost |

### Visual Features

- **Dual Cursors**: Separate visual feedback for pointing (amber) and conducting (blue/green) hands
- **Musician Animations**: Sections "wake up" progressively as loops advance
- **Spotlight Effect**: Follows pointing hand to show selected section
- **BPM Counter**: Real-time tempo display
- **Loop Counter**: Track progression through the piece
- **Pause Indicator**: Visual feedback when fist gesture pauses music
- **Camera Preview**: Optional mirrored camera feed for hand positioning

## Technology Stack

- **Frontend**: React 19.2.4, TypeScript 6.0.2, Vite 8.0.4
- **Styling**: Tailwind CSS 4.2.2
- **Computer Vision**: MediaPipe Tasks Vision (@mediapipe/tasks-vision)
- **Audio**: Web Audio API with custom synthesizers
- **Utilities**: clsx for class composition

## Installation

```bash
git clone https://github.com/Jackgawe/air-maestro
cd air-maestro
npm install
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Prerequisites

- Node.js (v18 or higher)
- Webcam access for hand tracking (Obviously)
- Modern browser with Web Audio API support (Preferably Chromium based)

## Usage

1. **Start the application**: Run `npm run dev` and open the provided URL
2. **Allow camera access**: The app needs camera access for hand tracking
3. **Click "Start Conducting"**: Initialize the audio engine and hand tracking
4. **Use your left hand**: Point to select orchestra sections
5. **Use your right hand**: Pinch to conduct, move up/down for tempo, make a fist to pause

## Architecture

### Core Components

- `AirCanvas.tsx`: Main conductor interface, dual-hand processing
- `Orchestra.tsx`: Orchestra layout with 16 musicians across 4 sections
- `Musician.tsx`: Individual musician animations
- `BatonCursor.tsx`: Visual cursor with trailing effect
- `Spotlight.tsx`: Section highlighting effect

### Audio System

- `audioEngine.ts`: Web Audio API synthesizer with ADSR envelopes
- `sequencer.ts`: Precise note scheduling with lookahead
- `mountainKing.ts`: Complete melody data for Hall of the Mountain King

### Gesture Recognition

- `gestureMachine.ts`: Dual-hand state machine
- `useMediaPipe.ts`: MediaPipe hand tracking integration
- `coords.ts`: Coordinate smoothing and velocity tracking
- `pinch.ts`: Pinch gesture detection
- `fist.ts`: Fist gesture detection

## License

[MIT](LICENSE)
