import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { checkGeoRestriction } from '@/lib/geo';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: event } = await supabase
      .from('events')
      .select('venue_address, blackout_radius_miles')
      .eq('is_active', true)
      .maybeSingle();

    if (event?.venue_address) {
      const geo = await checkGeoRestriction(event.venue_address, event.blackout_radius_miles ?? 90);
      if (geo.blocked) {
        return NextResponse.json(
          { error: 'This event is blacked out in your area due to local broadcast restrictions.' },
          { status: 403 }
        );
      }
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/watch?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/vod`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
