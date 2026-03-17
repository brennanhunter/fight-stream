'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface EventHeroProps {
  eventName: string;
  eventDate: string;
  posterImage: string | null;
  priceCents: number;
  currency: string;
  stripePriceId: string | null;
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

export default function EventHero({ eventName, eventDate, posterImage, priceCents, currency, stripePriceId }: EventHeroProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(eventDate));
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const priceDisplay = `$${(priceCents / 100).toFixed(2)}`;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(eventDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

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
      if (!res.ok) {
        console.error('Checkout error:', data.error);
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutLoading(false);
    }
  };

  const eventStarted = !timeLeft;

  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden flex items-center">
      {/* Background poster with dark overlay */}
      {posterImage && (
        <div className="absolute inset-0">
          <Image
            src={posterImage}
            alt={eventName}
            fill
            className="object-cover opacity-20 blur-sm"
            priority
          />
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
              <Image
                src="/logos/BoxStreamVerticalLogo.png"
                alt="BoxStream"
                width={200}
                height={50}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400">
                Live Pay-Per-View
              </p>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-[-0.03em]">
              {eventName}
            </h1>

            <div className="w-16 h-[2px] bg-white" />

            <p className="text-gray-400 text-lg">
              {new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>

            {/* Countdown */}
            {timeLeft ? (
              <div>
                <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">
                  Event Starts In
                </p>
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
                <span className="text-sm font-bold tracking-[0.2em] uppercase text-red-400">
                  Live Now
                </span>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2">
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
              <a
                href="#past-events"
                className="border border-white/30 text-white font-bold px-8 py-4 text-sm tracking-[0.15em] uppercase transition-all hover:border-white hover:bg-white/5"
              >
                Past Events
              </a>
            </div>
          </div>

          {/* Right: Event Poster */}
          <div className="relative h-[400px] md:h-[520px] lg:h-[600px]">
            <div className="relative h-full w-full overflow-hidden border border-white/10">
              {posterImage ? (
                <Image
                  src={posterImage}
                  alt={eventName}
                  fill
                  className="object-contain bg-black"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                  <Image
                    src="/logos/BoxStreamVerticalLogo.png"
                    alt="BoxStream"
                    width={300}
                    height={300}
                    className="opacity-30"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
