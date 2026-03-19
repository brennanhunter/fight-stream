import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { PageTransition } from '@/components/motion';
import Link from 'next/link';

export default async function AccountPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // Middleware handles redirect

  // Fetch profile and recent purchases using service role (bypasses RLS)
  const adminClient = createServerClient();
  const [{ data: profile }, { data: purchases }] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', user.id).single(),
    adminClient
      .from('purchases')
      .select('*')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Fighter';

  return (
    <PageTransition>
      <h1 className="text-2xl font-bold text-white tracking-[0.15em] uppercase mb-2">
        Welcome back, {displayName}
      </h1>
      <p className="text-sm text-gray-500 mb-12">{user.email}</p>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { name: 'Profile', href: '/account/profile', desc: 'Edit your info' },
          { name: 'Purchases', href: '/account/purchases', desc: 'View history' },
          { name: 'Watchlist', href: '/account/watchlist', desc: 'Saved content' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-white/10 p-5 hover:border-white/25 transition-colors group"
          >
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-white group-hover:text-white/90 mb-1">
              {item.name}
            </h2>
            <p className="text-[10px] text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Purchases */}
      <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">
        Recent Purchases
      </h2>
      {purchases && purchases.length > 0 ? (
        <div className="space-y-3">
          {purchases.map((purchase: Record<string, string>) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between border border-white/10 p-4"
            >
              <div>
                <p className="text-sm text-white font-bold">{purchase.product_name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {purchase.purchase_type} · {new Date(purchase.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">
                ${(Number(purchase.amount_paid) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No purchases yet.</p>
      )}
    </PageTransition>
  );
}
