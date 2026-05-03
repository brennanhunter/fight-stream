import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripeServer } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';
import { VOD_ACCESS_HOURS } from '@/lib/constants';

/**
 * VOD-checkout success handler.
 *
 * Stripe redirects here with `?session_id=cs_xxx` after a successful VOD
 * purchase. We:
 *   1. Look up (or create from Stripe) the purchases row for this session.
 *   2. On the FIRST claim, stamp `session_claimed_at` and set the
 *      `customer_email` cookie based on the Stripe-verified email — this
 *      is what makes the legit buyer land directly on /watch instead of
 *      getting kicked to /recover-access.
 *   3. On subsequent visits, only the original device (already holds a
 *      matching customer_email cookie) gets through. Other devices get
 *      sent to /recover-access?postpurchase=1 so the buyer uses the
 *      magic-link email — preserves the "leaked URL can't grant a second
 *      claim" property.
 *
 * This is safe to be hit multiple times by the original buyer (refresh,
 * back button) — same cookie gets set, same /watch redirect. Idempotent.
 */
export async function GET(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    new URL(req.url).origin;
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(`${baseUrl}/vod`);
  }
  if (!stripeServer) {
    console.error('claim-vod-session: stripe not configured');
    return NextResponse.redirect(`${baseUrl}/vod`);
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('purchases')
    .select('id, email, session_claimed_at')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  let purchaseId = existing?.id ?? null;
  let purchaseEmail = existing?.email ?? null;
  const alreadyClaimed = !!existing?.session_claimed_at;

  // Webhook hasn't run yet (or didn't finish) — build the row from Stripe.
  if (!existing) {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripeServer.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product'],
      });
    } catch (err) {
      console.error('claim-vod-session: stripe retrieve failed', err);
      return NextResponse.redirect(`${baseUrl}/vod`);
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(`${baseUrl}/vod`);
    }

    const rawEmail = session.customer_details?.email || session.customer_email;
    if (!rawEmail) {
      console.error('claim-vod-session: no email on session', sessionId);
      return NextResponse.redirect(`${baseUrl}/vod`);
    }
    purchaseEmail = normalizeEmail(rawEmail);

    const lineItem = session.line_items?.data[0];
    const product = lineItem?.price?.product as Stripe.Product | undefined;
    const s3Key = product?.metadata?.s3_key || null;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;
    const userId = session.metadata?.user_id || null;
    const expiresAt = new Date(
      Date.now() + VOD_ACCESS_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: inserted, error: upsertErr } = await supabase
      .from('purchases')
      .upsert(
        {
          email: purchaseEmail,
          purchase_type: 'vod' as const,
          stripe_session_id: sessionId,
          stripe_payment_intent_id: paymentIntentId,
          stripe_product_id: product?.id || null,
          product_name: product?.name || 'VOD Purchase',
          product_image: (product?.images && product.images[0]) || null,
          s3_key: s3Key,
          amount_paid: lineItem?.amount_total ?? session.amount_total ?? 0,
          currency: session.currency || 'usd',
          user_id: userId,
          expires_at: expiresAt,
          session_claimed_at: new Date().toISOString(),
          session_version: 1,
        },
        { onConflict: 'stripe_session_id' },
      )
      .select('id, email')
      .single();

    if (upsertErr || !inserted) {
      console.error('claim-vod-session: upsert failed', upsertErr);
      return NextResponse.redirect(`${baseUrl}/vod`);
    }
    purchaseId = inserted.id;
    purchaseEmail = inserted.email;
  }

  if (!purchaseId || !purchaseEmail) {
    return NextResponse.redirect(`${baseUrl}/vod`);
  }

  // If a previous device already claimed, only let the original cookie holder
  // through. Strangers (or post-cookie-clear) need to use the email link.
  if (alreadyClaimed) {
    const cookieEmail = req.cookies.get('customer_email')?.value;
    const decoded = cookieEmail ? normalizeEmail(decodeURIComponent(cookieEmail)) : null;
    if (decoded !== purchaseEmail) {
      return NextResponse.redirect(`${baseUrl}/recover-access?postpurchase=1`);
    }
  } else if (existing) {
    // First claim on a webhook-created row — stamp it.
    await supabase
      .from('purchases')
      .update({ session_claimed_at: new Date().toISOString() })
      .eq('id', purchaseId)
      .is('session_claimed_at', null);
  }

  const response = NextResponse.redirect(
    `${baseUrl}/watch?purchase_id=${purchaseId}`,
  );
  response.cookies.set('customer_email', purchaseEmail, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
