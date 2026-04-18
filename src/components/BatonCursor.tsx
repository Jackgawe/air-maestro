import { useRef, useEffect } from 'react';
import type { TrailPoint } from '../types';

interface BatonCursorProps {
  x: number;
  y: number;
  isVisible: boolean;
}

const TRAIL_LENGTH = 8;

export function BatonCursor({ x, y, isVisible }: BatonCursorProps) {
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
      cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }

    if (trailContainerRef.current) {
      const trailElements = trailContainerRef.current.children;
      trailRef.current.forEach((point, index) => {
        const el = trailElements[index] as HTMLElement;
        if (el) {
          const opacity = (index + 1) / TRAIL_LENGTH;
          el.style.transform = `translate(${point.x}px, ${point.y}px)`;
          el.style.opacity = String(opacity * 0.5);
        }
      });
    }
  }, [x, y, isVisible]);

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
            className="absolute w-3 h-3 rounded-full bg-amber-400 blur-sm transition-transform duration-75"
            style={{ left: -6, top: -6 }}
          />
        ))}
      </div>
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-50 w-6 h-6 -ml-3 -mt-3"
        style={{ left: 0, top: 0 }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 shadow-lg shadow-amber-500/50 animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-white/30 blur-md" />
      </div>
    </>
  );
}
