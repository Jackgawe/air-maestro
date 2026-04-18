import type { CameraDevice } from '../../lib/useMediaPipe';

interface CameraSelectorProps {
  cameras: CameraDevice[];
  selectedDeviceId: string | undefined;
  onSelect: (deviceId: string) => void;
}

export function CameraSelector({ cameras, selectedDeviceId, onSelect }: CameraSelectorProps) {
  if (cameras.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="camera-select" className="text-gray-400 text-sm">
        Camera:
      </label>
      <select
        id="camera-select"
        value={selectedDeviceId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="px-3 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
      >
        {cameras.map((camera) => (
          <option key={camera.deviceId} value={camera.deviceId}>
            {camera.label}
          </option>
        ))}
      </select>
    </div>
  );
}
