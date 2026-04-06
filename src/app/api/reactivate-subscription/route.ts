import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'reactivate-subscription', 10);
  if (limited) return limited;

  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminClient = createServerClient();
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Retrieve live subscription to check which cancellation mechanism is active.
    // The billing portal can cancel via cancel_at (specific timestamp) instead of
    // cancel_at_period_end — both need to be cleared to fully reactivate.
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const cancelAt = (stripeSub as Stripe.Subscription & { cancel_at: number | null }).cancel_at;

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
      ...(cancelAt ? { cancel_at: '' as unknown as number } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
