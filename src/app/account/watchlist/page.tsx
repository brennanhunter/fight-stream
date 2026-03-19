'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase';

interface Favorite {
  id: string;
  item_type: string;
  item_id: string;
  created_at: string;
}

export default function WatchlistPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setFavorites(data || []);
      setLoading(false);
    }

    loadFavorites();
  }, [supabase, router]);

  async function removeFavorite(id: string) {
    await supabase.from('favorites').delete().eq('id', id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h1 className="text-2xl font-bold text-white tracking-[0.15em] uppercase mb-8">
        Watchlist
      </h1>

      {favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center justify-between border border-white/10 p-4"
            >
              <div>
                <p className="text-sm text-white font-bold">{fav.item_id}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {fav.item_type} · Added{' '}
                  {new Date(fav.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => removeFavorite(fav.id)}
                className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
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
