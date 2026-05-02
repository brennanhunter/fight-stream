'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';
import { normalizeEmail } from '@/lib/utils';
import { generateVodRecoveryToken } from '@/lib/vod-recovery-token';
import { vodRecoveryLinkEmail } from '@/lib/emails/vod-recovery-link';

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
