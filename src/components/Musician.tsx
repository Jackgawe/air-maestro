import { forwardRef } from 'react';
import { clsx } from 'clsx';
import type { Section } from '../types';

interface MusicianProps {
  section: Section;
  isActive: boolean;
  isPlaying: boolean;
  isDownbeat: boolean;
  bpm: number;
  color: string;
}

const sectionInstruments: Record<Section, string> = {
  strings: '🎻',
  winds: '🎷',
  brass: '🎺',
  percussion: '🥁',
};

// South Park style face colors
const SKIN_TONES = ['#fde4c9', '#f5d0a9', '#e8c4a0', '#d4a574', '#c4916c'];

// Get deterministic skin tone based on section
const getSkinTone = (section: Section) => {
  const index = ['strings', 'winds', 'brass', 'percussion'].indexOf(section);
  return SKIN_TONES[index % SKIN_TONES.length];
};

export const Musician = forwardRef<HTMLDivElement, MusicianProps>(
  ({ section, isActive, isPlaying, isDownbeat, bpm, color }, ref) => {
    const swayDuration = `${4 - bpm / 60}s`;
    const skinTone = getSkinTone(section);

    return (
      <div
        ref={ref}
        className={clsx(
          'musician relative flex flex-col items-center transition-all duration-150',
          isActive && 'musician--active',
          isPlaying && 'musician--playing',
          isDownbeat && 'musician--downbeat'
        )}
        style={
          {
            '--musician-color': color,
            '--sway-duration': swayDuration,
          } as React.CSSProperties
        }
      >
        <div className="musician__glow absolute inset-0 rounded-full opacity-0 transition-opacity duration-300" />
        
        <div className="musician__figure relative">
          {/* South Park Style Head - simple circle */}
          <div 
            className="musician__head w-10 h-10 rounded-full shadow-lg relative overflow-hidden"
            style={{ backgroundColor: skinTone }}
          >
            {/* Eyes - large ovals with small pupils */}
            <div className="absolute top-3 left-1.5 w-3.5 h-4 bg-white rounded-full">
              <div className="absolute top-1.5 left-1 w-1 h-1 bg-black rounded-full" />
            </div>
            <div className="absolute top-3 right-1.5 w-3.5 h-4 bg-white rounded-full">
              <div className="absolute top-1.5 left-1 w-1 h-1 bg-black rounded-full" />
            </div>
            
            {/* Simple line mouth */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-black rounded-full" />
            
            {/* Blush when playing */}
            {isPlaying && (
              <>
                <div className="absolute top-5 left-0.5 w-2 h-1 bg-red-300 rounded-full opacity-60" />
                <div className="absolute top-5 right-0.5 w-2 h-1 bg-red-300 rounded-full opacity-60" />
              </>
            )}
          </div>
          
          {/* Body - simple rounded rectangle */}
          <div
            className="musician__body w-11 h-12 rounded-2xl mt-0.5 shadow-md relative"
            style={{ backgroundColor: color }}
          >
            {/* Simple collar */}
            <div 
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full"
              style={{ backgroundColor: skinTone }}
            />
          </div>
          
          {/* Instrument */}
          <div className="musician__instrument absolute -right-1 top-6 text-xl">
            {sectionInstruments[section]}
          </div>
        </div>

        {/* Stand */}
        <div className="musician__stand absolute -bottom-1 w-14 h-1.5 bg-gray-700 rounded-full" />
      </div>
    );
  }
);

Musician.displayName = 'Musician';
