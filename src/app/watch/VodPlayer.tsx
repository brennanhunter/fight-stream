'use client';

import { useRef, useState } from 'react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

interface VodPlayerProps {
  src: string;
  title?: string;
}

export default function VodPlayer({ src, title }: VodPlayerProps) {
  const [expired, setExpired] = useState(false);
  const playerRef = useRef<MediaPlayerInstance>(null);

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 py-16 px-6 text-center">
        <p className="text-white text-lg font-semibold mb-2">Video session expired</p>
        <p className="text-gray-400 text-sm mb-6">Your playback link has timed out.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <MediaPlayer
      ref={playerRef}
      src={src}
      viewType="video"
      streamType="on-demand"
      playsInline
      title={title || 'Fight Replay'}
      className="vod-player"
      onError={(e) => {
        // MediaError code 2 = MEDIA_ERR_NETWORK (likely expired signed URL)
        if (e?.code === 2) {
          setExpired(true);
        }
      }}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
