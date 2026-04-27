'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { CarouselEvent } from './EventShowcase';

interface EventCardRailProps {
  events: CarouselEvent[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priceLabel(event: CarouselEvent) {
  if (event.is_active && event.is_streaming) return 'Live Now';
  if (event.priceCents > 0) return `$${(event.priceCents / 100).toFixed(0)}`;
  return 'Free';
}

export default function EventCardRail({ events, activeIndex, onSelect }: EventCardRailProps) {
  return (
    <section className="bg-black border-t border-white/10 px-4 sm:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-1">
              All Events
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Upcoming &amp; Featured
            </h2>
          </div>
          <span className="hidden sm:block text-[10px] tracking-[0.2em] uppercase text-gray-600">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Select event"
          className="grid grid-flow-col auto-cols-[80%] sm:auto-cols-[45%] lg:auto-cols-[30%] gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-3"
          style={{ scrollbarWidth: 'thin' }}
        >
          {events.map((event, i) => {
            const isActive = i === activeIndex;
            const isLive = event.is_active && event.is_streaming;
            return (
              <motion.button
                key={event.id}
                role="tab"
                aria-selected={isActive}
                aria-label={`Show ${event.name}`}
                onClick={() => onSelect(i)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`group relative snap-start text-left overflow-hidden border transition-colors ${
                  isActive
                    ? 'border-white'
                    : 'border-white/10 hover:border-white/40'
                }`}
              >
                <div className="relative aspect-[16/10] bg-gray-900">
                  {event.posterImage ? (
                    <Image
                      src={event.posterImage}
                      alt={event.name}
                      fill
                      sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 30vw"
                      className={`object-cover transition-opacity ${isActive ? 'opacity-90' : 'opacity-60 group-hover:opacity-80'}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs tracking-[0.2em] uppercase">
                      No Poster
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Status pill */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isLive && (
                      <span className="text-[9px] font-bold tracking-[0.2em] uppercase bg-red-600 text-white px-2 py-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Live
                      </span>
                    )}
                    {event.is_active && !isLive && (
                      <span className="text-[9px] font-bold tracking-[0.2em] uppercase bg-white text-black px-2 py-0.5">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Active marker */}
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[9px] font-bold tracking-[0.2em] uppercase border border-white/60 text-white px-2 py-0.5">
                        Showing
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-black">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                    {formatDate(event.date)}
                  </p>
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-2 mb-3">
                    {event.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${isLive ? 'text-red-400' : 'text-gray-300'}`}>
                      {priceLabel(event)}
                    </span>
                    <span className={`text-[10px] tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-white'}`}>
                      {isActive ? 'Selected' : 'View →'}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-600 mt-4 text-center sm:text-left">
          Tap a card to view that event.
        </p>
      </div>
    </section>
  );
}
