import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!stripeServer) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const { purchaseId } = await request.json();
  if (!purchaseId || typeof purchaseId !== 'string') {
    return NextResponse.json({ error: 'purchaseId required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: purchase, error: lookupError } = await supabase
    .from('purchases')
    .select('id, email, amount_paid, stripe_payment_intent_id, stripe_session_id, refunded_at')
    .eq('id', purchaseId)
    .maybeSingle();

  if (lookupError || !purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  }

  if (purchase.refunded_at) {
    return NextResponse.json({ error: 'Already refunded' }, { status: 409 });
  }

  if (purchase.amount_paid === 0) {
    return NextResponse.json({ error: 'Cannot refund a comp purchase' }, { status: 400 });
  }

  // Resolve PaymentIntent — newer rows have it directly; legacy VOD rows only have a session ID.
  let paymentIntentId = purchase.stripe_payment_intent_id;
  if (!paymentIntentId && purchase.stripe_session_id) {
    try {
      const session = await stripeServer.checkout.sessions.retrieve(purchase.stripe_session_id);
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    } catch (err) {
      console.error('Refund: session lookup failed', err);
    }
  }

  if (!paymentIntentId) {
    return NextResponse.json({ error: 'No PaymentIntent on this purchase — refund manually in Stripe' }, { status: 422 });
  }

  try {
    await stripeServer.refunds.create(
      { payment_intent: paymentIntentId },
      // Idempotency: re-clicking the button won't double-refund.
      { idempotencyKey: `refund-${purchase.id}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe refund failed';
    console.error('Refund: stripe.refunds.create failed', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Mirror the webhook update synchronously so the dashboard reflects it immediately.
  // The webhook will also fire and run the same UPDATE — that's a no-op.
  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('purchases')
    .update({ expires_at: nowIso, refunded_at: nowIso })
    .eq('id', purchase.id);

  if (updateError) {
    console.error('Refund: DB update failed (Stripe refund did succeed)', updateError);
    return NextResponse.json({ error: 'Refunded in Stripe, but DB update failed — refresh and retry' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
