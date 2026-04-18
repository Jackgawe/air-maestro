import { useEffect, useRef, useState } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isVisible: boolean;
}

export function CameraPreview({ stream, isVisible }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    const handleCanPlay = () => {
      if (!isMounted) return;
      setIsReady(true);
      setError(null);
      video.play().catch((err) => {
        console.warn('Video play failed:', err);
        if (isMounted) {
          setError('Play failed');
        }
      });
    };

    const handleLoadedMetadata = () => {
      if (!isMounted) return;
      console.log('CameraPreview: Video metadata loaded, readyState:', video.readyState);
      // Try to play immediately when metadata is loaded
      video.play().catch((err) => {
        console.warn('Video play on metadata failed:', err);
      });
    };

    const handleError = () => {
      if (!isMounted) return;
      console.error('CameraPreview: Video element error');
      setError('Video error');
      setIsReady(false);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    const setupStream = async () => {
      if (stream && isVisible) {
        console.log('CameraPreview: Setting stream:', stream.id, 'Active tracks:', stream.getTracks().length);
        
        // Check if stream has active video tracks
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) {
          console.warn('CameraPreview: No video tracks in stream');
          if (isMounted) {
            setError('No video');
          }
          return;
        }

        // Check if tracks are enabled
        const enabledTracks = videoTracks.filter(t => t.enabled);
        if (enabledTracks.length === 0) {
          console.warn('CameraPreview: Video tracks are disabled');
          if (isMounted) {
            setError('Camera disabled');
          }
          return;
        }

        if (isMounted) {
          video.srcObject = stream;
          setError(null);

          // If video is already ready, set isReady true
          if (video.readyState >= 2) {
            setIsReady(true);
            video.play().catch(console.warn);
          }
        }
      } else {
        video.srcObject = null;
        video.pause();
        if (isMounted) {
          setIsReady(false);
          setError(null);
        }
      }
    };

    setupStream();

    return () => {
      isMounted = false;
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.pause();
      video.srcObject = null;
    };
  }, [stream, isVisible]);



  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-gray-600 z-50 bg-black shadow-2xl">
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-500 border-t-amber-500 rounded-full animate-spin" />
            <span>Loading camera...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs px-2 text-center">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        className="w-full h-full object-cover"
        style={{
          transform: 'scaleX(-1)', // Mirror effect
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}
