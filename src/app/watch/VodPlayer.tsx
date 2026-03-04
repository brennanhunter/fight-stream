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

    // Sync CSS fullscreen class with native Plyr fullscreen
    playerRef.current.on('enterfullscreen', () => {
      document.documentElement.classList.add('vod-fullscreen');
    });
    playerRef.current.on('exitfullscreen', () => {
      // Only remove if not in landscape (landscape keeps the CSS class)
      if (!screen.orientation?.type?.includes('landscape')) {
        document.documentElement.classList.remove('vod-fullscreen');
      }
    });

    // Auto-fullscreen on landscape rotation
    const handleOrientation = () => {
      const isLandscape = screen.orientation?.type?.includes('landscape');
      if (isLandscape) {
        // Add CSS-based fullscreen immediately (works without user gesture)
        document.documentElement.classList.add('vod-fullscreen');
        // Also try native fullscreen (may fail without user gesture)
        try { playerRef.current?.fullscreen.enter(); } catch {}
      } else {
        document.documentElement.classList.remove('vod-fullscreen');
        try {
          if (playerRef.current?.fullscreen.active) {
            playerRef.current.fullscreen.exit();
          }
        } catch {}
      }
    };

    screen.orientation?.addEventListener('change', handleOrientation);

    return () => {
      screen.orientation?.removeEventListener('change', handleOrientation);
      document.documentElement.classList.remove('vod-fullscreen');
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
