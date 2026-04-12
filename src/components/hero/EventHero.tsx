'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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
}

/* ── 3D Tilt + Float Poster Card ── */
function PosterCard({
  posterImage,
  eventName,
  accessState,
}: {
  posterImage: string | null;
  eventName: string;
  accessState: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Raw mouse position mapped to rotation degrees
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring-smoothed rotation for the tilt
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  // Shifting shadow for the "pop off screen" depth
  const shadowX = useTransform(rotateY, [-8, 8], [20, -20]);
  const shadowY = useTransform(rotateX, [-8, 8], [-20, 20]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative h-[400px] md:h-[520px] lg:h-[600px]"
      style={{ perspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' as const }}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden border border-white/10 will-change-transform"
        style={{
          rotateX,
          rotateY,
          boxShadow: useTransform(
            [shadowX, shadowY],
            ([sx, sy]) => `${sx}px ${sy}px 40px rgba(255,255,255,0.07)`,
          ),
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      >
        {/* Poster (or logo fallback) */}
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
      </motion.div>
    </motion.div>
  );
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

export default function EventHero({ eventName, eventDate, posterImage, priceCents, stripePriceId, replayUrl, subscriptionTier, isActive = true, isStreaming: initialIsStreaming = false, eventId, onInteraction }: EventHeroProps) {
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
     RENDER: Info layout
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 lg:items-start">
          {/* Top: Logo, fight name, date, countdown */}
          <motion.div
            className="space-y-8"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div variants={fadeUp}>
              <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStream" width={200} height={50} className="mb-6" />
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400">{isActive ? 'Live Pay-Per-View' : 'Upcoming Event'}</p>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-[-0.03em]">
              {eventName}
            </motion.h1>

            <motion.div variants={widthGrow} className="w-16 h-[2px] bg-white" />

            <motion.p variants={fadeUp} className="text-gray-400 text-lg">
              {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </motion.p>

            {/* Countdown */}
            {timeLeft ? (
              <motion.div variants={fadeUp}>
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
              </motion.div>
            ) : isStreaming ? (
              <motion.div variants={fadeUp} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-red-400">Live Now</span>
              </motion.div>
            ) : replayUrl ? (
              <motion.div variants={fadeUp} className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-gray-400">Replay Available</span>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-yellow-400">Almost Showtime</span>
              </motion.div>
            )}
          </motion.div>

          {/* Poster — mobile: after fight info; desktop: right col spanning both rows */}
          <div className="lg:row-span-2 lg:row-start-1 lg:col-start-2">
            <PosterCard
              posterImage={posterImage}
              eventName={eventName}
              accessState={accessState}
            />
          </div>

          {/* CTA — mobile: after poster; desktop: left col row 2 */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4 pt-2 lg:col-start-1 lg:row-start-2">
            {accessState === 'has-access' ? (
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
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        ? 'Redirecting...'
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
                  <p className="text-sm text-red-400">{checkoutError}</p>
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
                  Issues? Email{' '}
                  <a href="mailto:hunter@boxstreamtv.com" className="underline hover:text-gray-300 transition-colors">hunter@boxstreamtv.com</a>{' '}
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
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  Issues? Email{' '}
                  <a href="mailto:hunter@boxstreamtv.com" className="underline hover:text-gray-300 transition-colors">hunter@boxstreamtv.com</a>{' '}
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
