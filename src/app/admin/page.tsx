import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import AdminGrantForm from './AdminGrantForm';
import AdminLogout from './AdminLogout';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login');
  }

  const { q } = await searchParams;
  const searchEmail = q?.trim().toLowerCase() || '';

  const supabase = createServerClient();

  // Fetch purchases — either search results or recent 50
  const query = supabase
    .from('purchases')
    .select('id, email, product_name, purchase_type, amount_paid, created_at, expires_at, stripe_session_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (searchEmail) {
    query.ilike('email', `%${searchEmail}%`);
  }

  const { data: purchases, error } = await query;

  // Quick stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  const { count: subCount } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'trialing']);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-1">BoxStreamTV</p>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          </div>
          <AdminLogout />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="border border-white/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Purchases Today</p>
            <p className="text-3xl font-bold">{todayCount ?? 0}</p>
          </div>
          <div className="border border-white/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Active Subscribers</p>
            <p className="text-3xl font-bold">{subCount ?? 0}</p>
          </div>
        </div>

        {/* Grant Access */}
        <div className="border border-white/10 p-6 mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">Grant Access</h2>
          <AdminGrantForm />
        </div>

        {/* Search */}
        <div className="mb-6">
          <form method="GET" action="/admin" className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={searchEmail}
              placeholder="Search by email..."
              className="flex-1 bg-white/5 border border-white/20 text-white placeholder-gray-600 px-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
            {searchEmail && (
              <a
                href="/admin"
                className="px-4 py-2.5 border border-white/20 text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white hover:text-white transition-colors"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        {/* Purchases Table */}
        <div className="border border-white/10">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
              {searchEmail ? `Results for "${searchEmail}"` : 'Recent Purchases'}
            </h2>
            <span className="text-[10px] text-gray-600">{purchases?.length ?? 0} rows</span>
          </div>

          {error && (
            <p className="px-5 py-8 text-sm text-red-400">Failed to load purchases.</p>
          )}

          {!error && (!purchases || purchases.length === 0) && (
            <p className="px-5 py-8 text-sm text-gray-500">
              {searchEmail ? 'No purchases found for that email.' : 'No purchases yet.'}
            </p>
          )}

          {purchases && purchases.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Email</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Product</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Type</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Amount</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const expired = p.expires_at && new Date(p.expires_at) < new Date();
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-5 py-3 text-white font-medium">
                          <a
                            href={`/admin?q=${encodeURIComponent(p.email)}`}
                            className="hover:underline underline-offset-2"
                          >
                            {p.email}
                          </a>
                        </td>
                        <td className="px-5 py-3 text-gray-300">{p.product_name || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-500 border border-white/10 px-2 py-0.5">
                            {p.purchase_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400">
                          {p.amount_paid === 0 ? <span className="text-green-400 text-[10px] font-bold uppercase">Comp</span> : `$${(p.amount_paid / 100).toFixed(2)}`}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {p.expires_at
                            ? <span className={expired ? 'text-red-400' : 'text-gray-400'}>
                                {new Date(p.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {expired && ' (exp)'}
                              </span>
                            : <span className="text-gray-600">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
