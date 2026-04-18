interface CameraToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function CameraToggle({ isVisible, onToggle }: CameraToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 transition-colors flex items-center gap-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isVisible ? (
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </>
        ) : (
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </>
        )}
      </svg>
      {isVisible ? 'Hide Camera' : 'Show Camera'}
    </button>
  );
}
