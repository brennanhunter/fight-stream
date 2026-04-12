'use client';

import { useEffect, useState } from 'react';
import VodPlayer from './VodPlayer';
import SaveSession from './SaveSession';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import { signAndSetCookies } from './actions';

interface WatchContentProps {
  s3Key: string;
  signToken: string;
  cfExpiresInSeconds: number;
  contentName: string | null;
  expiresAt: string | null;
  isSubscriber: boolean;
  sessionId: string | null;
}

export default function WatchContent({
  s3Key,
  signToken,
  cfExpiresInSeconds,
  contentName,
  expiresAt,
  isSubscriber,
  sessionId,
}: WatchContentProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    signAndSetCookies(s3Key, signToken, cfExpiresInSeconds)
      .then(setVideoUrl)
      .catch(() => setError(true));
  }, [s3Key, signToken, cfExpiresInSeconds]);

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-gray-400 text-sm mb-6">Unable to load the video. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!videoUrl) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading replay…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
      {sessionId && <SaveSession sessionId={sessionId} />}
      <div className="vod-watch-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-24 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">
          {contentName || 'Now Playing'}
        </h1>
        <p className="text-gray-400 mb-2 text-center">
          {isSubscriber ? 'Enjoy your replay with Fight Pass.' : 'Enjoy your replay.'}
        </p>
        {expiresAt && (
          <div className="mb-8 text-center">
            <ExpiryCountdown expiresAt={expiresAt} />
          </div>
        )}

        <div className="vod-player-wrapper w-full rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl shadow-accent/10">
          <VodPlayer src={videoUrl} expiresAt={expiresAt} />
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Having trouble? Try refreshing the page or{' '}
          <a
            href="mailto:hunter@boxstreamtv.com"
            className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </main>
  );
}
