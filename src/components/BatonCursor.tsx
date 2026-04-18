import { useRef, useEffect } from 'react';
import type { TrailPoint } from '../types';

interface BatonCursorProps {
  x: number;
  y: number;
  isVisible: boolean;
  energy?: number;
  color?: string;
}

const TRAIL_LENGTH = 12;

export function BatonCursor({ x, y, isVisible, energy = 0, color = '#fbbf24' }: BatonCursorProps) {
  const trailRef = useRef<TrailPoint[]>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      trailRef.current = [];
      return;
    }

    const now = performance.now();
    trailRef.current.push({ x, y, timestamp: now });

    if (trailRef.current.length > TRAIL_LENGTH) {
      trailRef.current = trailRef.current.slice(-TRAIL_LENGTH);
    }

    if (cursorRef.current) {
      const scale = 1 + energy * 1.5;
      cursorRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    if (trailContainerRef.current) {
      const trailElements = trailContainerRef.current.children;
      trailRef.current.forEach((point, index) => {
        const el = trailElements[index] as HTMLElement;
        if (el) {
          const opacity = (index + 1) / TRAIL_LENGTH;
          const trailScale = (index + 1) / TRAIL_LENGTH * (1 + energy);
          el.style.transform = `translate(${point.x}px, ${point.y}px) scale(${trailScale})`;
          el.style.opacity = String(opacity * 0.6);
          el.style.backgroundColor = color;
        }
      });
    }
  }, [x, y, isVisible, energy, color]);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={trailContainerRef}
        className="pointer-events-none fixed inset-0 z-50"
      >
        {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full blur-sm transition-transform duration-75"
            style={{ left: -6, top: -6, backgroundColor: color }}
          />
        ))}
      </div>
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-50 w-6 h-6 -ml-3 -mt-3"
        style={{ left: 0, top: 0 }}
      >
        <div 
          className="w-full h-full rounded-full shadow-lg animate-pulse"
          style={{ background: `linear-gradient(to right, ${color}, white)`, boxShadow: `0 0 15px ${color}` }}
        />
        <div className="absolute inset-0 rounded-full bg-white/30 blur-md" />
      </div>
    </>
  );
}
