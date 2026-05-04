'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VodPlayer from '@/app/watch/VodPlayer';

const STORAGE_KEY = 'bstv_tv_auth_token';

type PlaybackResponse =
  | {
      kind: 'vod';
      url: string;
      title: string;
      expires_at: string | null;
    }
  | {
      kind: 'live';
      playback_url: string;
      token: string;
      token_expires_at: string;
      title: string;
      is_streaming: boolean;
    };

function WatchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get('purchase_id');
  const eventId = searchParams.get('event_id');

  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      router.replace('/tv');
      return;
    }
    if (!purchaseId && !eventId) {
      router.replace('/tv');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tv/playback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            purchaseId ? { purchase_id: purchaseId } : { event_id: eventId },
          ),
        });
        if (cancelled) return;
        if (res.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          router.replace('/tv');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Could not load this video.');
          return;
        }
        const data: PlaybackResponse = await res.json();
        setPlayback(data);
      } catch {
        setError('Network error.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [purchaseId, eventId, router]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => router.push('/tv')}
          className="text-xs tracking-[0.2em] uppercase text-gray-400 hover:text-white"
        >
          ← Back
        </button>
        {playback && (
          <p className="text-sm font-semibold truncate max-w-[60vw]">{playback.title}</p>
        )}
        <span className="w-16" />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">
            {error}
          </div>
        )}

        {!error && !playback && (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/40" />
          </div>
        )}

        {playback?.kind === 'vod' && (
          <VodPlayer src={playback.url} expiresAt={playback.expires_at} />
        )}

        {playback?.kind === 'live' && (
          <LivePlaceholder
            playbackUrl={playback.playback_url}
            isStreaming={playback.is_streaming}
          />
        )}
      </main>
    </div>
  );
}

/**
 * IVS live playback in the TV preview. Native TV apps will use the IVS
 * player SDK; the web preview uses the playback URL directly via a plain
 * <video> with HLS support so we can validate the auth path. Token isn't
 * needed for unauthenticated playback URLs at the IVS level — the gating
 * happens server-side in /api/tv/playback before the URL is handed out.
 */
function LivePlaceholder({
  playbackUrl,
  isStreaming,
}: {
  playbackUrl: string;
  isStreaming: boolean;
}) {
  if (!isStreaming) {
    return (
      <div className="border border-white/10 p-12 text-center">
        <p className="text-lg font-semibold">Stream is offline.</p>
        <p className="mt-2 text-sm text-gray-400">
          Check back when the event goes live.
        </p>
      </div>
    );
  }
  return (
    <video
      src={playbackUrl}
      controls
      autoPlay
      className="w-full aspect-video bg-black"
    />
  );
}

export default function TvWatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white" />
        </div>
      }
    >
      <WatchInner />
    </Suspense>
  );
}
