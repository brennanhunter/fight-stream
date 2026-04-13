'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase';
import type { VodProduct } from '@/lib/vod';

interface WatchlistItem {
  favoriteId: string;
  product: VodProduct;
  owned: { purchaseId: string; expiresAt: string | null } | null;
}

export default function WatchlistContent({
  items: initialItems,
  subscriptionTier,
}: {
  items: WatchlistItem[];
  subscriptionTier: 'basic' | 'premium' | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);
  const supabase = createBrowserClient();

  async function removeFavorite(favoriteId: string) {
    setRemoving(favoriteId);
    setItems((prev) => prev.filter((item) => item.favoriteId !== favoriteId));
    const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);
    if (error) {
      // Revert on failure
      setItems(initialItems);
    }
    setRemoving(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">Account</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Watchlist</h1>
        <div className="w-12 h-[2px] bg-white mt-4" />
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map(({ favoriteId, product, owned }) => (
            <div
              key={favoriteId}
              className={`group relative overflow-visible transition-all duration-300 bg-black border border-white/10 hover:border-white/30 shadow-lg ${
                removing === favoriteId ? 'opacity-50' : ''
              }`}
            >
              {/* Featured badges */}
              {product.featured === 'full-event' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                    🎬 Full Event
                  </span>
                </div>
              )}
              {product.featured === 'true' && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">
                    🏆 Featured
                  </span>
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeFavorite(favoriteId)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/70 border border-white/20 text-gray-400 hover:text-red-400 hover:border-red-400/50 transition-colors"
                aria-label="Remove from watchlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

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
                <h3 className="font-bold text-white text-base mb-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">
                  {product.eventName} · {new Date(product.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {product.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                )}

                {owned || subscriptionTier ? (
                  <Link
                    href={owned ? `/watch?purchase_id=${owned.purchaseId}` : `/watch?product_id=${product.id}`}
                    className="w-full text-center px-6 py-3 bg-white text-black text-base font-bold hover:bg-gray-200 transition-all duration-300 border border-white inline-flex items-center justify-center gap-2 tracking-wide"
                  >
                    <span aria-hidden="true">▶</span> Watch Now
                  </Link>
                ) : product.price ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white">${product.price}</span>
                    <Link
                      href="/vod"
                      className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 hover:text-white transition-colors"
                    >
                      View in Store →
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-white/10">
          <p className="text-sm text-gray-500 mb-4">Your watchlist is empty.</p>
          <a
            href="/vod"
            className="text-[10px] font-bold tracking-[0.2em] uppercase text-white hover:underline"
          >
            Browse VOD →
          </a>
        </div>
      )}
    </motion.div>
  );
}
