import Stripe from 'stripe';
import type { Metadata } from 'next';
import Hero from '@/components/hero/Hero';
import EventCarousel from '@/components/hero/EventCarousel';
import type { CarouselEvent } from '@/components/hero/EventCarousel';
import HomeContent from '@/components/hero/HomeContent';
import Footer from '@/components/layout/Footer';
import { createServerClient } from '@/lib/supabase';
import { checkGeoRestriction } from '@/lib/geo';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BoxStreamTV | Live Boxing Streaming & Pay-Per-View Events',
  description: 'Watch live boxing matches, championship fights, and exclusive PPV events in HD. Stream boxing online with BoxStreamTV.',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getAllEvents(): Promise<CarouselEvent[]> {
  try {
    const supabase = createServerClient();

    // Fetch active events
    const { data: activeEvents, error: activeErr } = await supabase
      .from('events')
      .select('id, name, date, stripe_price_id, replay_url, is_active')
      .eq('is_active', true);

    if (activeErr) console.error('Supabase active events error:', activeErr);

    // Fetch upcoming events (future date, not active)
    const { data: upcomingEvents, error: upcomingErr } = await supabase
      .from('events')
      .select('id, name, date, stripe_price_id, replay_url, is_active')
      .eq('is_active', false)
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true });

    if (upcomingErr) console.error('Supabase upcoming events error:', upcomingErr);

    // Combine: active first, then upcoming sorted by date
    const allEvents = [...(activeEvents || []), ...(upcomingEvents || [])];

    if (allEvents.length === 0) return [];

    // Batch-fetch all needed prices in parallel (deduped) instead of N individual calls
    const uniquePriceIds = [...new Set(
      allEvents.map(e => e.stripe_price_id).filter((id): id is string => !!id)
    )];

    const priceMap = new Map<string, Stripe.Price>();
    if (uniquePriceIds.length > 0) {
      const results = await Promise.all(
        uniquePriceIds.map(async (id) => {
          try {
            return await stripe.prices.retrieve(id, { expand: ['product'] });
          } catch {
            return null;
          }
        })
      );
      for (const price of results) {
        if (price) priceMap.set(price.id, price);
      }
    }

    const enriched: CarouselEvent[] = allEvents.map((event) => {
      let posterImage: string | null = null;
      let priceCents = 0;

      if (event.stripe_price_id) {
        const price = priceMap.get(event.stripe_price_id);
        if (price) {
          const product = price.product as Stripe.Product;
          posterImage = product.images?.[0] || null;
          priceCents = price.unit_amount ?? 0;
        }
      }

      return {
        id: event.id,
        name: event.name,
        date: event.date,
        stripe_price_id: event.stripe_price_id,
        replay_url: event.replay_url,
        posterImage,
        priceCents,
        is_active: event.is_active,
      };
    });

    return enriched;
  } catch (err) {
    console.error('getAllEvents exception:', err);
    return [];
  }
}

export default async function Home() {
  const events = await getAllEvents();
  const activeEvent = events.find((e) => e.is_active) || null;

  // Geo-restrict only the active event
  let geoBlocked = false;
  if (activeEvent) {
    const supabase = createServerClient();
    const { data: eventGeo } = await supabase
      .from('events')
      .select('venue_address, blackout_radius_miles')
      .eq('id', activeEvent.id)
      .maybeSingle();

    if (eventGeo?.venue_address) {
      const geo = await checkGeoRestriction(eventGeo.venue_address, eventGeo.blackout_radius_miles ?? 90);
      geoBlocked = geo.blocked;
    }
  }

  // Get subscription tier for logged-in users
  let subscriptionTier: 'basic' | 'premium' | null = null;
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      subscriptionTier = await getSubscriptionTier(user.id);
    }
  } catch {
    // Not logged in — no discount
  }

  return (
    <>
      {activeEvent && geoBlocked ? (
        /* Geo-restricted — blackout message */
        <div className="min-h-screen flex items-center justify-center bg-black px-6">
          <div className="max-w-lg text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Blackout Restriction</h1>
            <p className="text-gray-400 text-lg mb-2">
              This event is blacked out in your area due to local broadcast restrictions.
            </p>
            <p className="text-gray-500 text-sm">
              Please attend the event in person or check back after the broadcast window ends.
            </p>
          </div>
        </div>
      ) : events.length > 0 ? (
        <EventCarousel events={events} subscriptionTier={subscriptionTier} />
      ) : (
        <Hero />
      )}
      <HomeContent />
      <Footer />
    </>
  );
}
