import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkGeoRestriction } from '@/lib/geo';
import { createServerClient } from '@/lib/supabase';
import { getPpvDiscount } from '@/lib/access';
import { rateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'ppv-checkout', 20);
  if (limited) return limited;

  try {
    const supabase = createServerClient();
    const { priceId, eventId: clientEventId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    // Look up the specific event (by client-provided eventId) or fall back to active event
    let event;
    if (clientEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, venue_address, blackout_radius_miles')
        .eq('id', clientEventId)
        .maybeSingle();
      event = data;
    } else {
      const { data } = await supabase
        .from('events')
        .select('id, name, venue_address, blackout_radius_miles')
        .eq('is_active', true)
        .maybeSingle();
      event = data;
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found. Please try again.' },
        { status: 404 }
      );
    }

    if (event.venue_address) {
      const geo = await checkGeoRestriction(event.venue_address, event.blackout_radius_miles ?? 90);
      if (geo.blocked) {
        return NextResponse.json(
          { error: 'This event is blacked out in your area due to local broadcast restrictions.' },
          { status: 403 }
        );
      }
    }

    // Attach user_id if logged in (optional — anonymous checkout still works)
    const { createAuthServerClient } = await import('@/lib/supabase-server');
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const metadata: Record<string, string> = {};
    if (event) {
      metadata.eventId = event.id;
      metadata.eventName = event.name;
    }
    if (user) {
      metadata.user_id = user.id;
    }

    // Check subscription tier for PPV discounts
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (user) {
      const { discountPercent, tier } = await getPpvDiscount(user.id);

      if (discountPercent === 100) {
        // Premium — free PPV. Create a 100% off coupon.
        const coupon = await stripe.coupons.create({
          percent_off: 100,
          duration: 'once',
          name: `Fight Pass Premium – Free PPV`,
          max_redemptions: 1,
        });
        discounts = [{ coupon: coupon.id }];
        metadata.subscription_tier = tier!;
      } else if (discountPercent > 0) {
        // Basic — 25% off PPV
        const coupon = await stripe.coupons.create({
          percent_off: discountPercent,
          duration: 'once',
          name: `Fight Pass Basic – ${discountPercent}% Off PPV`,
          max_redemptions: 1,
        });
        discounts = [{ coupon: coupon.id }];
        metadata.subscription_tier = tier!;
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      metadata,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    };

    // Only add allow_promotion_codes if no subscription discount (Stripe doesn't allow both)
    if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    // Find or create customer for logged-in users
    if (user) {
      const existingSubs = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSubs.data?.stripe_customer_id) {
        sessionParams.customer = existingSubs.data.stripe_customer_id;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('PPV checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
