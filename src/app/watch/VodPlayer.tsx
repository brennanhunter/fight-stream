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
  expiresAt?: string | null;
}

type ErrorState = 'expired' | 'network';

export default function VodPlayer({ src, title, expiresAt }: VodPlayerProps) {
  const [error, setError] = useState<ErrorState | null>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);

  if (error === 'expired') {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 py-16 px-6 text-center">
        <p className="text-white text-lg font-semibold mb-2">Playback link expired</p>
        <p className="text-gray-400 text-sm mb-6">
          Your video link has timed out. Refresh to get a new one, or restore your access below.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors"
          >
            Refresh Page
          </button>
          <a
            href="/recover-access"
            className="px-6 py-3 border border-white/30 text-white font-bold text-sm tracking-wide hover:border-white transition-colors"
          >
            Restore Access
          </a>
        </div>
      </div>
    );
  }

  if (error === 'network') {
    return (
      <div className="flex flex-col items-center justify-center bg-black/80 py-16 px-6 text-center">
        <p className="text-white text-lg font-semibold mb-2">Playback interrupted</p>
        <p className="text-gray-400 text-sm mb-6">
          Check your connection and try refreshing the page.
        </p>
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
        if (e?.code === 2) {
          // MEDIA_ERR_NETWORK — could be a dropped connection or an expired signed URL.
          // Use expiresAt to distinguish: if the window has closed it's truly expired,
          // otherwise it's likely a transient network issue.
          const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
          setError(isExpired ? 'expired' : 'network');
        } else if (e?.code != null) {
          // MEDIA_ERR_DECODE (3), MEDIA_ERR_SRC_NOT_SUPPORTED (4), etc.
          setError('network');
        }
      }}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
