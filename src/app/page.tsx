import Stripe from 'stripe';
import Hero from '@/components/hero/Hero';
import EventHero from '@/components/hero/EventHero';
import HomeContent from '@/components/hero/HomeContent';
import Footer from '@/components/layout/Footer';
import { createServerClient } from '@/lib/supabase';
import { checkGeoRestriction } from '@/lib/geo';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface ActiveEvent {
  id: string;
  name: string;
  date: string;
  stripe_price_id: string | null;
  replay_url: string | null;
  expires_at: string | null;
  venue_address: string | null;
  blackout_radius_miles: number | null;
  // Populated from Stripe
  posterImage: string | null;
  priceCents: number;
  currency: string;
}

async function getActiveEvent(): Promise<ActiveEvent | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, stripe_price_id, replay_url, expires_at, venue_address, blackout_radius_miles')
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase active event error:', error);
      return null;
    }
    
    if (!data) return null;

    // Pull image and price directly from Stripe (like VODs do)
    let posterImage: string | null = null;
    let priceCents = 0;
    let currency = 'usd';

    if (data.stripe_price_id) {
      try {
        const price = await stripe.prices.retrieve(data.stripe_price_id, {
          expand: ['product'],
        });
        const product = price.product as Stripe.Product;
        posterImage = product.images?.[0] || null;
        priceCents = price.unit_amount ?? 0;
        currency = price.currency || 'usd';
      } catch (stripeErr) {
        console.error('Failed to fetch Stripe price/product:', stripeErr);
      }
    }

    return {
      ...data,
      posterImage,
      priceCents,
      currency,
    };
  } catch (err) {
    console.error('getActiveEvent exception:', err);
    return null;
  }
}

export default async function Home() {
  const activeEvent = await getActiveEvent();
  const geo = activeEvent?.venue_address
    ? await checkGeoRestriction(activeEvent.venue_address, activeEvent.blackout_radius_miles ?? 90)
    : null;

  return (
    <>
      {activeEvent && geo?.blocked ? (
        /* Geo-restricted — blackout message instead of event hero */
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
      ) : activeEvent ? (
        /* Active event replaces Hero, rest of page stays */
        <EventHero
          eventName={activeEvent.name}
          eventDate={activeEvent.date}
          posterImage={activeEvent.posterImage}
          priceCents={activeEvent.priceCents}
          stripePriceId={activeEvent.stripe_price_id}
          replayUrl={activeEvent.replay_url}
        />
      ) : (
        <Hero />
      )}
      <HomeContent />
      <Footer />
    </>
  );
}
