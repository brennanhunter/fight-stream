'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import VodBuyButton from './VodBuyButton';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import { createBrowserClient } from '@/lib/supabase';
import type { VodProduct, EventGroup } from '@/lib/vod';

function WatchlistButton({ productId, isInWatchlist, onToggle }: { productId: string; isInWatchlist: boolean; onToggle: (productId: string) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(productId);
      }}
      className={`absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-black/70 border transition-colors ${
        isInWatchlist
          ? 'border-white/40 text-white hover:text-red-400 hover:border-red-400/50'
          : 'border-white/20 text-gray-500 hover:text-white hover:border-white/40'
      }`}
      aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <svg className="w-4 h-4" fill={isInWatchlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}

export default function VodContent({ events, ownedProducts, subscriptionTier, initialWatchlist }: { events: EventGroup[]; ownedProducts: Record<string, { purchaseId: string; expiresAt: string | null }>; subscriptionTier: 'basic' | 'premium' | null; initialWatchlist: string[] }) {
  const [selectedEvent, setSelectedEvent] = useState<EventGroup | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(initialWatchlist));
  const supabase = createBrowserClient();

  const toggleWatchlist = useCallback(async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const isInWatchlist = watchlist.has(productId);

    // Optimistic update
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (isInWatchlist) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    if (isInWatchlist) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', 'vod')
        .eq('item_id', productId);
      if (error) {
        setWatchlist((prev) => new Set(prev).add(productId));
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_type: 'vod', item_id: productId });
      if (error) {
        setWatchlist((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    }
  }, [watchlist, supabase]);

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
              aria-label={`View fights for ${event.name}`}
              className="group relative overflow-visible text-left transition-all duration-300 transform hover:scale-[1.03] bg-black"
            >
              {/* Glow overlay for full-event cards */}
              {event.hasFullEvent && (
                <div className="absolute inset-0 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5),0_0_30px_rgba(168,85,247,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.8),0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(168,85,247,0.3)]" />
              )}
              {/* Glow overlay for featured cards */}
              {!event.hasFullEvent && event.hasFeaturedFight && (
                <div className="absolute inset-0 border-2 border-accent shadow-[0_0_15px_rgba(251,191,36,0.5),0_0_30px_rgba(251,191,36,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.8),0_0_60px_rgba(251,191,36,0.5),0_0_100px_rgba(251,191,36,0.3)]" />
              )}
              {/* Glow overlay for basic cards */}
              {!event.hasFullEvent && !event.hasFeaturedFight && (
                <div className="absolute inset-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.15),0_0_20px_rgba(255,255,255,0.08)] pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4),0_0_40px_rgba(255,255,255,0.2),0_0_70px_rgba(255,255,255,0.1)]" />
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
                {(event.image || event.products.find(p => p.image)?.image) ? (
                  <Image
                    src={(event.image || event.products.find(p => p.image)?.image)!}
                    alt={event.name}
                    width={600}
                    height={900}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-white/[0.03] flex items-center justify-center px-6">
                    <h3 className="text-2xl font-bold text-white text-center">{event.name}</h3>
                  </div>
                )}
              </div>

              {/* Event Info - Below poster */}
              <div className="p-4">
                <h3 className="font-bold text-white text-base sm:text-lg mb-1 group-hover:text-gray-300 transition-colors">
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
        aria-label="Back to all events"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
      >
        <svg aria-hidden="true" className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Watchlist Button */}
            <WatchlistButton productId={product.id} isInWatchlist={watchlist.has(product.id)} onToggle={toggleWatchlist} />

            {/* Purchased Badge */}
            {(ownedProducts[product.id] || subscriptionTier) && (
              <div className="absolute top-4 right-14 z-20">
                <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 px-3 py-1.5 backdrop-blur-sm">
                  <svg aria-hidden="true" className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-green-400">Purchased</span>
                </div>
              </div>
            )}

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
                ) : product.price ? (
                  <span className="text-3xl sm:text-4xl font-bold text-purple-400">
                    ${product.price}
                    <span className="text-gray-400 text-base ml-2 uppercase">{product.currency}</span>
                  </span>
                ) : null}
                {ownedProducts[product.id] || subscriptionTier ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Link
                      href={ownedProducts[product.id] ? `/watch?purchase_id=${ownedProducts[product.id].purchaseId}` : `/watch?product_id=${product.id}`}
                      className="px-8 py-4 bg-white text-black text-xl font-bold hover:bg-gray-200 transition-all duration-300 border border-white inline-flex items-center gap-2 tracking-wide"
                    >
                      <span aria-hidden="true">▶</span> Watch
                    </Link>
                    {ownedProducts[product.id]?.expiresAt && (
                      <ExpiryCountdown expiresAt={ownedProducts[product.id].expiresAt!} />
                    )}
                  </div>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} subscriptionTier={subscriptionTier} />
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
                  : 'bg-black'
              }`}
            >
              {/* Glow overlay for featured fight cards */}
              {product.featured === 'true' && (
                <div className="absolute inset-0 border-2 border-accent shadow-[0_0_15px_rgba(251,191,36,0.5),0_0_30px_rgba(251,191,36,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.8),0_0_60px_rgba(251,191,36,0.5),0_0_100px_rgba(251,191,36,0.3)]" />
              )}
              {/* Glow overlay for basic fight cards */}
              {product.featured !== 'true' && (
                <div className="absolute inset-0 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.15),0_0_20px_rgba(255,255,255,0.08)] pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4),0_0_40px_rgba(255,255,255,0.2),0_0_70px_rgba(255,255,255,0.1)]" />
              )}

              {/* Featured Fight Badge */}
              {product.featured === 'true' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                    🏆 Featured
                  </span>
                </div>
              )}

              {/* Watchlist Button */}
              <WatchlistButton productId={product.id} isInWatchlist={watchlist.has(product.id)} onToggle={toggleWatchlist} />

              {/* Purchased Badge */}
              {(ownedProducts[product.id] || subscriptionTier) && (
                <div className="absolute top-3 right-14 z-20">
                  <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 px-2.5 py-1 backdrop-blur-sm">
                    <svg aria-hidden="true" className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-green-400">Purchased</span>
                  </div>
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
                  <p className="text-base sm:text-lg font-bold text-white text-center">{product.name}</p>
                </div>
              )}

              {/* Card Info */}
              <div className="p-4">
                <h3 className={`font-bold text-white mb-2 ${
                  product.featured === 'true' ? 'text-base sm:text-lg' : 'text-base'
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
                ) : product.price ? (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-white">${product.price}</span>
                    <span className="text-xs text-gray-500 uppercase">{product.currency}</span>
                  </div>
                ) : null}

                {ownedProducts[product.id] || subscriptionTier ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Link
                      href={ownedProducts[product.id] ? `/watch?purchase_id=${ownedProducts[product.id].purchaseId}` : `/watch?product_id=${product.id}`}
                      className="w-full text-center px-6 py-3 bg-white text-black text-base font-bold hover:bg-gray-200 transition-all duration-300 border border-white inline-flex items-center justify-center gap-2 tracking-wide"
                    >
                      <span aria-hidden="true">▶</span> Watch Now
                    </Link>
                    {ownedProducts[product.id]?.expiresAt && (
                      <ExpiryCountdown expiresAt={ownedProducts[product.id].expiresAt!} />
                    )}
                  </div>
                ) : product.available && product.priceId ? (
                  <VodBuyButton priceId={product.priceId} subscriptionTier={subscriptionTier} />
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
