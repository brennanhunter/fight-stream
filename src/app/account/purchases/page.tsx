import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { PageTransition } from '@/components/motion';

export default async function PurchasesPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createServerClient();
  const [{ data: purchasesByUser }, { data: purchasesByEmail }] = await Promise.all([
    adminClient
      .from('purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('purchases')
      .select('*')
      .eq('email', user.email!)
      .order('created_at', { ascending: false }),
  ]);

  const seen = new Set<string>();
  const purchases = [...(purchasesByUser || []), ...(purchasesByEmail || [])]
    .filter(p => seen.has(p.id) ? false : (seen.add(p.id), true))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <PageTransition>
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">Account</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Purchases</h1>
        <div className="w-12 h-[2px] bg-white mt-4" />
      </div>

      {purchases && purchases.length > 0 ? (
        <div className="space-y-3">
          {purchases.map((purchase: Record<string, string | number | null>) => {
            const isExpired =
              purchase.expires_at &&
              new Date(purchase.expires_at as string) < new Date();

            return (
              <div
                key={purchase.id as string}
                className="flex items-center justify-between border border-white/10 p-4"
              >
                <div className="flex items-center gap-4">
                  {purchase.product_image && (
                    <img
                      src={purchase.product_image as string}
                      alt={purchase.product_name as string}
                      className="w-12 h-12 object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm text-white font-bold">{purchase.product_name as string}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {purchase.purchase_type as string} ·{' '}
                      {new Date(purchase.created_at as string).toLocaleDateString()}
                      {isExpired && (
                        <span className="ml-2 text-red-400">Expired</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">
                    ${((purchase.amount_paid as number) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-white/10">
          <p className="text-sm text-gray-500 mb-4">No purchases yet.</p>
          <a
            href="/vod"
            className="text-[10px] font-bold tracking-[0.2em] uppercase text-white hover:underline"
          >
            Browse VOD →
          </a>
        </div>
      )}
    </PageTransition>
  );
}
