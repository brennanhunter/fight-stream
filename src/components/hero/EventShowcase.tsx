'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EventHero from './EventHero';
import EventCardRail from './EventCardRail';

export interface CarouselEvent {
  id: string;
  name: string;
  date: string;
  stripe_price_id: string | null;
  replay_url: string | null;
  posterImage: string | null;
  priceCents: number;
  is_active: boolean;
  is_streaming: boolean;
  ticket_url: string | null;
}

interface EventShowcaseProps {
  events: CarouselEvent[];
  subscriptionTier: 'basic' | 'premium' | null;
  geoBlockedEventId?: string | null;
}

export default function EventShowcase({ events, subscriptionTier, geoBlockedEventId }: EventShowcaseProps) {
  // Default-feature the active event when present, else the first (soonest upcoming).
  const initialIndex = Math.max(0, events.findIndex((e) => e.is_active));
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  if (events.length === 0) return null;

  const currentEvent = events[activeIndex];

  function handleSelect(i: number) {
    if (i === activeIndex) return;
    setActiveIndex(i);
    // Smooth scroll to the top of the hero so the user sees the swap.
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
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
            isStreaming={currentEvent.is_streaming}
            eventId={currentEvent.id}
            geoBlocked={currentEvent.id === geoBlockedEventId}
            ticketUrl={currentEvent.ticket_url}
          />
        </motion.div>
      </AnimatePresence>

      {events.length > 1 && (
        <EventCardRail events={events} activeIndex={activeIndex} onSelect={handleSelect} />
      )}
    </>
  );
}
