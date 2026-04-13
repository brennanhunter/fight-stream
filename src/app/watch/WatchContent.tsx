'use client';

import Link from 'next/link';
import VodPlayer from './VodPlayer';
import SaveSession from './SaveSession';
import ExpiryCountdown from '@/components/ExpiryCountdown';

interface WatchContentProps {
  videoUrl: string;
  contentName: string | null;
  expiresAt: string | null;
  isSubscriber: boolean;
  sessionId: string | null;
}

export default function WatchContent({
  videoUrl,
  contentName,
  expiresAt,
  isSubscriber,
  sessionId,
}: WatchContentProps) {
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
          <Link
            href="/contact"
            className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            contact support
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
