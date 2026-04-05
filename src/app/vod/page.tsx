import Stripe from 'stripe';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';
import { PageTransition } from '@/components/motion';
import VodContent, { type VodProduct, type EventGroup } from './VodContent';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Video on Demand | BoxStreamTV - Watch Boxing Replays',
  description: 'Watch full boxing event replays and individual fight highlights on demand. Purchase and stream championship fights, knockouts, and more from BoxStreamTV.',
  openGraph: {
    title: 'Video on Demand | BoxStreamTV',
    description: 'Watch full boxing event replays and individual fight highlights on demand.',
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getProducts(): Promise<VodProduct[]> {
  const products: Stripe.Product[] = [];
  for await (const product of stripe.products.list({ active: true, expand: ['data.default_price'], limit: 100 })) {
    products.push(product);
  }

  return products
    .filter((p) => p.metadata.site === 'boxstreamtv' && (p.metadata.s3_key || p.metadata.available === 'false'))
    .map((p) => {
      const price = p.default_price as Stripe.Price;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0] || null,
        price: price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : null,
        currency: price?.currency || 'usd',
        priceId: price?.id,
        note: p.metadata.note || null,
        available: p.metadata.available !== 'false',
        featured: p.metadata.featured || null,
        sortOrder: parseInt(p.metadata.sort_order || '99', 10),
        eventSlug: p.metadata.event_slug || 'uncategorized',
        eventName: p.metadata.event_name || 'Other Fights',
        eventDate: p.metadata.event_date || '2020-01-01',
        eventImage: p.metadata.event_image
          ? p.metadata.event_image.startsWith('/') || p.metadata.event_image.startsWith('http')
            ? p.metadata.event_image
            : `/${p.metadata.event_image}`
          : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function groupByEvent(products: VodProduct[]): EventGroup[] {
  const groups: Record<string, EventGroup> = {};

  for (const product of products) {
    if (!groups[product.eventSlug]) {
      groups[product.eventSlug] = {
        slug: product.eventSlug,
        name: product.eventName,
        date: product.eventDate,
        image: product.eventImage,
        hasFeaturedFight: false,
        hasFullEvent: false,
        fightCount: 0,
        products: [],
      };
    }
    groups[product.eventSlug].products.push(product);
    groups[product.eventSlug].fightCount++;
    // Use explicit event_image if any product provides one, else fall back to first product image
    if (product.eventImage) {
      groups[product.eventSlug].image = product.eventImage;
    } else if (!groups[product.eventSlug].image && product.image) {
      groups[product.eventSlug].image = product.image;
    }
    // Track featured status by type
    if (product.featured === 'full-event') {
      groups[product.eventSlug].hasFullEvent = true;
    } else if (product.featured === 'true') {
      groups[product.eventSlug].hasFeaturedFight = true;
    }
  }

  // Sort events by date, newest first
  return Object.values(groups).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Get map of productId -> purchaseId for owned products
async function getOwnedProducts(): Promise<Record<string, string>> {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get('customer_email')?.value;
    if (!email) return {};

    const supabase = createServerClient();
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, stripe_product_id, stripe_session_id, expires_at')
      .eq('email', decodeURIComponent(email))
      .eq('purchase_type', 'vod');

    if (!purchases?.length) return {};

    const now = new Date();
    const owned: Record<string, string> = {};
    for (const p of purchases) {
      if (p.stripe_product_id) {
        // Skip expired purchases
        if (p.expires_at && new Date(p.expires_at) < now) continue;
        owned[p.stripe_product_id] = p.id || p.stripe_session_id;
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

              <VodContent events={events} ownedProducts={ownedProducts} subscriptionTier={subscriptionTier} />
            </>
          )}
        </div>
      </section>
      <Footer />
    </PageTransition>
  );
}
