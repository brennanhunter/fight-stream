import { createAuthServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { PageTransition } from '@/components/motion';
import Link from 'next/link';

export default async function AccountPage() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return null;

  const adminClient = createServerClient();
  const [{ data: profile }, { data: purchases }, { data: subscription }, { data: nextEvent }] =
    await Promise.all([
      adminClient.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
      adminClient
        .from('purchases')
        .select('id, product_name, purchase_type, amount_paid, created_at, expires_at')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(5),
      adminClient
        .from('subscriptions')
        .select('tier, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from('events')
        .select('id, name, date')
        .eq('is_active', true)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Fighter';

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <PageTransition>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-1">
          Member since {memberSince}
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Welcome back, {displayName}
        </h1>
        <div className="w-12 h-[2px] bg-white mt-4" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {/* Subscription status */}
        <div className="border border-white/10 p-5">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
            Fight Pass
          </p>
          {subscription ? (
            <>
              <p className="text-base font-bold text-white mb-1">
                {subscription.tier === 'premium' ? 'Premium' : 'Basic'}
                {subscription.cancel_at_period_end && (
                  <span className="ml-2 text-[10px] font-bold tracking-[0.1em] uppercase text-yellow-400">
                    Canceling
                  </span>
                )}
                {subscription.status === 'past_due' && (
                  <span className="ml-2 text-[10px] font-bold tracking-[0.1em] uppercase text-red-400">
                    Past Due
                  </span>
                )}
              </p>
              {subscription.current_period_end && (
                <p className="text-[11px] text-gray-500">
                  {subscription.cancel_at_period_end ? 'Access until ' : 'Renews '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
              <Link
                href="/account/subscription"
                className="inline-block mt-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 hover:text-white transition-colors"
              >
                Manage →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3">No active subscription</p>
              <Link
                href="/pricing"
                className="inline-block text-[10px] font-bold tracking-[0.15em] uppercase text-white hover:text-gray-300 transition-colors"
              >
                View Plans →
              </Link>
            </>
          )}
        </div>

        {/* Upcoming event */}
        <div className="border border-white/10 p-5">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
            Next Event
          </p>
          {nextEvent ? (
            <>
              <p className="text-base font-bold text-white mb-1">{nextEvent.name}</p>
              <p className="text-[11px] text-gray-500">
                {new Date(nextEvent.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <Link
                href="/pricing"
                className="inline-block mt-3 text-[10px] font-bold tracking-[0.15em] uppercase text-white hover:text-gray-300 transition-colors"
              >
                Get Access →
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500">No upcoming events</p>
          )}
        </div>
      </div>

      {/* Recent purchases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
            Recent Purchases
          </h2>
          {purchases && purchases.length > 0 && (
            <Link
              href="/account/purchases"
              className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 hover:text-white transition-colors"
            >
              View All →
            </Link>
          )}
        </div>

        {purchases && purchases.length > 0 ? (
          <div className="space-y-2">
            {purchases.map((purchase: Record<string, string | number | null>) => {
              const isExpired =
                purchase.expires_at &&
                new Date(purchase.expires_at as string) < new Date();
              return (
                <div
                  key={purchase.id as string}
                  className="flex items-center justify-between border border-white/10 p-4"
                >
                  <div>
                    <p className="text-sm text-white font-bold">{purchase.product_name as string}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {purchase.purchase_type as string} ·{' '}
                      {new Date(purchase.created_at as string).toLocaleDateString()}
                      {isExpired && <span className="ml-2 text-red-400">Expired</span>}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">
                    ${((purchase.amount_paid as number) / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-white/10 p-8 text-center">
            <p className="text-sm text-gray-500 mb-3">No purchases yet.</p>
            <Link
              href="/vod"
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-white hover:underline"
            >
              Browse VOD →
            </Link>
          </div>
        )}
      </div>

      {/* Support */}
      <div className="mt-10 border border-white/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white mb-1">Need help?</p>
          <p className="text-xs text-gray-500">Access issues, billing questions, or anything else — we read every email.</p>
        </div>
        <a
          href="mailto:hunter@boxstreamtv.com"
          className="flex-shrink-0 text-[10px] font-bold tracking-[0.2em] uppercase px-6 py-3 border border-white/20 text-gray-400 hover:border-white hover:text-white transition-all duration-200"
        >
          Contact Support
        </a>
      </div>
    </PageTransition>
  );
}
