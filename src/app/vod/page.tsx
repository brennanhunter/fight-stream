import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';
import { PageTransition } from '@/components/motion';
import VodContent from './VodContent';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { getProducts, groupByEvent } from '@/lib/vod';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Boxing Replays & VOD | BoxStreamTV - Watch Past Fights',
  description: 'Watch full boxing event replays and fight highlights on demand. Stream past PPV events, championship bouts, knockouts, and amateur boxing matches from BoxStreamTV.',
  keywords: [
    'boxing replays',
    'watch boxing on demand',
    'boxing VOD',
    'boxing highlights online',
    'past boxing matches',
    'boxing fight replays',
    'PPV boxing replay',
    'amateur boxing VOD',
  ],
  alternates: {
    canonical: 'https://boxstreamtv.com/vod',
  },
  openGraph: {
    title: 'Boxing Replays & VOD | BoxStreamTV',
    description: 'Watch full boxing event replays and fight highlights on demand. Stream past PPV events, knockouts, and amateur bouts.',
    url: 'https://boxstreamtv.com/vod',
  },
};



// Get map of productId -> { purchaseId, expiresAt } for owned products
async function getOwnedProducts(): Promise<Record<string, { purchaseId: string; expiresAt: string | null }>> {
  try {
    const supabase = createServerClient();
    const owned: Record<string, { purchaseId: string; expiresAt: string | null }> = {};
    const now = new Date();

    // Check by authenticated user first
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id, stripe_product_id, stripe_session_id, expires_at')
          .eq('user_id', user.id)
          .eq('purchase_type', 'vod');

        if (purchases?.length) {
          for (const p of purchases) {
            if (p.stripe_product_id) {
              if (p.expires_at && new Date(p.expires_at) < now) continue;
              owned[p.stripe_product_id] = { purchaseId: p.id || p.stripe_session_id, expiresAt: p.expires_at ?? null };
            }
          }
        }
      }
    } catch {
      // Not logged in — continue to cookie check
    }

    // Also check by customer_email cookie
    const cookieStore = await cookies();
    const email = cookieStore.get('customer_email')?.value;
    if (email) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, stripe_product_id, stripe_session_id, expires_at')
        .eq('email', decodeURIComponent(email).toLowerCase())
        .eq('purchase_type', 'vod');

      if (purchases?.length) {
        for (const p of purchases) {
          if (p.stripe_product_id && !owned[p.stripe_product_id]) {
            if (p.expires_at && new Date(p.expires_at) < now) continue;
            owned[p.stripe_product_id] = { purchaseId: p.id || p.stripe_session_id, expiresAt: p.expires_at ?? null };
          }
        }
      }
    }

    return owned;
  } catch {
    return {};
  }
}

async function getSubscriptionInfo(): Promise<'basic' | 'premium' | null> {
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return getSubscriptionTier(user.id);
  } catch {
    return null;
  }
}

export default async function VodPage() {
  const [products, ownedProducts, subscriptionTier] = await Promise.all([
    getProducts(),
    getOwnedProducts(),
    getSubscriptionInfo(),
  ]);
  const events = groupByEvent(products);

  // Fetch user's watchlist favorites
  let watchlistIds: string[] = [];
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('favorites')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'vod');
      watchlistIds = (data || []).map((f: { item_id: string }) => f.item_id);
    }
  } catch {
    // Not logged in — no watchlist
  }

  return (
    <PageTransition>
      <section className="min-h-screen bg-black overflow-x-hidden pt-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
              Library
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Video on Demand
            </h1>
            <div className="w-16 h-[2px] bg-white mt-6" />
          </div>

          {events.length === 0 ? (
            <div className="text-center py-24">
              <h2 className="text-2xl font-bold text-white mb-4">No Replays Available Yet</h2>
              <p className="text-gray-400 text-lg">
                Check back soon — new fight replays will be added here.
              </p>
            </div>
          ) : (
            <>
              {!subscriptionTier && (
                <div className="mb-10 border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Unlock the entire library</h2>
                    <p className="text-sm text-gray-400">Get unlimited access to all VOD replays with Fight Pass.</p>
                  </div>
                  <a
                    href="/pricing"
                    className="flex-shrink-0 px-6 py-3 bg-white text-black text-sm font-bold tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors border border-white"
                  >
                    View Plans
                  </a>
                </div>
              )}

              <VodContent events={events} ownedProducts={ownedProducts} subscriptionTier={subscriptionTier} initialWatchlist={watchlistIds} />
            </>
          )}
        </div>
      </section>
      <Footer />
    </PageTransition>
  );
}
