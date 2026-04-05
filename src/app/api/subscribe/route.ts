import Stripe from 'stripe';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'subscribe', 20);
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
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Idempotency key: hash of user + priceId + minute window to prevent double-click duplicates
    const idempotencySource = `${user.id}:${priceId}:${Math.floor(Date.now() / 60000)}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencySource).digest('hex');

    // Create Stripe Checkout Session in subscription mode
    const session = await stripe.checkout.sessions.create({
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
      { error: error instanceof Error ? error.message : 'Subscription checkout failed' },
      { status: 500 }
    );
  }
}
