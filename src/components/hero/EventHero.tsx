'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

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

/* ── Component props ── */
interface EventHeroProps {
  eventName: string;
  eventDate: string;
  posterImage: string | null;
  priceCents: number;
  stripePriceId: string | null;
  replayUrl: string | null;
}

function getTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function EventHero({ eventName, eventDate, posterImage, priceCents, stripePriceId, replayUrl }: EventHeroProps) {
  const priceDisplay = `$${(priceCents / 100).toFixed(2)}`;

  /* ── Countdown ── */
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(eventDate));
  const eventStarted = !timeLeft;

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeRemaining(eventDate)), 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  /* ── Purchase / access state ── */
  const [accessState, setAccessState] = useState<'checking' | 'needs-purchase' | 'has-access'>('checking');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  /* ── IVS player state ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const replayRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<IVSPlayerInstance | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [isStreamLive, setIsStreamLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showControls, setShowControls] = useState(true);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  /* ── Check access on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.status === 403) { setAccessState('needs-purchase'); return; }
        if (!res.ok) { setAccessState('needs-purchase'); return; }
        const data = await res.json();
        setPlaybackUrl(data.playbackUrl);
        setAccessState('has-access');
      } catch {
        setAccessState('needs-purchase');
      }
    })();
  }, []);

  /* ── Load IVS script (only when has access) ── */
  useEffect(() => {
    if (accessState !== 'has-access') return;
    if (window.IVSPlayer) { setPlayerLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://player.live-video.net/1.26.0/amazon-ivs-player.min.js';
    script.async = true;
    script.onload = () => setPlayerLoaded(true);
    script.onerror = () => console.error('Failed to load IVS Player script');
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

      if (videoRef.current) {
        player.attachHTMLVideoElement(videoRef.current);
        videoRef.current.volume = 0.75;
        videoRef.current.muted = false;
      }

      player.load(playbackUrl);

      let lastUpdate = Date.now();
      let shouldBeStreaming = false;

      onTimeUpdate = () => { lastUpdate = Date.now(); };
      videoRef.current?.addEventListener('timeupdate', onTimeUpdate);

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
        setIsStreamLive(true);
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
      if (playerRef.current) playerRef.current.delete();
      if (healthCheck) clearInterval(healthCheck);
      const el = videoRef.current;
      if (el && onTimeUpdate) el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [accessState, playerLoaded, playbackUrl]);

  /* ── Poll for stream when offline ── */
  useEffect(() => {
    if (!playerRef.current || !playbackUrl) return;
    const poll = setInterval(() => {
      if (playerRef.current && !isStreamLive) playerRef.current.load(playbackUrl);
    }, 5000);
    return () => clearInterval(poll);
  }, [playbackUrl, isStreamLive]);

  /* ── Player controls ── */
  /* ── Player controls (work for both IVS live + native replay) ── */
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
    // Auto-play after state update renders the video element
    setTimeout(() => {
      if (replayRef.current) {
        replayRef.current.volume = volume / 100;
        replayRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 100);
  };

  /* ── Purchase handler ── */
  const handlePurchase = async () => {
    if (!stripePriceId) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/ppv-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: stripePriceId }),
      });
      const data = await res.json();
      if (!res.ok) { setCheckoutLoading(false); return; }
      window.location.href = data.url;
    } catch {
      setCheckoutLoading(false);
    }
  };

  /* ── Recover access handler ── */
  const handleRecoverAccess = async () => {
    if (!recoveryEmail.trim()) return;
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await fetch('/api/recover-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setRecoveryError(data.error || 'Could not recover access');
      else window.location.reload();
    } catch {
      setRecoveryError('Something went wrong. Try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  /* ════════════════════════════════════════════
     RENDER: Full-width player (live stream OR replay)
     ════════════════════════════════════════════ */
  const showFullPlayer = accessState === 'has-access' && (isStreamLive || isPlayingReplay);

  if (showFullPlayer) {
    const isLive = isStreamLive;
    return (
      <section className="relative bg-black text-white">
        <div className="w-full">
          {/* Video player */}
          <div
            className="relative aspect-video bg-black max-h-[80vh]"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* IVS live video (hidden when playing replay) */}
            <video ref={videoRef} playsInline className={`absolute inset-0 w-full h-full ${isLive ? '' : 'hidden'}`} onClick={togglePlay} />
            {/* Replay video (hidden when live) */}
            {isPlayingReplay && !isLive && (
              <video ref={replayRef} playsInline className="w-full h-full" onClick={togglePlay} src={replayUrl!} />
            )}

            {/* Badge */}
            {isPlaying && (
              <div className={`absolute top-4 left-4 z-10 flex items-center gap-2 ${isLive ? 'bg-red-600' : 'bg-white/10 backdrop-blur-sm border border-white/20'} text-white px-4 py-2 font-bold text-sm tracking-[0.15em] uppercase`}>
                {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                {isLive ? 'LIVE' : 'REPLAY'}
              </div>
            )}

            {/* Controls */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white hover:text-gray-300 p-2">
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-white hover:text-gray-300 p-2">
                      {isMuted || volume === 0 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg>
                      )}
                    </button>
                    <input
                      type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                      className="w-24 h-1 bg-gray-600 appearance-none cursor-pointer accent-white"
                      style={{ background: `linear-gradient(to right, #fff 0%, #fff ${isMuted ? 0 : volume}%, #4b5563 ${isMuted ? 0 : volume}%, #4b5563 100%)` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium bg-white/10 px-2 py-1">AUTO</span>
                  <button onClick={toggleFullscreen} className="text-white hover:text-gray-300 p-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info bar below player */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isLive ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold tracking-[0.2em] uppercase text-red-400">Live Now</span>
                </div>
              ) : (
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-gray-400">Replay</span>
              )}
              <div className="w-px h-6 bg-white/20" />
              <h2 className="text-white font-bold text-lg">{eventName}</h2>
            </div>
            <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStream" width={120} height={30} />
          </div>
        </div>
      </section>
    );
  }

  /* ════════════════════════════════════════════
     RENDER: Info layout (not purchased, or purchased but waiting for stream)
     ════════════════════════════════════════════ */
  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden flex items-center">
      {/* Background poster with dark overlay */}
      {posterImage && (
        <div className="absolute inset-0">
          <Image src={posterImage} alt={eventName} fill className="object-cover opacity-20 blur-sm" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
        </div>
      )}
      {!posterImage && <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />}

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Ring rope lines */}
      <div className="ring-ropes absolute inset-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Event Info + Countdown */}
          <div className="space-y-8">
            {/* Logo */}
            <div>
              <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStream" width={200} height={50} className="mb-6" />
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400">Live Pay-Per-View</p>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-[-0.03em]">
              {eventName}
            </h1>

            <div className="w-16 h-[2px] bg-white" />

            <p className="text-gray-400 text-lg">
              {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Countdown */}
            {timeLeft ? (
              <div>
                <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Event Starts In</p>
                <div className="flex gap-4">
                  {[
                    { value: timeLeft.days, label: 'Days' },
                    { value: timeLeft.hours, label: 'Hours' },
                    { value: timeLeft.minutes, label: 'Min' },
                    { value: timeLeft.seconds, label: 'Sec' },
                  ].map((unit) => (
                    <div key={unit.label} className="text-center">
                      <div className="bg-white/[0.05] border border-white/10 backdrop-blur-sm px-4 py-3 min-w-[72px]">
                        <span className="text-3xl sm:text-4xl font-bold tabular-nums">
                          {String(unit.value).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mt-2 block">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-red-400">Live Now</span>
              </div>
            )}

            {/* CTA area — changes based on access state */}
            <div className="space-y-4 pt-2">
              {accessState === 'has-access' ? (
                /* Purchased — waiting for stream or replay available */
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-white font-bold text-sm tracking-[0.15em] uppercase">Access Confirmed</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {replayUrl
                      ? 'The event has ended. Watch the full replay below.'
                      : eventStarted
                        ? 'The stream will begin shortly. Stay on this page.'
                        : "You're all set. The stream will appear here when we go live."}
                  </p>
                  {replayUrl && !isStreamLive && (
                    <button
                      onClick={handleWatchReplay}
                      className="bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                    >
                      Watch Replay
                    </button>
                  )}
                </div>
              ) : accessState === 'needs-purchase' ? (
                /* Not purchased — show buy button + recovery */
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {stripePriceId && (
                      <button
                        onClick={handlePurchase}
                        disabled={checkoutLoading}
                        className="group bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkoutLoading
                          ? 'Redirecting...'
                          : eventStarted
                            ? `Watch Live — ${priceDisplay}`
                            : `Get PPV Access — ${priceDisplay}`}
                      </button>
                    )}
                  </div>
                  {!showRecovery ? (
                    <button
                      onClick={() => setShowRecovery(true)}
                      className="text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Already purchased? Recover access
                    </button>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Enter the email you used at checkout</p>
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryError(null); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleRecoverAccess()}
                          placeholder="your@email.com"
                          className="flex-1 px-3 py-2 bg-black/50 border border-white/20 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white"
                        />
                        <button
                          onClick={handleRecoverAccess}
                          disabled={recoveryLoading || !recoveryEmail.trim()}
                          className="px-4 py-2 bg-white hover:bg-gray-200 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {recoveryLoading ? '...' : 'Recover'}
                        </button>
                      </div>
                      {recoveryError && <p className="text-red-400 text-xs mt-1">{recoveryError}</p>}
                    </div>
                  )}
                </div>
              ) : (
                /* Checking access… */
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Checking access…</span>
                </div>
              )}

              <a
                href="#past-events"
                className="inline-block border border-white/30 text-white font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-all hover:border-white hover:bg-white/5"
              >
                Past Events
              </a>
            </div>
          </div>

          {/* Right: Poster or live stream */}
          <div className="relative h-[400px] md:h-[520px] lg:h-[600px]">
            <div className="relative h-full w-full overflow-hidden border border-white/10">
              {/* Hidden video element — IVS player attaches here, shown when stream is live */}
              {accessState === 'has-access' && (
                <video
                  ref={videoRef}
                  playsInline
                  className={`absolute inset-0 w-full h-full object-contain ${isStreamLive ? 'z-10' : 'opacity-0 pointer-events-none'}`}
                />
              )}

              {/* Poster (or logo fallback) — always visible unless stream is live */}
              {!isStreamLive && (
                <>
                  {posterImage ? (
                    <Image src={posterImage} alt={eventName} fill className="object-contain bg-black" priority />
                  ) : (
                    <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                      <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStream" width={300} height={300} className="opacity-30" />
                    </div>
                  )}

                  {/* "Purchased" overlay badge */}
                  {accessState === 'has-access' && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-white">Purchased</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
