import type { Section } from '../../types';

interface SectionLabelProps {
  section: Section | null;
}

const SECTION_NAMES: Record<Section, string> = {
  strings: 'Strings',
  brass: 'Brass',
  winds: 'Winds',
  percussion: 'Percussion',
};

const SECTION_COLORS: Record<Section, string> = {
  strings: 'text-purple-400 border-purple-500/50',
  brass: 'text-amber-400 border-amber-500/50',
  winds: 'text-teal-400 border-teal-500/50',
  percussion: 'text-pink-400 border-pink-500/50',
};

export function SectionLabel({ section }: SectionLabelProps) {
  if (!section) {
    return (
      <div className="px-4 py-2 bg-gray-900/80 rounded-lg border border-gray-700 text-gray-500">
        No Section Selected
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-2 bg-gray-900/80 rounded-lg border ${SECTION_COLORS[section]} font-medium`}
    >
      {SECTION_NAMES[section]}
    </div>
  );
}
