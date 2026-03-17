import Hero from '@/components/hero/Hero';
import EventHero from '@/components/hero/EventHero';
import HomeContent from '@/components/hero/HomeContent';
import Footer from '@/components/layout/Footer';
import ResumeWatchingBanner from '@/components/ResumeWatchingBanner';
import { createServerClient } from '@/lib/supabase';
import { checkGeoRestriction } from '@/lib/geo';

export const dynamic = 'force-dynamic';

interface ActiveEvent {
  id: string;
  name: string;
  date: string;
  price_cents: number;
  currency: string;
  poster_image: string | null;
  stripe_price_id: string | null;
  expires_at: string | null;
  venue_address: string | null;
  blackout_radius_miles: number | null;
}

async function getActiveEvent(): Promise<ActiveEvent | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, price_cents, currency, poster_image, stripe_price_id, expires_at, venue_address, blackout_radius_miles')
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase active event error:', error);
      return null;
    }
    
    console.log('Active event data:', JSON.stringify(data));
    return data || null;
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
          posterImage={activeEvent.poster_image}
          priceCents={activeEvent.price_cents}
          currency={activeEvent.currency}
          stripePriceId={activeEvent.stripe_price_id}
        />
      ) : (
        <Hero />
      )}
      <HomeContent />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 bg-black">
        <ResumeWatchingBanner />
      </div>
      <Footer />
    </>
  );
}
