import { useRef, useEffect } from 'react';
import { Musician } from './Musician';
import type { Section } from '../types';

interface OrchestraProps {
  activeSection: Section | null;
  playingSections: Set<Section>;
  isDownbeat: boolean;
  bpm: number;
  loopCount?: number;
  intensity?: number;
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
  activeSection,
  playingSections,
  isDownbeat,
  bpm,
  loopCount = 0,
}: OrchestraProps) {
  const musicianRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  return (
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
  );
}
