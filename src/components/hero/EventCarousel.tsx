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
  const [streamLive, setStreamLive] = useState(false);
  const [userInteracting, setUserInteracting] = useState(false);

  const goToNext = useCallback(() => setActiveIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1)), [events.length]);
  const goToPrev = () => setActiveIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));

  // Auto-rotate every 5 seconds — pause when stream is live or user is interacting
  useEffect(() => {
    if (events.length <= 1 || streamLive || userInteracting) return;
    const timer = setInterval(goToNext, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, events.length, goToNext, streamLive, userInteracting]);

  // When stream goes live, snap to the active event
  const handleStreamLive = useCallback((isLive: boolean) => {
    setStreamLive(isLive);
    if (isLive) {
      const activeIdx = events.findIndex((e) => e.is_active);
      if (activeIdx !== -1) setActiveIndex(activeIdx);
    }
  }, [events]);

  // Reset streamLive when navigating away from the active event
  useEffect(() => {
    const current = events[activeIndex];
    if (current && !current.is_active && streamLive) {
      setStreamLive(false);
    }
  }, [activeIndex, events, streamLive]);

  if (events.length === 0) return null;

  const currentEvent = events[activeIndex];
  const showNav = events.length > 1 && !streamLive;

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
            onStreamLive={currentEvent.is_active ? handleStreamLive : undefined}
            onInteraction={setUserInteracting}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation — hide when stream is live */}
      {showNav && (
        <>
          {/* Left arrow — desktop: absolute mid-left; mobile: hidden (handled in bottom bar) */}
          <motion.button
            onClick={goToPrev}
            className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 backdrop-blur-sm border border-white/20 p-3 text-white hover:bg-white/10 transition-colors"
            aria-label="Previous event"
            animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.6)', '0 0 4px rgba(255,255,255,0.1)', '0 0 20px rgba(255,255,255,0.6)', '0 0 0px rgba(255,255,255,0)'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.1, 0.2, 0.3, 1] }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* Right arrow — desktop: absolute mid-right; mobile: hidden (handled in bottom bar) */}
          <motion.button
            onClick={goToNext}
            className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 backdrop-blur-sm border border-white/20 p-3 text-white hover:bg-white/10 transition-colors"
            aria-label="Next event"
            animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.6)', '0 0 4px rgba(255,255,255,0.1)', '0 0 20px rgba(255,255,255,0.6)', '0 0 0px rgba(255,255,255,0)'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.1, 0.2, 0.3, 1] }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>

          {/* Bottom nav bar: prev + label + dots + next */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">See Other Events</span>
            <div className="flex items-center gap-3">
              {/* Prev — mobile only */}
              <motion.button
                onClick={goToPrev}
                className="md:hidden bg-black/50 backdrop-blur-sm border border-white/20 p-2 text-white hover:bg-white/10 transition-colors"
                aria-label="Previous event"
                animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 18px rgba(255,255,255,0.5)', '0 0 0px rgba(255,255,255,0)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

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

              {/* Next — mobile only */}
              <motion.button
                onClick={goToNext}
                className="md:hidden bg-black/50 backdrop-blur-sm border border-white/20 p-2 text-white hover:bg-white/10 transition-colors"
                aria-label="Next event"
                animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 18px rgba(255,255,255,0.5)', '0 0 0px rgba(255,255,255,0)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
