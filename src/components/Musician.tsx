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

export const Musician = forwardRef<HTMLDivElement, MusicianProps>(
  ({ section, isActive, isPlaying, isDownbeat, bpm, color }, ref) => {
    const swayDuration = `${4 - bpm / 60}s`;

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
          <div className="musician__head w-8 h-8 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 shadow-lg" />
          <div
            className="musician__body w-10 h-14 rounded-xl mt-1 shadow-md"
            style={{ backgroundColor: color }}
          />
          <div className="musician__instrument absolute -right-2 top-4 text-2xl">
            {sectionInstruments[section]}
          </div>
        </div>

        <div className="musician__stand absolute -bottom-2 w-12 h-1 bg-gray-600 rounded-full" />
      </div>
    );
  }
);

Musician.displayName = 'Musician';
