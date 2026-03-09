'use client';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { MediaPlayer, MediaProvider } from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

interface VodPlayerProps {
  src: string;
  title?: string;
}

export default function VodPlayer({ src, title }: VodPlayerProps) {
  return (
    <MediaPlayer
      src={src}
      viewType="video"
      streamType="on-demand"
      playsInline
      title={title || 'Fight Replay'}
      className="vod-player"
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
