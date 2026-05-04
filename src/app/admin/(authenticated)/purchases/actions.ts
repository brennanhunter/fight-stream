'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';
import { normalizeEmail } from '@/lib/utils';
import { generateVodRecoveryToken } from '@/lib/vod-recovery-token';
import { vodRecoveryLinkEmail } from '@/lib/emails/vod-recovery-link';
import { VOD_ACCESS_HOURS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

export async function refundPurchase(
  purchaseId: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!stripeServer) {
    return { ok: false, error: 'Stripe not configured' };
  }
  if (!purchaseId) {
    return { ok: false, error: 'Missing purchaseId' };
  }

  const supabase = createServerClient();
  const { data: purchase, error: lookupError } = await supabase
    .from('purchases')
    .select('id, email, amount_paid, stripe_payment_intent_id, stripe_session_id, refunded_at')
    .eq('id', purchaseId)
    .maybeSingle();

  if (lookupError || !purchase) {
    return { ok: false, error: 'Purchase not found' };
  }
  if (purchase.refunded_at) {
    return { ok: false, error: 'Already refunded' };
  }
  if (purchase.amount_paid === 0) {
    return { ok: false, error: 'Cannot refund a comp purchase' };
  }

  let paymentIntentId = purchase.stripe_payment_intent_id;
  if (!paymentIntentId && purchase.stripe_session_id) {
    try {
      const session = await stripeServer.checkout.sessions.retrieve(purchase.stripe_session_id);
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    } catch (err) {
      console.error('refundPurchase: session lookup failed', err);
    }
  }

  if (!paymentIntentId) {
    return { ok: false, error: 'No PaymentIntent on this purchase — refund manually in Stripe' };
  }

  try {
    await stripeServer.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund-${purchase.id}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe refund failed';
    console.error('refundPurchase: stripe error', err);
    return { ok: false, error: message };
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('purchases')
    .update({ expires_at: nowIso, refunded_at: nowIso })
    .eq('id', purchase.id);

  if (updateError) {
    console.error('refundPurchase: DB update failed (Stripe refund did succeed)', updateError);
    return { ok: false, error: 'Refunded in Stripe, but DB update failed — refresh and retry' };
  }

  revalidatePath('/admin/purchases');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export async function sendVodRecoveryLink(
  email: string,
): Promise<ActionResult<{ vodCount: number }>> {
  await requireAdmin();

  if (!email || typeof email !== 'string') {
    return { ok: false, error: 'Email is required' };
  }

  const trimmed = normalizeEmail(email);
  const supabase = createServerClient();

  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, expires_at, refunded_at')
    .eq('email', trimmed)
    .eq('purchase_type', 'vod')
    .is('refunded_at', null);

  const now = Date.now();
  const validVods = (purchases ?? []).filter(
    (p) => !p.expires_at || new Date(p.expires_at).getTime() > now,
  );

  if (validVods.length === 0) {
    return { ok: false, error: 'No active VOD purchases found for that email' };
  }

  const token = await generateVodRecoveryToken(trimmed);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
  const link = `${baseUrl}/api/recover-vod/verify?token=${encodeURIComponent(token)}`;
  const { html, text } = vodRecoveryLinkEmail({ link, vodCount: validVods.length });

  try {
    await resend.emails.send({
      from: 'BoxStreamTV <hunter@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to: trimmed,
      subject: 'Recover your BoxStreamTV replays',
      html,
      text,
    });
  } catch (err) {
    console.error('sendVodRecoveryLink: send failed', err);
    return { ok: false, error: 'Failed to send email' };
  }

  return { ok: true, vodCount: validVods.length };
}

/**
 * Comp VOD access to a recipient by email — no Stripe checkout, no payment.
 * Inserts a $0 row in `purchases` shaped like a real VOD purchase, then
 * sends the same magic-link email a paying buyer gets. Recipient clicks it,
 * the existing recover-vod/verify route sets their cookie, and they watch.
 *
 * Safe to call repeatedly for the same (email, product) pair — each call
 * creates a fresh row with a new synthetic session id, and the existing
 * watch-page access checks treat any non-refunded, non-expired VOD row as
 * valid access.
 */
export async function compVodAccess(input: {
  email: string;
  productId: string;
  ttlHours?: number;
  note?: string;
}): Promise<
  ActionResult<{ purchaseId: string; productName: string; expiresAt: string }>
> {
  await requireAdmin();

  const email = normalizeEmail(input.email ?? '');
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Valid email is required' };
  }
  const productId = input.productId?.trim();
  if (!productId) {
    return { ok: false, error: 'Product ID is required' };
  }
  if (!stripeServer) {
    return { ok: false, error: 'Stripe is not configured' };
  }

  // Pull the canonical product data from Stripe (same shape the webhook
  // uses for real VOD purchases).
  let product;
  try {
    product = await stripeServer.products.retrieve(productId);
  } catch (err) {
    console.error('compVodAccess: stripe product retrieve failed', err);
    return { ok: false, error: 'Could not find that Stripe product' };
  }
  if (product.metadata?.site !== 'boxstreamtv') {
    return { ok: false, error: 'Product is not a BoxStreamTV VOD' };
  }
  const s3Key = product.metadata?.s3_key || null;
  if (!s3Key) {
    return { ok: false, error: 'Product is missing s3_key metadata' };
  }

  const ttlMs = (input.ttlHours ?? VOD_ACCESS_HOURS) * 60 * 60 * 1000;
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();
  const syntheticSessionId = `comp_${randomUUID()}`;

  const supabase = createServerClient();
  const { data: inserted, error: insertErr } = await supabase
    .from('purchases')
    .insert({
      email,
      purchase_type: 'vod' as const,
      stripe_session_id: syntheticSessionId,
      stripe_payment_intent_id: null,
      stripe_product_id: product.id,
      product_name: product.name || 'VOD Comp',
      product_image: product.images?.[0] || null,
      s3_key: s3Key,
      amount_paid: 0,
      currency: 'usd',
      user_id: null,
      expires_at: expiresAtIso,
      session_version: 1,
      session_claimed_at: null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error('compVodAccess: insert failed', insertErr);
    return { ok: false, error: 'Could not create comp purchase row' };
  }

  // Mint a magic link tied to the recipient's email + matching the access
  // window so the link stays valid for as long as the access does.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
  const token = await generateVodRecoveryToken(email, ttlMs);
  const link = `${baseUrl}/api/recover-vod/verify?token=${encodeURIComponent(token)}`;
  const { html, text } = vodRecoveryLinkEmail({ link, vodCount: 1 });

  try {
    await resend.emails.send({
      from: 'BoxStreamTV <hunter@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to: email,
      subject: `You've got access — ${product.name}`,
      html,
      text,
    });
  } catch (err) {
    console.error('compVodAccess: email send failed', err);
    // The DB row is real and works regardless of the email — recipient can
    // still recover access via /recover-access if needed.
    return {
      ok: false,
      error: 'Comp granted but email failed. Recipient can use /recover-access.',
    };
  }

  // Note shows up in the admin purchases list via the existing free-text
  // search, but we're not persisting it on the row right now since there's
  // no `notes` column — kept as a reminder for the operator.
  void input.note;

  revalidatePath('/admin/purchases');
  return {
    ok: true,
    purchaseId: inserted.id,
    productName: product.name || 'VOD',
    expiresAt: expiresAtIso,
  };
}
