import Stripe from 'stripe';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'checkout', 20);
  if (limited) return limited;

  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    // Attach user_id if logged in (optional — anonymous checkout still works)
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const metadata: Record<string, string> = { purchase_type: 'vod' };
    if (user) {
      metadata.user_id = user.id;
    }

    // Idempotency key: hash of user/IP + priceId + minute window to prevent double-click duplicates
    const idempotencySource = `${user?.id || request.headers.get('x-forwarded-for') || 'anon'}:${priceId}:${Math.floor(Date.now() / 60000)}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencySource).digest('hex');

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      metadata,
      ...(user?.email ? { customer_email: user.email } : {}),
      payment_intent_data: {
        statement_descriptor: 'BOXSTREAMTV',
        metadata: {
          ...(ip ? { ip_address: ip } : {}),
          ...(userAgent ? { user_agent: userAgent.slice(0, 500) } : {}),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/watch?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/vod`,
    }, { idempotencyKey });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
