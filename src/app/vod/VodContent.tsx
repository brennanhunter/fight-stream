'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import VodBuyButton from './VodBuyButton';

export interface VodProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string | null;
  currency: string;
  priceId: string | undefined;
  note: string | null;
  available: boolean;
  featured: string | null; // 'true' = featured fight, 'full-event' = full event replay, null = regular
  sortOrder: number;
  eventSlug: string;
  eventName: string;
  eventDate: string;
  eventImage: string | null; // auto-populated from product image
}

export interface EventGroup {
  slug: string;
  name: string;
  date: string;
  image: string | null;
  hasFeaturedFight: boolean;
  hasFullEvent: boolean;
  fightCount: number;
  products: VodProduct[];
}

export default function VodContent({ events, ownedProducts, subscriptionTier }: { events: EventGroup[]; ownedProducts: Record<string, string>; subscriptionTier: 'basic' | 'premium' | null }) {
  const [selectedEvent, setSelectedEvent] = useState<EventGroup | null>(null);

  // Event Grid View
  if (!selectedEvent) {
    return (
      <div>
        {/* Event Grid - 3 columns, newest first */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {events.map((event) => (
            <button
              key={event.slug}
              onClick={() => setSelectedEvent(event)}
              className={`group relative overflow-visible text-left transition-all duration-300 transform hover:scale-[1.03] bg-black ${
                !event.hasFullEvent && !event.hasFeaturedFight
                  ? 'border border-white/10 hover:border-white/30 shadow-lg'
                  : ''
              }`}
            >
              {/* Glow overlay for full-event cards */}
              {event.hasFullEvent && (
                <div className="absolute inset-0 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5),0_0_30px_rgba(168,85,247,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8),0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(168,85,247,0.3)]" />
              )}
              {/* Glow overlay for featured cards */}
              {!event.hasFullEvent && event.hasFeaturedFight && (
                <div className="absolute inset-0 border-2 border-accent shadow-[0_0_15px_rgba(251,191,36,0.5),0_0_30px_rgba(251,191,36,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.8),0_0_60px_rgba(251,191,36,0.5),0_0_100px_rgba(251,191,36,0.3)]" />
              )}

              {/* Full Event Badge */}
              {event.hasFullEvent && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                    🎬 Full Event Available
                  </span>
                </div>
              )}

              {/* Featured Fight Badge (only if no full-event badge) */}
              {!event.hasFullEvent && event.hasFeaturedFight && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                    🏆 Featured
                  </span>
                </div>
              )}

              {/* Event Poster - Full display, no cropping */}
              <div className="relative bg-black overflow-hidden">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.name}
                    width={600}
                    height={900}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-white/[0.03] flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Event Info - Below poster */}
              <div className="p-4">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-gray-300 transition-colors">
                  {event.name}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-white font-semibold">{event.fightCount} {event.fightCount === 1 ? 'fight' : 'fights'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Fight View for Selected Event
  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => setSelectedEvent(null)}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">All Events</span>
      </button>

      {/* Event Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{selectedEvent.name}</h2>
        <p className="text-gray-400">
          {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          <span className="mx-2">·</span>
          {selectedEvent.fightCount} {selectedEvent.fightCount === 1 ? 'fight' : 'fights'} available
        </p>
      </div>

      {/* Full Event Replay - own row with full poster */}
      {selectedEvent.products
        .filter((p) => p.featured === 'full-event')
        .map((product) => (
          <div
            key={product.id}
            className="group relative mb-12 overflow-visible bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-900/30"
          >
            <div className="absolute inset-0 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5),0_0_30px_rgba(168,85,247,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8),0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(168,85,247,0.3)]" />

            {/* Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/30 uppercase tracking-wider">
                🎬 Full Event Replay
              </span>
            </div>

            {/* Full poster display - constrained height */}
            {product.image ? (
              <div className="bg-black flex justify-center">
                <Image
                  src={product.image}
                  alt={product.name}
                  width={800}
                  height={450}
                  className="w-auto max-h-[400px] object-contain"
                />
              </div>
            ) : (
              <div className="bg-black/50 flex items-center justify-center min-h-[200px] p-8">
                <h3 className="text-2xl sm:text-3xl font-bold text-white text-center">{product.name}</h3>
              </div>
            )}

            {/* Info bar below poster */}
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-gray-300 text-sm sm:text-base">{product.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {subscriptionTier ? (
                  <span className="text-sm text-gray-400 font-medium">Included with Fight Pass</span>
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-purple-400">
                    ${product.price}
                    <span className="text-gray-400 text-base ml-2 uppercase">{product.currency}</span>
                  </span>
                )}
                {ownedProducts[product.id] || subscriptionTier ? (
                  <Link
                    href={ownedProducts[product.id] ? `/watch?purchase_id=${ownedProducts[product.id]}` : `/watch?product_id=${product.id}`}
                    className="px-8 py-4 bg-white text-black text-xl font-bold hover:bg-gray-200 transition-all duration-300 border border-white inline-flex items-center gap-2 tracking-wide"
                  >
                    ▶ Watch
                  </Link>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} />
                ) : !product.available ? (
                  <span className="px-6 py-3 bg-transparent text-gray-500 text-sm font-bold border border-white/20 uppercase tracking-wider cursor-default">
                    Coming Soon
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}

      {/* Individual Fight Cards - 3 column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedEvent.products
          .filter((p) => p.featured !== 'full-event')
          .map((product) => (
            <div
              key={product.id}
              className={`group relative overflow-visible transition-all duration-300 hover:scale-[1.03] ${
                product.featured === 'true'
                  ? 'bg-gradient-to-b from-accent/10 to-primary/10'
                  : 'bg-black border border-white/10 hover:border-white/30 shadow-lg'
              }`}
            >
              {/* Glow overlay for featured fight cards */}
              {product.featured === 'true' && (
                <div className="absolute inset-0 border-2 border-accent shadow-[0_0_15px_rgba(251,191,36,0.5),0_0_30px_rgba(251,191,36,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.8),0_0_60px_rgba(251,191,36,0.5),0_0_100px_rgba(251,191,36,0.3)]" />
              )}

              {/* Featured Fight Badge */}
              {product.featured === 'true' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                    🏆 Featured
                  </span>
                </div>
              )}

              {/* Product Image */}
              {product.image ? (
                <div className="relative bg-black overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={600}
                    height={900}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="relative bg-black/50 overflow-hidden flex items-center justify-center min-h-[200px] p-6">
                  <p className="text-lg font-bold text-white text-center">{product.name}</p>
                </div>
              )}

              {/* Card Info */}
              <div className="p-4">
                <h3 className={`font-bold text-white mb-2 ${
                  product.featured === 'true' ? 'text-lg' : 'text-base'
                }`}>
                  {product.name}
                </h3>

                {product.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                )}

                {subscriptionTier ? (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400 font-medium">Included with Fight Pass</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-white">${product.price}</span>
                    <span className="text-xs text-gray-500 uppercase">{product.currency}</span>
                  </div>
                )}

                {ownedProducts[product.id] || subscriptionTier ? (
                  <Link
                    href={ownedProducts[product.id] ? `/watch?purchase_id=${ownedProducts[product.id]}` : `/watch?product_id=${product.id}`}
                    className="w-full text-center px-6 py-3 bg-white text-black text-base font-bold hover:bg-gray-200 transition-all duration-300 border border-white inline-flex items-center justify-center gap-2 tracking-wide"
                  >
                    ▶ Watch Now
                  </Link>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} />
                ) : !product.available ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-transparent text-gray-500 text-sm font-bold border border-white/20 uppercase tracking-wider cursor-default"
                  >
                    Coming Soon
                  </button>
                ) : null}

                {product.note && (
                  <div className="mt-3 p-3 bg-white/[0.03] border border-white/10">
                    <p className="text-xs text-gray-400">
                      <span className="text-white font-semibold">Note:</span> {product.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Back to Events - Bottom */}
      <div className="mt-12 text-center">
        <button
          onClick={() => setSelectedEvent(null)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors border border-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Browse More Events
        </button>
      </div>
    </div>
  );
}
