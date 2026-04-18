interface SpotlightProps {
  x: number;
  isVisible: boolean;
}

export function Spotlight({ x, isVisible }: SpotlightProps) {
  if (!isVisible) return null;

  const spotlightX = `${x * 100}%`;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
      style={{ opacity: isVisible ? 0.4 : 0 }}
    >
      <svg className="w-full h-full">
        <defs>
          <radialGradient
            id="spotlight-gradient"
            cx={spotlightX}
            cy="30%"
            r="40%"
            fx={spotlightX}
            fy="30%"
          >
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#spotlight-gradient)"
        />
      </svg>
    </div>
  );
}
