import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';

interface Subscription {
  id: string;
  tier: 'basic' | 'premium';
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const ACTIVE_STATUSES = ['active', 'trialing'];

/** Get the user's active subscription, or null */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('id, tier, status, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as Subscription | null;
}

/** Get the user's subscription tier, or null if not subscribed */
export async function getSubscriptionTier(userId: string): Promise<'basic' | 'premium' | null> {
  const sub = await getSubscription(userId);
  return sub?.tier ?? null;
}

/** Check if a user has VOD access (via subscription or individual purchase) */
export async function hasVodAccess(userId: string, productId: string): Promise<{ access: boolean; via: 'subscription' | 'purchase' | null }> {
  // Check subscription first (any active tier grants VOD access)
  const tier = await getSubscriptionTier(userId);
  if (tier) {
    return { access: true, via: 'subscription' };
  }

  // Fall back to individual purchase check
  const supabase = createServerClient();
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('stripe_product_id', productId)
    .eq('purchase_type', 'vod')
    .limit(1)
    .maybeSingle();

  return { access: !!data, via: data ? 'purchase' : null };
}

/** Check if a user has already purchased PPV access for a specific event.
 * Matches by user_id OR email to cover guest purchases where user_id is null. */
export async function hasPpvAccess(userId: string, email: string, eventId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('event_id', eventId)
    .eq('purchase_type', 'ppv')
    .or(`user_id.eq.${userId},email.eq."${normalizeEmail(email)}"`)  // double-quotes required for @ in PostgREST
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** Get PPV discount info for a subscriber */
export async function getPpvDiscount(userId: string): Promise<{ discountPercent: number; tier: string | null }> {
  const tier = await getSubscriptionTier(userId);
  if (tier === 'premium') return { discountPercent: 100, tier };
  if (tier === 'basic') return { discountPercent: 25, tier };
  return { discountPercent: 0, tier: null };
}
