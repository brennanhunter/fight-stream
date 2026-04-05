'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EventHero from './EventHero';

export interface CarouselEvent {
  id: string;
  name: string;
  date: string;
  stripe_price_id: string | null;
  replay_url: string | null;
  posterImage: string | null;
  priceCents: number;
  is_active: boolean;
}

interface EventCarouselProps {
  events: CarouselEvent[];
  subscriptionTier: 'basic' | 'premium' | null;
}

export default function EventCarousel({ events, subscriptionTier }: EventCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (events.length === 0) return null;

  const currentEvent = events[activeIndex];

  const goToNext = useCallback(() => setActiveIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1)), [events.length]);
  const goToPrev = () => setActiveIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));

  // Auto-rotate every 8 seconds, reset timer on manual navigation
  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(goToNext, 8000);
    return () => clearInterval(timer);
  }, [activeIndex, events.length, goToNext]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <EventHero
            eventName={currentEvent.name}
            eventDate={currentEvent.date}
            posterImage={currentEvent.posterImage}
            priceCents={currentEvent.priceCents}
            stripePriceId={currentEvent.stripe_price_id}
            replayUrl={currentEvent.replay_url}
            subscriptionTier={subscriptionTier}
            isActive={currentEvent.is_active}
            eventId={currentEvent.id}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation — only show when multiple events */}
      {events.length > 1 && (
        <>
          {/* Left arrow */}
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 backdrop-blur-sm border border-white/20 p-3 text-white hover:bg-white/10 transition-colors"
            aria-label="Previous event"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 backdrop-blur-sm border border-white/20 p-3 text-white hover:bg-white/10 transition-colors"
            aria-label="Next event"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {events.map((event, i) => (
              <button
                key={event.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`Go to ${event.name}`}
                className={`w-3 h-3 rounded-full border border-white/30 transition-all ${
                  i === activeIndex
                    ? 'bg-white scale-110'
                    : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
