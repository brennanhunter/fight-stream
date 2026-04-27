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

  const { hours = 24 } = await request.json().catch(() => ({}));
  const sinceUnix = Math.floor(Date.now() / 1000) - Number(hours) * 60 * 60;

  const supabase = createServerClient();

  let scanned = 0;
  let matched = 0;
  let alreadyMarked = 0;
  let unmatched = 0;
  const updated: { email: string; product: string; refundedAt: string }[] = [];

  // Iterate every refund created in the window. Auto-paginates.
  for await (const refund of stripeServer.refunds.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    scanned++;

    const paymentIntentId = typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id ?? null;
    if (!paymentIntentId) {
      unmatched++;
      continue;
    }

    const refundedAtIso = new Date(refund.created * 1000).toISOString();

    // Try direct PI match first.
    const { data: byPi } = await supabase
      .from('purchases')
      .select('id, email, product_name, refunded_at')
      .eq('stripe_payment_intent_id', paymentIntentId);

    let rows = byPi ?? [];

    // Fall back to checkout session lookup for legacy VOD rows.
    if (rows.length === 0) {
      try {
        const sessions = await stripeServer.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        const sessionId = sessions.data[0]?.id;
        if (sessionId) {
          const { data: bySession } = await supabase
            .from('purchases')
            .select('id, email, product_name, refunded_at')
            .eq('stripe_session_id', sessionId);
          rows = bySession ?? [];
        }
      } catch (err) {
        console.error('Backfill: session lookup failed for PI', paymentIntentId, err);
      }
    }

    if (rows.length === 0) {
      unmatched++;
      continue;
    }

    for (const row of rows) {
      if (row.refunded_at) {
        alreadyMarked++;
        continue;
      }
      const { error } = await supabase
        .from('purchases')
        .update({ refunded_at: refundedAtIso, expires_at: refundedAtIso })
        .eq('id', row.id);

      if (error) {
        console.error('Backfill: update failed for purchase', row.id, error);
        continue;
      }
      matched++;
      updated.push({ email: row.email, product: row.product_name, refundedAt: refundedAtIso });
    }
  }

  return NextResponse.json({
    ok: true,
    windowHours: Number(hours),
    refundsScanned: scanned,
    purchasesUpdated: matched,
    alreadyMarked,
    unmatched,
    updated,
  });
}
