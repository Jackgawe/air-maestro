interface BPMCounterProps {
  bpm: number;
}

export function BPMCounter({ bpm }: BPMCounterProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 rounded-lg border border-gray-700">
      <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-2xl font-bold text-amber-400">{Math.round(bpm)}</span>
      <span className="text-sm text-gray-400 uppercase tracking-wider">BPM</span>
    </div>
  );
}
