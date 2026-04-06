import Stripe from 'stripe';
import crypto from 'crypto';
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
        .select('id, name, stripe_price_id, venue_address, blackout_radius_miles')
        .eq('id', clientEventId)
        .maybeSingle();
      event = data;
    } else {
      const { data } = await supabase
        .from('events')
        .select('id, name, stripe_price_id, venue_address, blackout_radius_miles')
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

    // Validate that the priceId matches the event's actual Stripe price
    if (!event.stripe_price_id) {
      return NextResponse.json(
        { error: 'This event is not yet available for purchase.' },
        { status: 400 }
      );
    }
    if (priceId !== event.stripe_price_id) {
      return NextResponse.json(
        { error: 'Invalid price for this event.' },
        { status: 400 }
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

      if (discountPercent > 0) {
        // Use a stable reusable coupon per tier instead of creating single-use ones
        const couponId = `fight-pass-${tier}-${discountPercent}pct`;
        try {
          await stripe.coupons.retrieve(couponId);
        } catch {
          // Coupon doesn't exist yet — create it
          try {
            await stripe.coupons.create({
              id: couponId,
              percent_off: discountPercent,
              duration: 'once',
              name: `Fight Pass ${tier === 'premium' ? 'Premium' : 'Basic'} – ${discountPercent}% Off PPV`,
            });
          } catch {
            // Another request may have created it concurrently — verify it exists
            await stripe.coupons.retrieve(couponId);
          }
        }
        discounts = [{ coupon: couponId }];
        metadata.subscription_tier = tier!;
      }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent');

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      metadata,
      payment_intent_data: {
        statement_descriptor: 'BOXSTREAMTV',
        metadata: {
          ...(ip ? { ip_address: ip } : {}),
          ...(userAgent ? { user_agent: userAgent.slice(0, 500) } : {}),
        },
      },
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

    // Pass customer_email for Radar scoring when no Stripe customer object is attached
    if (!sessionParams.customer && user?.email) {
      sessionParams.customer_email = user.email;
    }

    // Idempotency key: hash of user/IP + event + minute window to prevent double-click duplicates
    const idempotencySource = `${user?.id || request.headers.get('x-forwarded-for') || 'anon'}:${event.id}:${Math.floor(Date.now() / 60000)}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencySource).digest('hex');

    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('PPV checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed. Please try again.' },
      { status: 500 }
    );
  }
}
