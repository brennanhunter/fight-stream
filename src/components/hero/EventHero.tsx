'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import FightPassPrompt, { hasSeenFightPassPrompt, markFightPassPromptSeen } from '@/components/FightPassPrompt';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const widthGrow = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

/* ── Component props ── */
interface EventHeroProps {
  eventName: string;
  eventDate: string;
  posterImage: string | null;
  priceCents: number;
  stripePriceId: string | null;
  replayUrl: string | null;
  subscriptionTier: 'basic' | 'premium' | null;
  isActive?: boolean;
  isStreaming?: boolean;
  eventId?: string;
  onInteraction?: (interacting: boolean) => void;
  geoBlocked?: boolean;
  ticketUrl?: string | null;
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

export default function EventHero({ eventName, eventDate, posterImage, priceCents, stripePriceId, replayUrl, subscriptionTier, isActive = true, isStreaming: initialIsStreaming = false, eventId, onInteraction, geoBlocked = false, ticketUrl }: EventHeroProps) {
  const priceDisplay = `$${(priceCents / 100).toFixed(2)}`;

  // Calculate discounted price display
  let ppvLabel: string;
  if (subscriptionTier === 'premium') {
    ppvLabel = 'Included with Fight Pass';
  } else if (subscriptionTier === 'basic') {
    const discounted = (priceCents * 0.75) / 100;
    ppvLabel = `$${discounted.toFixed(2)} (25% off with Fight Pass)`;
  } else {
    ppvLabel = priceDisplay;
  }

  /* ── Countdown ── */
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(eventDate));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeRemaining(eventDate)), 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  /* ── Stream live state — poll every 10s so button appears without a page refresh ── */
  const [isStreaming, setIsStreaming] = useState(initialIsStreaming);

  useEffect(() => {
    if (!isActive) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/stream-status');
        const data = await res.json();
        setIsStreaming(data.live);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(poll);
  }, [isActive]);

  /* ── Purchase / access state ── */
  const [accessState, setAccessState] = useState<'checking' | 'needs-purchase' | 'needs-recovery' | 'has-access'>('checking');
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  /* ── Check access on mount ── */
  useEffect(() => {
    if (!eventId) {
      setAccessState('needs-purchase');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/check-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        });
        const data = await res.json();
        if (data.purchased) {
          setAccessState('has-access');
          setIsSubscriber(data.isSubscriber ?? false);
        } else if (data.needsRecovery) {
          setAccessState('needs-recovery');
        } else {
          setAccessState('needs-purchase');
        }
      } catch {
        setAccessState('needs-purchase');
      }
    })();
  }, [eventId]);

  /* ── Fight Pass prompt state ── */
  const [showFightPassPrompt, setShowFightPassPrompt] = useState(false);

  /* ── Purchase handler ── */
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      onInteraction?.(true);
      return;
    }
    startCheckout();
  };

  /* ════════════════════════════════════════════
     RENDER: Portrait poster + left text column
     ════════════════════════════════════════════ */
  return (
    <section className="relative min-h-[80vh] lg:min-h-[92vh] bg-black text-white overflow-hidden flex items-center">
      {/* Cinematic atmosphere — blurred poster bleeds color into the whole section */}
      {posterImage ? (
        <div className="absolute inset-0">
          <Image
            src={posterImage}
            alt=""
            fill
            priority
            className="object-cover scale-125 blur-2xl opacity-70"
          />
          {/* Lighter horizontal fade so the blurred poster reads through */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
          {/* Slight vertical darken at top/bottom only */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black" />
        </div>
      ) : (
        /* No-poster fallback: brand-tinted atmosphere instead of straight black */
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-black" />
          {/* Radial red glow — boxing-brand atmosphere */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 70% 40%, rgba(220,38,38,0.35) 0%, transparent 55%)',
            }}
          />
          {/* Ring rope lines for texture */}
          <div className="ring-ropes absolute inset-0 opacity-50" />
          {/* Faint BoxStream watermark */}
          <div className="absolute right-[-4rem] bottom-[-2rem] opacity-[0.04] hidden md:block pointer-events-none">
            <Image
              src="/logos/BoxStreamVerticalLogo.png"
              alt=""
              width={520}
              height={520}
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black" />
        </div>
      )}

      <div className="noise-overlay opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Portrait poster — mobile: top; desktop: right */}
          <motion.div
            className="lg:col-span-5 lg:col-start-8 order-1 lg:order-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="relative aspect-[3/4] w-full max-w-xs sm:max-w-sm lg:max-w-none mx-auto flex items-center justify-center">
              {posterImage ? (
                /* object-contain so any aspect ratio (2:3, 3:4, 4:5, square) shows fully */
                <Image
                  src={posterImage}
                  alt={eventName}
                  fill
                  priority
                  sizes="(max-width: 1024px) 24rem, 40vw"
                  className="object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="aspect-[2/3] w-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                  <Image
                    src="/logos/BoxStreamVerticalLogo.png"
                    alt="BoxStream"
                    width={220}
                    height={220}
                    className="opacity-40"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Text column — mobile: bottom; desktop: left */}
          <motion.div
            className="lg:col-span-7 lg:col-start-1 lg:row-start-1 order-2 lg:order-1 space-y-6"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
          {/* Status row: date pill + Live badge + category */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap">
            {isActive && isStreaming ? (
              <span className="inline-flex items-center gap-2 bg-red-600 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live Now
              </span>
            ) : (
              <span className="inline-block bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                {new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
              {isActive ? 'Pay-Per-View' : 'Upcoming Event'}
            </span>
            {accessState === 'has-access' && (
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] uppercase">
                <svg aria-hidden="true" className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Purchased
              </span>
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-[-0.03em] drop-shadow-lg"
          >
            {eventName}
          </motion.h1>

          <motion.div variants={widthGrow} className="w-16 h-[2px] bg-white" />

          {/* Date subtitle */}
          <motion.p variants={fadeUp} className="text-gray-300 text-base md:text-lg max-w-md">
            {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </motion.p>

          {/* Compact countdown (only if upcoming) */}
          {timeLeft && (
            <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mr-1">Starts In</span>
              {[
                { value: timeLeft.days, label: 'D' },
                { value: timeLeft.hours, label: 'H' },
                { value: timeLeft.minutes, label: 'M' },
                { value: timeLeft.seconds, label: 'S' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 px-2.5 py-1.5 min-w-[52px] text-center flex items-baseline justify-center gap-1"
                >
                  <span className="text-lg font-bold tabular-nums">
                    {String(unit.value).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-gray-500">{unit.label}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* CTA + access state — same logic as before, just inlined into the column */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4 pt-2">
            {geoBlocked && !replayUrl ? (
              /* Geo-blackout — no live access from this location */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <svg aria-hidden="true" className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-white font-bold text-sm tracking-[0.15em] uppercase">Blackout Restriction</span>
                </div>
                <p className="text-gray-400 text-sm max-w-sm">
                  This event is blacked out in your area due to local broadcast restrictions. Attend the event in person or check back after the broadcast to purchase the replay.
                </p>
                {ticketUrl ? (
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                  >
                    Buy Live Tickets
                    <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 px-6 py-4 text-sm font-bold tracking-[0.15em] uppercase text-gray-500 cursor-not-allowed">
                    Blacked Out
                  </div>
                )}
                <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                  Questions?{' '}
                  <Link href="/contact" className="underline hover:text-gray-300 transition-colors">Contact us</Link>
                </p>
              </div>
            ) : accessState === 'has-access' ? (
              /* Purchased — show Watch Now */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white font-bold text-sm tracking-[0.15em] uppercase">Access Confirmed</span>
                </div>
                <p className="text-gray-400 text-sm">
                  {!isActive
                    ? "You're all set! Your access will be ready when the event goes live."
                    : replayUrl
                      ? 'The event has ended. Watch the full replay.'
                      : isStreaming
                        ? "It's showtime — watch now."
                        : "You're all set. Watch Now will appear when the stream starts."}
                </p>
                {replayUrl ? (
                  <>
                    <Link
                      href={eventId ? `/watch?event_id=${eventId}` : '/'}
                      className="group inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                    >
                      Watch Replay
                      <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                    </Link>
                    {eventDate && (
                      <p className="text-xs text-gray-500">
                        Replay available until{' '}
                        <span className="text-gray-300">
                          {new Date(new Date(eventDate).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    )}
                  </>
                ) : isActive && isStreaming ? (
                  <Link
                    href="/live"
                    className="group inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                  >
                    Watch Now
                    <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                  </Link>
                ) : null}
              </div>
            ) : accessState === 'needs-purchase' ? (
              /* Not purchased — show buy button + recovery */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-bold tracking-[0.15em] uppercase">Full refund if you can&apos;t access the stream</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {stripePriceId && (
                    <button
                      onClick={handlePurchase}
                      disabled={checkoutLoading}
                      className="group bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkoutLoading
                        ? 'Redirecting to Stripe…'
                        : subscriptionTier === 'premium'
                          ? replayUrl ? 'Buy Replay — Free' : isStreaming ? 'Watch Live — Free' : 'Get PPV Access — Free'
                          : replayUrl
                            ? `Buy Replay — ${ppvLabel}`
                            : isStreaming
                              ? `Watch Live — ${ppvLabel}`
                              : `Get PPV Access — ${ppvLabel}`}
                    </button>
                  )}
                </div>
                {checkoutError && (
                  <p role="alert" aria-live="polite" className="text-sm text-red-400">{checkoutError}</p>
                )}
                {replayUrl && eventDate && (
                  <p className="text-xs text-gray-500">
                    Replay available until{' '}
                    <span className="text-gray-300">
                      {new Date(new Date(eventDate).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                )}
                <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                  Issues?{' '}
                  <Link href="/contact" className="underline hover:text-gray-300 transition-colors">Contact us</Link>{' '}
                  and we&apos;ll make it right.
                </p>
                <Link
                  href="/recover-access"
                  className="text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Already purchased? Recover access
                </Link>
              </div>
            ) : accessState === 'needs-recovery' ? (
              /* Purchased but session expired — prompt recovery */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <svg aria-hidden="true" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-white font-bold text-sm tracking-[0.15em] uppercase">Session Expired</span>
                </div>
                <p className="text-gray-400 text-sm">
                  We found your purchase but your viewing session has expired. Recover access to continue watching.
                </p>
                <Link
                  href="/recover-access"
                  className="group inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200"
                >
                  Recover Access
                  <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
                <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                  Issues?{' '}
                  <Link href="/contact" className="underline hover:text-gray-300 transition-colors">Contact us</Link>{' '}
                  and we&apos;ll make it right.
                </p>
              </div>
            ) : (
              /* Checking access… */
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Checking access…</span>
              </div>
            )}
          </motion.div>
        </motion.div>
        </div>
      </div>

      {/* Fight Pass suggestion modal */}
      <FightPassPrompt
        open={showFightPassPrompt}
        onClose={() => {
          markFightPassPromptSeen();
          setShowFightPassPrompt(false);
          onInteraction?.(false);
        }}
        onContinue={() => {
          setShowFightPassPrompt(false);
          onInteraction?.(false);
          startCheckout();
        }}
      />
    </section>
  );
}
