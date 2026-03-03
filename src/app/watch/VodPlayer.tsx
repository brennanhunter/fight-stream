'use client';

import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VodPlayerProps {
  src: string;
}

export default function VodPlayer({ src }: VodPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'pip',
        'fullscreen',
      ],
      settings: ['quality', 'speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: true },
      tooltips: { controls: true, seek: true },
      seekTime: 10,
    });

    // Auto-fullscreen on landscape rotation
    const handleOrientation = () => {
      const isLandscape = screen.orientation?.type?.includes('landscape');
      if (playerRef.current) {
        if (isLandscape) {
          playerRef.current.fullscreen.enter();
        } else {
          playerRef.current.fullscreen.exit();
        }
      }
    };

    screen.orientation?.addEventListener('change', handleOrientation);

    return () => {
      screen.orientation?.removeEventListener('change', handleOrientation);
      playerRef.current?.destroy();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      playsInline
    />
  );
}
