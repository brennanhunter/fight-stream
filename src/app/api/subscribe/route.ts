import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { stripeServer } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  if (!stripeServer) {
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 500 });
  }

  const limited = await rateLimit(request, 'subscribe', 20);
  if (limited) return limited;

  try {
    // Require authentication
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to subscribe.' }, { status: 401 });
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    // Validate priceId against known subscription prices
    const allowedPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    ].filter(Boolean);

    if (!allowedPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price selected' }, { status: 400 });
    }

    // Check for existing active subscription
    const adminClient = createServerClient();
    const { data: existingSub } = await adminClient
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Manage it from your account.' },
        { status: 400 }
      );
    }

    // Find or create a Stripe Customer for this user
    let customerId: string;

    // Check if we already have a customer ID stored
    const { data: prevSub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevSub?.stripe_customer_id) {
      customerId = prevSub.stripe_customer_id;
    } else {
      // Search Stripe for an existing customer by email (covers abandoned checkouts)
      const existingCustomers = await stripeServer.customers.list({
        email: user.email!,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripeServer.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    // Idempotency key: hash of user + priceId + minute window to prevent double-click duplicates
    const idempotencySource = `${user.id}:${priceId}:${Math.floor(Date.now() / 60000)}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencySource).digest('hex');

    // Create Stripe Checkout Session in subscription mode
    const session = await stripeServer.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    }, { idempotencyKey });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Subscription checkout failed' },
      { status: 500 }
    );
  }
}
