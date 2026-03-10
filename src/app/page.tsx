import Hero from '@/components/hero/Hero';
import Footer from '@/components/layout/Footer';
import ResumeWatchingBanner from '@/components/ResumeWatchingBanner';
import IVSVideoPlayer from '@/components/player/IVSVideoPlayer';
import { createServerClient } from '@/lib/supabase';

interface ActiveEvent {
  id: string;
  name: string;
  date: string;
  price_cents: number;
  currency: string;
  poster_image: string | null;
  stripe_price_id: string | null;
  expires_at: string | null;
}

async function getActiveEvent(): Promise<ActiveEvent | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, price_cents, currency, poster_image, stripe_price_id, expires_at')
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

  return (
    <>
      {activeEvent ? (
        /* Active event — full-viewport IVS player */
        <div className="h-screen flex flex-col overflow-hidden">
          <IVSVideoPlayer event={activeEvent} />
        </div>
      ) : (
        /* No active event — normal homepage */
        <>
          <Hero />
          <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 bg-black">
            <ResumeWatchingBanner />
          </div>
          <Footer />
        </>
      )}
    </>
  );
}
