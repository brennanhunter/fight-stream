import { redirect } from 'next/navigation';
import type { Stripe } from 'stripe';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import { getSubscriptionTier, hasPpvAccess } from '@/lib/access';
import { checkGeoRestriction } from '@/lib/geo';
import { stripeServer } from '@/lib/stripe';
import LivePlayer from './LivePlayer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Watch Live | BoxStreamTV',
  description: 'Watch the live boxing event on BoxStreamTV.',
};

export default async function LivePage() {
  const supabase = createServerClient();

  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, date, stripe_price_id, replay_url, venue_address, blackout_radius_miles')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) redirect('/');

  // Resolve the current user early — needed to exempt subscribers and existing purchasers from geo
  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  let subscriptionTier: 'basic' | 'premium' | null = null;
  try {
    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      currentUserEmail = user.email ?? null;
      subscriptionTier = await getSubscriptionTier(user.id);
    }
  } catch { /* not logged in */ }

  // Geo restriction — skip for active subscribers and for users who already hold a PPV purchase
  // (restriction is a purchase gate; once paid it should not prevent watching)
  if (activeEvent.venue_address) {
    const isSubscriber = subscriptionTier !== null;
    const alreadyPurchased = (currentUserId && currentUserEmail)
      ? await hasPpvAccess(currentUserId, currentUserEmail, activeEvent.id)
      : false;

    if (!isSubscriber && !alreadyPurchased) {
      const geo = await checkGeoRestriction(activeEvent.venue_address, activeEvent.blackout_radius_miles ?? 90);
      if (geo.blocked) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-black px-6 pt-16">
            <div className="max-w-lg text-center space-y-6">
              <h1 className="text-4xl font-bold text-white mb-4">Blackout Restriction</h1>
              <p className="text-gray-400 text-lg mb-2">
                This event is blacked out in your area due to local broadcast restrictions.
              </p>
              <p className="text-gray-500 text-sm">
                Attend the event in person or check back after the broadcast to purchase the replay.
              </p>
              <a
                href="/recover-access"
                className="inline-block text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
              >
                Already purchased before traveling here? Recover access &rarr;
              </a>
            </div>
          </div>
        );
      }
    }
  }

  let posterImage: string | null = null;
  let priceCents = 0;

  if (activeEvent.stripe_price_id && stripeServer) {
    try {
      const price = await stripeServer.prices.retrieve(activeEvent.stripe_price_id, {
        expand: ['product'],
      });
      const product = price.product as Stripe.Product;
      posterImage = product.images?.[0] || null;
      priceCents = price.unit_amount ?? 0;
    } catch { /* ignore */ }
  }

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
