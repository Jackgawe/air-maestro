import type { Section } from '../types';

export interface Note {
  freq: number;
  duration: number;
  section: Section;
  velocity: number;
}

// Hall of the Mountain King - Grieg
// In A minor, iconic descending motif

// Lower octave (bass notes)
const A2 = 110.0;
const B2 = 123.47;
const C3 = 130.81;
const D3 = 146.83;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.0;

// Middle octave
const A3 = 220.0;
// Unused: const B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63
// Unused: const F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88
// Unused: const C5 = 523.25, D5 = 587.33, E5 = 659.25

// The iconic theme: A - G - F - E - D - C - B - A
// Building intensity through sections
export const MOUNTAIN_KING_MELODY: Note[] = [
  // Opening - Strings only, mysterious
  { freq: A3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: G3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: F3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: E3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: D3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: C3, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: B2, duration: 1, section: 'strings', velocity: 0.4 },
  { freq: A2, duration: 2, section: 'strings', velocity: 0.5 },
  
  // Second phrase - slightly louder
  { freq: A3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: G3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: F3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: E3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: D3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: C3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: B2, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: A2, duration: 1.5, section: 'strings', velocity: 0.6 },
  
  // Winds enter - building tension
  { freq: A3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: G3, duration: 0.5, section: 'winds', velocity: 0.5 },
  { freq: F3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: E3, duration: 0.5, section: 'winds', velocity: 0.5 },
  { freq: D3, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: C3, duration: 0.5, section: 'winds', velocity: 0.5 },
  { freq: B2, duration: 0.5, section: 'strings', velocity: 0.5 },
  { freq: A2, duration: 1, section: 'winds', velocity: 0.6 },
  
  // Faster, brass joins
  { freq: A3, duration: 0.25, section: 'strings', velocity: 0.6 },
  { freq: G3, duration: 0.25, section: 'brass', velocity: 0.6 },
  { freq: F3, duration: 0.25, section: 'strings', velocity: 0.6 },
  { freq: E3, duration: 0.25, section: 'brass', velocity: 0.6 },
  { freq: D3, duration: 0.25, section: 'strings', velocity: 0.6 },
  { freq: C3, duration: 0.25, section: 'brass', velocity: 0.6 },
  { freq: B2, duration: 0.25, section: 'strings', velocity: 0.6 },
  { freq: A2, duration: 0.75, section: 'brass', velocity: 0.7 },
  
  // Chaos - all sections, percussion enters
  { freq: A3, duration: 0.25, section: 'strings', velocity: 0.7 },
  { freq: G3, duration: 0.25, section: 'winds', velocity: 0.7 },
  { freq: F3, duration: 0.25, section: 'brass', velocity: 0.7 },
  { freq: E3, duration: 0.25, section: 'percussion', velocity: 0.8 },
  { freq: D3, duration: 0.25, section: 'strings', velocity: 0.8 },
  { freq: C3, duration: 0.25, section: 'winds', velocity: 0.8 },
  { freq: B2, duration: 0.25, section: 'brass', velocity: 0.8 },
  { freq: A2, duration: 0.5, section: 'percussion', velocity: 0.9 },
  
  // Climax - rapid fire all sections
  { freq: A3, duration: 0.125, section: 'strings', velocity: 0.9 },
  { freq: G3, duration: 0.125, section: 'winds', velocity: 0.9 },
  { freq: F3, duration: 0.125, section: 'brass', velocity: 0.9 },
  { freq: E3, duration: 0.125, section: 'percussion', velocity: 1.0 },
  { freq: D3, duration: 0.125, section: 'strings', velocity: 1.0 },
  { freq: C3, duration: 0.125, section: 'winds', velocity: 1.0 },
  { freq: B2, duration: 0.125, section: 'brass', velocity: 1.0 },
  { freq: A2, duration: 0.5, section: 'percussion', velocity: 1.0 },
  
  // Final chord
  { freq: A2, duration: 2, section: 'strings', velocity: 0.8 },
  { freq: E3, duration: 2, section: 'brass', velocity: 0.8 },
  { freq: A3, duration: 2, section: 'winds', velocity: 0.8 },
  { freq: 55, duration: 2, section: 'percussion', velocity: 0.9 },
];
