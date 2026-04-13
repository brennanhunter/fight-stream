'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FightPassPrompt, { hasSeenFightPassPrompt, markFightPassPromptSeen } from '@/components/FightPassPrompt';

/* ── IVS Player types ── */
declare global {
  interface Window {
    IVSPlayer: {
      isPlayerSupported: boolean;
      create: () => IVSPlayerInstance;
      PlayerState: { PLAYING: string; IDLE: string; READY: string };
      PlayerEventType: { ERROR: string };
    };
  }
}

interface IVSPlayerInstance {
  attachHTMLVideoElement: (element: HTMLVideoElement) => void;
  load: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  setVolume: (volume: number) => void;
  addEventListener: (event: string, callback: () => void) => void;
  delete: () => void;
}

interface LivePlayerProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  posterImage: string | null;
  priceCents: number;
  stripePriceId: string | null;
  replayUrl: string | null;
  subscriptionTier: 'basic' | 'premium' | null;
}

export default function LivePlayer({
  eventId,
  eventName,
  eventDate,
  posterImage,
  priceCents,
  stripePriceId,
  replayUrl,
  subscriptionTier,
}: LivePlayerProps) {
  /* ── Access state ── */
  const [accessState, setAccessState] = useState<'checking' | 'needs-purchase' | 'recover-access' | 'has-access' | 'token-error'>('checking');
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  /* ── Token refresh ── */
  const tokenFetchedAtRef = useRef<number>(0);
  const TOKEN_REFRESH_MS = 10 * 60 * 60 * 1000; // Refresh after 10 hours (token expires at 12h)

  /* ── IVS player state ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const replayRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<IVSPlayerInstance | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [isStreamLive, setIsStreamLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showControls, setShowControls] = useState(true);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  /* ── Purchase state ── */
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showFightPassPrompt, setShowFightPassPrompt] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState(false);

  const priceDisplay = `$${(priceCents / 100).toFixed(2)}`;
  let ppvLabel: string;
  if (subscriptionTier === 'premium') {
    ppvLabel = 'Included with Fight Pass';
  } else if (subscriptionTier === 'basic') {
    const discounted = (priceCents * 0.75) / 100;
    ppvLabel = `$${discounted.toFixed(2)} (25% off with Fight Pass)`;
  } else {
    ppvLabel = priceDisplay;
  }

  /* ── Check access on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        const res = await fetch('/api/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          // If the user has a purchase but an invalid/stale session, send them
          // to recovery rather than showing a buy button.
          setAccessState(data.reason === 'session_invalid' ? 'recover-access' : 'needs-purchase');
          return;
        }
        if (!res.ok) {
          // Server error — don't show a purchase button, show a generic error
          setAccessState('needs-purchase');
          return;
        }
        const data = await res.json();
        const url = data.token ? `${data.playbackUrl}?token=${data.token}` : data.playbackUrl;
        setPlaybackUrl(url);
        tokenFetchedAtRef.current = Date.now();
        setAccessState('has-access');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setAccessState('token-error');
        } else {
          setAccessState('needs-purchase');
        }
      }
    })();
  }, []);

  /* ── Token refresh helper (called before reconnection when token may be stale) ── */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      const url = data.token ? `${data.playbackUrl}?token=${data.token}` : data.playbackUrl;
      setPlaybackUrl(url);
      tokenFetchedAtRef.current = Date.now();
      return url;
    } catch {
      return null;
    }
  }, []);

  /* ── Load IVS script when has access ── */
  useEffect(() => {
    if (accessState !== 'has-access') return;
    if (window.IVSPlayer) { setPlayerLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://player.live-video.net/1.33.0/amazon-ivs-player.min.js';
    script.async = true;
    script.onload = () => setPlayerLoaded(true);
    script.onerror = () => setScriptLoadError(true);
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [accessState]);

  /* ── Initialize IVS player ── */
  useEffect(() => {
    if (accessState !== 'has-access' || !playerLoaded || !playbackUrl || !videoRef.current) return;

    let healthCheck: NodeJS.Timeout | null = null;
    let onTimeUpdate: (() => void) | null = null;

    try {
      const { IVSPlayer } = window;
      if (!IVSPlayer?.isPlayerSupported) return;

      const player = IVSPlayer.create();
      playerRef.current = player;

      player.attachHTMLVideoElement(videoRef.current);
      videoRef.current.volume = 0.75;
      videoRef.current.muted = false;
      player.load(playbackUrl);

      let lastUpdate = Date.now();
      let shouldBeStreaming = false;

      onTimeUpdate = () => { lastUpdate = Date.now(); };
      videoRef.current.addEventListener('timeupdate', onTimeUpdate);

      healthCheck = setInterval(() => {
        if (Date.now() - lastUpdate > 5000 && shouldBeStreaming) {
          setIsStreamLive(false);
          setIsPlaying(false);
          shouldBeStreaming = false;
        }
      }, 3000);

      player.addEventListener(IVSPlayer.PlayerState.PLAYING, () => {
        setIsPlaying(true);
        setIsStreamLive(true);
        lastUpdate = Date.now();
        shouldBeStreaming = true;
      });

      player.addEventListener(IVSPlayer.PlayerState.IDLE, () => {
        setIsPlaying(false);
        shouldBeStreaming = false;
      });

      player.addEventListener(IVSPlayer.PlayerState.READY, () => {
        const p = player.play();
        if (p?.catch) p.catch(() => {});
      });

      player.addEventListener(IVSPlayer.PlayerEventType.ERROR, () => {
        setIsPlaying(false);
        setIsStreamLive(false);
      });

      player.setVolume(0.75);
    } catch { /* silent */ }

    return () => {
      if (playerRef.current) { playerRef.current.delete(); playerRef.current = null; }
      if (healthCheck) clearInterval(healthCheck);
      const el = videoRef.current;
      if (el && onTimeUpdate) el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [accessState, playerLoaded, playbackUrl]);

  /* ── Auto-fullscreen on landscape rotation (mobile) ── */
  useEffect(() => {
    if (accessState !== 'has-access') return;

    const handleOrientationChange = () => {
      setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape && !document.fullscreenElement) {
          const container = containerRef.current;
          if (container?.requestFullscreen) {
            container.requestFullscreen().catch(() => {
              // iOS Safari: can only fullscreen a video element directly
              const vid = videoRef.current;
              if (vid && (vid as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
                (vid as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
              }
            });
          } else {
            const vid = videoRef.current;
            if (vid && (vid as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
              (vid as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
            }
          }
        } else if (!isLandscape && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }, 100); // let dimensions settle after rotation
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [accessState]);

  /* ── Poll for stream when offline ── */
  // playerLoaded must be a dep so this re-runs after the player is ready.
  // Without it, if the stream is offline on load the poll never starts:
  // playbackUrl is set during the access check but playerRef.current is null
  // at that point, so the effect bails early and never restarts.
  useEffect(() => {
    if (!playerRef.current || !playbackUrl) return;
    const poll = setInterval(async () => {
      if (playerRef.current && !isStreamLive) {
        // If the token is older than TOKEN_REFRESH_MS, fetch a fresh one
        // before attempting to reconnect — otherwise IVS rejects the stale token.
        const tokenAge = Date.now() - tokenFetchedAtRef.current;
        if (tokenAge > TOKEN_REFRESH_MS) {
          const freshUrl = await refreshToken();
          if (freshUrl && playerRef.current) playerRef.current.load(freshUrl);
        } else {
          playerRef.current.load(playbackUrl);
        }
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [playbackUrl, isStreamLive, playerLoaded, refreshToken]);

  /* ── Player controls ── */
  const activeVideo = isStreamLive ? videoRef.current : replayRef.current;

  const togglePlay = () => {
    if (isStreamLive && playerRef.current) {
      isPlaying ? playerRef.current.pause() : playerRef.current.play();
    } else if (replayRef.current) {
      if (replayRef.current.paused) { replayRef.current.play(); setIsPlaying(true); }
      else { replayRef.current.pause(); setIsPlaying(false); }
    }
  };

  const toggleMute = () => {
    const vid = activeVideo;
    if (!vid) return;
    if (isMuted) {
      if (playerRef.current && isStreamLive) playerRef.current.setVolume(volume / 100);
      vid.muted = false;
      setIsMuted(false);
    } else {
      if (playerRef.current && isStreamLive) playerRef.current.setVolume(0);
      vid.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    setVolume(v);
    if (playerRef.current && isStreamLive) playerRef.current.setVolume(v / 100);
    const vid = activeVideo;
    if (vid) { vid.volume = v / 100; vid.muted = false; }
    if (v > 0) setIsMuted(false);
  };

  const toggleFullscreen = () => {
    const vid = activeVideo;
    if (!vid) return;
    if (!document.fullscreenElement) vid.parentElement?.requestFullscreen();
    else document.exitFullscreen();
  };

  const handleWatchReplay = () => {
    setIsPlayingReplay(true);
    setTimeout(() => {
      if (replayRef.current) {
        replayRef.current.volume = volume / 100;
        replayRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 100);
  };

  /* ── Purchase handler ── */
  const startCheckout = useCallback(async () => {
    if (!stripePriceId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/ppv-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: stripePriceId, eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Could not start checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  }, [stripePriceId, eventId]);

  const handlePurchase = () => {
    if (!stripePriceId) return;
    if (!subscriptionTier && !hasSeenFightPassPrompt()) {
      setShowFightPassPrompt(true);
      return;
    }
    startCheckout();
  };

  /* ═══════════════════════════════════════
     RENDER: Checking
  ═══════════════════════════════════════ */
  if (accessState === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-gray-400">
          <div aria-hidden="true" className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Checking access&hellip;</span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     RENDER: Token fetch failed / timed out
  ═══════════════════════════════════════ */
  if (accessState === 'token-error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <div className="text-center space-y-4 px-6 max-w-md">
          <p className="text-white text-lg font-semibold">Connection timed out</p>
          <p className="text-gray-400 text-sm">We couldn&apos;t reach our servers. Check your connection and try again.</p>
          <button
            onClick={() => { setAccessState('checking'); window.location.reload(); }}
            className="px-6 py-3 bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     RENDER: Has purchase but session invalid — recover
  ═══════════════════════════════════════ */
  if (accessState === 'recover-access') {
    return (
      <section className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden pt-16">
        {posterImage && (
          <div className="absolute inset-0">
            <Image src={posterImage} alt={eventName} fill className="object-cover opacity-10 blur-sm" />
            <div className="absolute inset-0 bg-black/75" />
          </div>
        )}
        <div className="relative z-10 max-w-md w-full mx-auto px-6 py-24 text-center space-y-6">
          <div className="w-16 h-16 border border-white/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Access Verification Needed</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We found your purchase but your session has expired or was opened on another device.
              Recover your access with your email address.
            </p>
          </div>
          <Link
            href="/recover-access"
            className="inline-block w-full bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
          >
            Recover Access
          </Link>
          <Link href="/" className="block text-xs text-gray-600 hover:text-gray-400 transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════
     RENDER: Needs purchase
  ═══════════════════════════════════════ */
  if (accessState === 'needs-purchase') {
    return (
      <section className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden pt-16">
        {posterImage && (
          <div className="absolute inset-0">
            <Image src={posterImage} alt={eventName} fill className="object-cover opacity-10 blur-sm" />
            <div className="absolute inset-0 bg-black/75" />
          </div>
        )}
        <div className="relative z-10 max-w-md w-full mx-auto px-6 py-24 text-center space-y-8">
          {posterImage && (
            <div className="relative mx-auto w-48 h-64 border border-white/10 overflow-hidden">
              <Image src={posterImage} alt={eventName} fill className="object-contain bg-black" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">
              Live Pay-Per-View
            </p>
            <h1 className="text-3xl font-bold">{eventName}</h1>
          </div>
          <div className="space-y-4">
            {stripePriceId && (
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="w-full bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? 'Redirecting to Stripe\u2026' : `Get Access \u2014 ${ppvLabel}`}
              </button>
            )}
            {checkoutError && <p role="alert" aria-live="polite" className="text-sm text-red-400">{checkoutError}</p>}
            <Link
              href="/recover-access"
              className="block text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
            >
              Already purchased? Recover access
            </Link>
            <Link
              href="/"
              className="block text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>
        </div>
        <FightPassPrompt
          open={showFightPassPrompt}
          onClose={() => { markFightPassPromptSeen(); setShowFightPassPrompt(false); }}
          onContinue={() => { setShowFightPassPrompt(false); startCheckout(); }}
        />
      </section>
    );
  }

  /* ═══════════════════════════════════════
     RENDER: Has access — player
  ═══════════════════════════════════════ */
  const showPlayer = isStreamLive || isPlayingReplay;
  const isLive = isStreamLive;

  return (
    <section className="relative bg-black text-white min-h-screen pt-16">
      <div className="w-full">
        <div
          ref={containerRef}
          className="relative aspect-video bg-black max-h-[85vh]"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* IVS live video — always rendered so the player can attach immediately */}
          <video
            ref={videoRef}
            playsInline
            aria-label="Live stream video player"
            className={`absolute inset-0 w-full h-full ${isStreamLive ? '' : 'opacity-0 pointer-events-none'}`}
            onClick={togglePlay}
          />

          {/* Replay video */}
          {isPlayingReplay && !isStreamLive && (
            <video
              ref={replayRef}
              playsInline
              aria-label="Event replay video"
              className="absolute inset-0 w-full h-full"
              onClick={togglePlay}
              src={replayUrl!}
            />
          )}

          {/* Waiting overlay — shown when not live and not playing replay */}
          {!showPlayer && !scriptLoadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-6">
              {posterImage && (
                <div className="relative w-40 h-52 border border-white/10 overflow-hidden">
                  <Image src={posterImage} alt={eventName} fill className="object-contain bg-black" />
                </div>
              )}
              <div className="text-center space-y-3 px-6">
                <h2 className="text-xl font-bold">{eventName}</h2>
                {(() => {
                  if (replayUrl) {
                    return (
                      <button
                        onClick={handleWatchReplay}
                        className="bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
                      >
                        Watch Replay
                      </button>
                    );
                  }
                  const elapsed = Date.now() - new Date(eventDate).getTime();
                  if (elapsed > 0 && elapsed < 4 * 60 * 60 * 1000) {
                    // Within 4 hours of event start — likely a mid-event interruption
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 justify-center text-white">
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          <span className="text-sm font-bold tracking-wide uppercase">Still in the fight</span>
                        </div>
                        <p className="text-xs text-gray-500">The stream hit a snag &mdash; we&apos;re working to get it back up.</p>
                      </div>
                    );
                  }
                  if (elapsed >= 4 * 60 * 60 * 1000) {
                    return (
                      <p className="text-sm text-gray-400">
                        Event has ended. Replay not yet available.
                      </p>
                    );
                  }
                  // Event hasn't started yet
                  return (
                    <div className="flex items-center gap-2 justify-center text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                      <span className="text-sm">Waiting for stream to begin&hellip;</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Script load error */}
          {scriptLoadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-4 px-6 text-center">
              <p className="text-white text-lg font-semibold">Unable to load the video player</p>
              <p className="text-gray-400 text-sm max-w-md">
                The stream player failed to load. This can happen if your browser or network is blocking external scripts. Try disabling your ad blocker or refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-6 py-3 bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}

          {/* Live / Replay badge */}
          {showPlayer && isPlaying && (
            <div
              className={`absolute top-4 left-4 z-10 flex items-center gap-2 ${
                isLive
                  ? 'bg-red-600'
                  : 'bg-white/10 backdrop-blur-sm border border-white/20'
              } text-white px-4 py-2 font-bold text-sm tracking-[0.15em] uppercase`}
            >
              {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              {isLive ? 'LIVE' : 'REPLAY'}
            </div>
          )}

          {/* Player controls */}
          {showPlayer && (
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="p-2 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="text-white hover:text-gray-300 p-2">
                    {isPlaying ? (
                      <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    )}
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'} className="text-white hover:text-gray-300 p-2">
                      {isMuted || volume === 0 ? (
                        <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      className="w-16 sm:w-24 h-1 appearance-none cursor-pointer accent-white"
                      style={{
                        background: `linear-gradient(to right, #fff 0%, #fff ${isMuted ? 0 : volume}%, #4b5563 ${isMuted ? 0 : volume}%, #4b5563 100%)`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-white text-xs font-medium bg-white/10 px-2 py-1">AUTO</span>
                  <button onClick={toggleFullscreen} aria-label="Fullscreen" className="text-white hover:text-gray-300 p-2">
                    <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info bar below player */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isLive && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-red-400">Live Now</span>
              </div>
            )}
            {isPlayingReplay && !isLive && (
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-gray-400">Replay</span>
            )}
            {(isLive || isPlayingReplay) && <div className="w-px h-6 bg-white/20" />}
            <h2 className="text-white font-bold text-lg">{eventName}</h2>
          </div>
          <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStream" width={120} height={30} />
        </div>
      </div>
    </section>
  );
}
