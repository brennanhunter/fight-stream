'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { stripeServer } from '@/lib/stripe';

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

type ActionResult = { ok: true } | { ok: false; error: string };

/** Cancels at period end — customer keeps access until current_period_end. */
export async function scheduleSubscriptionCancellation(
  subscriptionId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!stripeServer) return { ok: false, error: 'Stripe not configured' };

  const supabase = createServerClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return { ok: false, error: 'Subscription not found' };
  }

  try {
    await stripeServer.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe update failed';
    console.error('scheduleSubscriptionCancellation error:', err);
    return { ok: false, error: msg };
  }

  // Webhook (customer.subscription.updated) will sync the DB, but mirror locally
  // so the UI updates immediately without waiting for the webhook round-trip.
  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('id', sub.id);

  revalidatePath('/admin/subscribers');
  return { ok: true };
}

/** Reverses a scheduled cancellation. */
export async function resumeSubscription(
  subscriptionId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!stripeServer) return { ok: false, error: 'Stripe not configured' };

  const supabase = createServerClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return { ok: false, error: 'Subscription not found' };
  }

  try {
    await stripeServer.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe update failed';
    console.error('resumeSubscription error:', err);
    return { ok: false, error: msg };
  }

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: false })
    .eq('id', sub.id);

  revalidatePath('/admin/subscribers');
  return { ok: true };
}

/** Cancels immediately — ends access right now. Use sparingly. */
export async function cancelSubscriptionNow(
  subscriptionId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!stripeServer) return { ok: false, error: 'Stripe not configured' };

  const supabase = createServerClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return { ok: false, error: 'Subscription not found' };
  }

  try {
    await stripeServer.subscriptions.cancel(sub.stripe_subscription_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe cancel failed';
    console.error('cancelSubscriptionNow error:', err);
    return { ok: false, error: msg };
  }

  // Webhook will fire customer.subscription.deleted and update status.
  // Mirror locally so the UI doesn't lag.
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false })
    .eq('id', sub.id);

  revalidatePath('/admin/subscribers');
  return { ok: true };
}
