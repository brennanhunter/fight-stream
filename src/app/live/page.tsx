import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier } from '@/lib/access';
import { checkGeoRestriction } from '@/lib/geo';
import LivePlayer from './LivePlayer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Watch Live | BoxStreamTV',
  description: 'Watch the live boxing event on BoxStreamTV.',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function LivePage() {
  const supabase = createServerClient();

  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, date, stripe_price_id, replay_url, venue_address, blackout_radius_miles')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) redirect('/');

  // Geo restriction — fields now fetched in the same query above
  if (activeEvent.venue_address) {
    const geo = await checkGeoRestriction(activeEvent.venue_address, activeEvent.blackout_radius_miles ?? 90);
    if (geo.blocked) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black px-6 pt-16">
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
      );
    }
  }

  let posterImage: string | null = null;
  let priceCents = 0;

  if (activeEvent.stripe_price_id) {
    try {
      const price = await stripe.prices.retrieve(activeEvent.stripe_price_id, {
        expand: ['product'],
      });
      const product = price.product as Stripe.Product;
      posterImage = product.images?.[0] || null;
      priceCents = price.unit_amount ?? 0;
    } catch { /* ignore */ }
  }

  let subscriptionTier: 'basic' | 'premium' | null = null;
  try {
    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (user) {
      subscriptionTier = await getSubscriptionTier(user.id);
    }
  } catch { /* not logged in */ }

  return (
    <>
      <LivePlayer
        eventId={activeEvent.id}
        eventName={activeEvent.name}
        eventDate={activeEvent.date}
        posterImage={posterImage}
        priceCents={priceCents}
        stripePriceId={activeEvent.stripe_price_id}
        replayUrl={activeEvent.replay_url}
        subscriptionTier={subscriptionTier}
      />
    </>
  );
}
