import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { getSubscriptionTier } from '@/lib/access';
import { getProducts } from '@/lib/vod';
import WatchlistContent from './WatchlistContent';

export default async function WatchlistPage() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerClient();

  // Fetch favorites, products, owned products, and subscription in parallel
  const [{ data: favorites }, products, subscriptionTier] = await Promise.all([
    supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'vod')
      .order('created_at', { ascending: false }),
    getProducts(),
    getSubscriptionTier(user.id),
  ]);

  // Get owned products for this user
  const now = new Date();
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, stripe_product_id, stripe_session_id, expires_at')
    .eq('user_id', user.id)
    .eq('purchase_type', 'vod');

  const owned: Record<string, { purchaseId: string; expiresAt: string | null }> = {};
  if (purchases?.length) {
    for (const p of purchases) {
      if (p.stripe_product_id) {
        if (p.expires_at && new Date(p.expires_at) < now) continue;
        owned[p.stripe_product_id] = { purchaseId: p.id || p.stripe_session_id, expiresAt: p.expires_at ?? null };
      }
    }
  }

  // Build a product lookup map
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Match favorites to products
  const items = (favorites || [])
    .map((fav) => {
      const product = productMap.get(fav.item_id);
      if (!product) return null;
      return {
        favoriteId: fav.id as string,
        product,
        owned: owned[product.id] || null,
      };
    })
    .filter(Boolean) as { favoriteId: string; product: (typeof products)[0]; owned: { purchaseId: string; expiresAt: string | null } | null }[];

  return <WatchlistContent items={items} subscriptionTier={subscriptionTier} />;
}
