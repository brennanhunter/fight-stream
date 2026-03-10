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

export default function VodContent({ events, ownedProducts }: { events: EventGroup[]; ownedProducts: Record<string, string> }) {
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
              className={`group relative rounded-2xl overflow-hidden text-left transition-all duration-300 transform hover:scale-[1.03] hover:shadow-2xl bg-gray-900/50 ${
                event.hasFullEvent
                  ? 'border-2 border-purple-500/50 shadow-xl shadow-purple-500/20'
                  : event.hasFeaturedFight
                    ? 'border-2 border-accent/50 shadow-xl shadow-accent/20'
                    : 'border border-gray-800 hover:border-accent/40 shadow-lg'
              }`}
            >
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
              <div className="relative bg-black">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.name}
                    width={600}
                    height={900}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Event Info - Below poster */}
              <div className="p-4">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-accent transition-colors">
                  {event.name}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-accent font-semibold">{event.fightCount} {event.fightCount === 1 ? 'fight' : 'fights'}</span>
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
        className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-8 transition-colors group"
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
            className="relative mb-12 rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-900/30 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20"
          >
            {/* Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/30 uppercase tracking-wider">
                🎬 Full Event Replay
              </span>
            </div>

            {/* Full poster display - constrained height */}
            {product.image && (
              <div className="bg-black flex justify-center">
                <Image
                  src={product.image}
                  alt={product.name}
                  width={800}
                  height={450}
                  className="w-auto max-h-[400px] object-contain"
                />
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
                <span className="text-3xl sm:text-4xl font-bold text-purple-400">
                  ${product.price}
                  <span className="text-gray-400 text-base ml-2 uppercase">{product.currency}</span>
                </span>
                {ownedProducts[product.id] ? (
                  <Link
                    href={`/watch?purchase_id=${ownedProducts[product.id]}`}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-600/30 border border-green-500/20 inline-flex items-center gap-2"
                  >
                    ▶ Watch
                  </Link>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} />
                ) : !product.available ? (
                  <span className="px-6 py-3 bg-gray-700 text-gray-300 text-sm font-bold rounded-xl border border-gray-600 uppercase tracking-wider cursor-default">
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
              className={`relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${
                product.featured === 'true'
                  ? 'bg-gradient-to-b from-accent/10 to-primary/10 border-2 border-accent/50 shadow-xl shadow-accent/20'
                  : 'bg-gray-900/50 border border-gray-800 hover:border-accent/40 shadow-lg'
              }`}
            >
              {/* Featured Fight Badge */}
              {product.featured === 'true' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                    🏆 Featured
                  </span>
                </div>
              )}

              {/* Product Image */}
              {product.image && (
                <div className="relative aspect-video bg-black">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
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

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-accent">${product.price}</span>
                  <span className="text-xs text-gray-500 uppercase">{product.currency}</span>
                </div>

                {ownedProducts[product.id] ? (
                  <Link
                    href={`/watch?purchase_id=${ownedProducts[product.id]}`}
                    className="w-full text-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-base font-bold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-600/30 border border-green-500/20 inline-flex items-center justify-center gap-2"
                  >
                    ▶ Watch Now
                  </Link>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} />
                ) : !product.available ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-700 text-gray-300 text-sm font-bold rounded-xl border border-gray-600 uppercase tracking-wider cursor-default"
                  >
                    Coming Soon
                  </button>
                ) : null}

                {product.note && (
                  <div className="mt-3 p-3 bg-yellow-900/20 border border-accent/30 rounded-lg">
                    <p className="text-xs text-gray-300">
                      <span className="text-accent font-semibold">Note:</span> {product.note}
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700"
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
