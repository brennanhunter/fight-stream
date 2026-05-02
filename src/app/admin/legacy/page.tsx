import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { generateReportToken } from '@/lib/report-token';
import { getPromoterRate, getTierLabel } from '@/lib/promoter-rate';
import { getProducts } from '@/lib/vod';
import { PURCHASE_WINDOW_DAYS, REPLAY_WINDOW_DAYS } from '@/lib/constants';
import AdminGrantForm from '../AdminGrantForm';
import AdminAnnounceForm from '../AdminAnnounceForm';
import AdminLogout from '../AdminLogout';
import AdminStreamToggle from '../AdminStreamToggle';
import AdminCopyButton from '../AdminCopyButton';
import AdminFeedbackApprove from '../AdminFeedbackApprove';
import AdminRefundButton from '../AdminRefundButton';
import AdminRefundBackfillButton from '../AdminRefundBackfillButton';
import AdminSendVodRecoveryForm from '../AdminSendVodRecoveryForm';

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

  // Feedback — most recent 20
  const { data: feedbackRows } = await supabase
    .from('feedback')
    .select('id, created_at, email, subject, trigger_type, overall_rating, quality_rating, process_rating, comment, what_was_missing, approved_for_testimonial')
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch purchases — either search results or recent 50
  const query = supabase
    .from('purchases')
    .select('id, email, product_name, purchase_type, amount_paid, created_at, expires_at, stripe_session_id, stripe_payment_intent_id, refunded_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (searchEmail) {
    query.ilike('email', `%${searchEmail}%`);
  }

  const { data: purchases, error } = await query;

  // Active event
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, date, ivs_playback_url, ivs_channel_arn, is_streaming')
    .eq('is_active', true)
    .maybeSingle();

  // Quick stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .is('refunded_at', null);

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const { count: refundedCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .gte('refunded_at', last30.toISOString());

  const { count: subCount } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'trialing']);

  // Event payout summaries
  const { data: allEvents } = await supabase
    .from('events')
    .select('id, name, date')
    .order('date', { ascending: false })
    .limit(10);

  const eventIds = (allEvents || []).map((e) => e.id);
  const { data: allPaidPurchases } = eventIds.length > 0
    ? await supabase
        .from('purchases')
        .select('event_id, amount_paid')
        .eq('purchase_type', 'ppv')
        .gt('amount_paid', 0)
        .is('refunded_at', null)
        .in('event_id', eventIds)
    : { data: [] };

  const statsByEvent = new Map<string, { count: number; revenue: number }>();
  for (const p of allPaidPurchases || []) {
    const existing = statsByEvent.get(p.event_id) ?? { count: 0, revenue: 0 };
    statsByEvent.set(p.event_id, {
      count: existing.count + 1,
      revenue: existing.revenue + p.amount_paid,
    });
  }

  // VOD stats per event — VOD purchases don't have event_id set, so we join
  // through the Stripe product's event_slug metadata (typically matches events.id).
  const [{ data: paidVodPurchases }, vodProducts] = await Promise.all([
    supabase
      .from('purchases')
      .select('stripe_product_id, amount_paid')
      .eq('purchase_type', 'vod')
      .gt('amount_paid', 0)
      .is('refunded_at', null),
    getProducts(),
  ]);

  const productToEventSlug = new Map<string, string>();
  for (const p of vodProducts) {
    productToEventSlug.set(p.id, p.eventSlug);
  }

  const vodStatsByEvent = new Map<string, { count: number; revenue: number }>();
  for (const p of paidVodPurchases || []) {
    if (!p.stripe_product_id) continue;
    const slug = productToEventSlug.get(p.stripe_product_id);
    if (!slug) continue;
    const existing = vodStatsByEvent.get(slug) ?? { count: 0, revenue: 0 };
    vodStatsByEvent.set(slug, {
      count: existing.count + 1,
      revenue: existing.revenue + p.amount_paid,
    });
  }

  // Boxer comp leaderboard — count per boxer_name for the active event
  const { data: boxerRows } = activeEvent
    ? await supabase
        .from('purchases')
        .select('boxer_name')
        .eq('event_id', activeEvent.id)
        .eq('purchase_type', 'ppv')
        .is('refunded_at', null)
        .not('boxer_name', 'is', null)
    : { data: [] };

  const boxerTally = new Map<string, number>();
  for (const row of boxerRows || []) {
    if (row.boxer_name) {
      boxerTally.set(row.boxer_name, (boxerTally.get(row.boxer_name) ?? 0) + 1);
    }
  }
  const boxerLeaderboard = [...boxerTally.entries()].sort((a, b) => b[1] - a[1]);

  const BASE_URL = 'https://boxstreamtv.com';
  const eventPayouts = await Promise.all(
    (allEvents || []).map(async (event) => {
      const stats = statsByEvent.get(event.id) ?? { count: 0, revenue: 0 };
      const vodStats = vodStatsByEvent.get(event.id) ?? { count: 0, revenue: 0 };
      const rate = getPromoterRate(stats.count);
      const token = await generateReportToken(event.id);
      return {
        ...event,
        ...stats,
        vodCount: vodStats.count,
        vodRevenue: vodStats.revenue,
        rate,
        tier: getTierLabel(stats.count),
        promoterCut: Math.round(stats.revenue * rate),
        ourCut: Math.round(stats.revenue * (1 - rate)),
        reportUrl: `${BASE_URL}/report/${event.id}/${token}`,
      };
    })
  );

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

        {/* Active Event Status */}
        {activeEvent ? (() => {
          const eventDate = new Date(activeEvent.date);
          const replayDeadline = new Date(eventDate.getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
          const purchaseDeadline = new Date(eventDate.getTime() + PURCHASE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
          const now = new Date();
          const replayExpired = replayDeadline < now;
          return (
            <div className={`border p-6 mb-6 ${!replayExpired ? 'border-green-800/50' : 'border-red-700/60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-0.5">Active Event</p>
                  <h2 className="text-white font-bold">{activeEvent.name}</h2>
                </div>
                <span className={`text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 ${replayExpired ? 'bg-red-900/40 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                  {replayExpired ? 'Expired' : 'Live'}
                </span>
              </div>
              <div className="mb-4">
                <AdminStreamToggle isStreaming={!!activeEvent.is_streaming} />
                <p className="text-[10px] text-gray-600 mt-1">
                  {activeEvent.is_streaming ? 'Watch Now button is visible to buyers.' : 'Watch Now button is hidden from buyers.'}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-gray-500 mb-0.5">Event Date</p>
                  <p className="text-white">{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Purchase Deadline</p>
                  <p className={purchaseDeadline > now ? 'text-green-400' : 'text-red-400'}>
                    {purchaseDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {purchaseDeadline < now && ' (closed)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Replay Until</p>
                  <p className={!replayExpired ? 'text-green-400' : 'text-red-400'}>
                    {replayDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {replayExpired && ' (expired)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">IVS Playback URL</p>
                  <p className={activeEvent.ivs_playback_url ? 'text-green-400' : 'text-red-400 font-bold'}>
                    {activeEvent.ivs_playback_url ? 'Set' : 'NOT SET'}
                  </p>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="border border-yellow-800/50 p-4 mb-6 text-sm text-yellow-400">
            No active event — set <code className="text-yellow-300">is_active = true</code> on an event in Supabase to enable purchases and streaming.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="border border-white/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Purchases Today</p>
            <p className="text-3xl font-bold">{todayCount ?? 0}</p>
            <p className="text-[10px] text-gray-600 mt-1">Excludes refunded.</p>
          </div>
          <div className="border border-white/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Active Subscribers</p>
            <p className="text-3xl font-bold">{subCount ?? 0}</p>
          </div>
          <div className="border border-white/10 p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Refunded (30d)</p>
            <p className={`text-3xl font-bold mb-3 ${(refundedCount ?? 0) > 0 ? 'text-red-400' : ''}`}>{refundedCount ?? 0}</p>
            <AdminRefundBackfillButton />
          </div>
        </div>

        {/* Boxer Comp */}
        {activeEvent && (
          <div className="border border-white/10 p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Boxer Comp</h2>
              <span className="text-[10px] text-gray-600">{activeEvent.name}</span>
            </div>
            {boxerLeaderboard.length === 0 ? (
              <p className="text-sm text-gray-600">No info to display yet.</p>
            ) : (
              <div className="space-y-2">
                {boxerLeaderboard.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-white capitalize">{name}</span>
                    <span className="text-gray-400">{count} buyer{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event Payouts */}
        {eventPayouts.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Event Payouts</h2>
              <span className="text-[10px] text-gray-600">Paid PPV; VOD shown separately — comps &amp; refunds excluded</span>
            </div>
            <div className="border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Event', 'Sales', 'Revenue', 'Tier', 'Promoter', 'You & Ryan', 'VOD Sales', 'Report Link'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventPayouts.map((ev) => (
                    <tr key={ev.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{ev.name}</td>
                      <td className="px-4 py-3 text-gray-300">{ev.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-300">${(ev.revenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{Math.round(ev.rate * 100)}%</td>
                      <td className="px-4 py-3 text-white font-semibold">${(ev.promoterCut / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-gray-300">${(ev.ourCut / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ev.vodCount > 0 ? (
                          <span className="text-gray-300">
                            {ev.vodCount.toLocaleString()}
                            <span className="text-gray-600"> · </span>
                            ${(ev.vodRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AdminCopyButton url={ev.reportUrl} />
                          <a
                            href={ev.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-600 hover:text-white transition-colors"
                          >
                            Open →
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-700 mt-2">Share the Report Link directly with the promoter — no login required. The link is cryptographically unique per event.</p>
          </div>
        )}

        {/* Announce Event */}
        <div className="border border-red-900/40 p-6 mb-6">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-400 mb-1">Announce Event</h2>
          <p className="text-xs text-gray-600 mb-4">Emails all active subscribers and past PPV buyers.</p>
          <AdminAnnounceForm />
        </div>

        {/* Grant Access */}
        <div className="border border-white/10 p-6 mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">Grant Access</h2>
          <AdminGrantForm activeEventId={activeEvent?.id ?? null} activeEventName={activeEvent?.name ?? null} />
        </div>

        {/* Send VOD Recovery Link */}
        <div className="border border-white/10 p-6 mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">Send VOD Recovery Link</h2>
          <p className="text-xs text-gray-500 mb-4">
            For guest VOD buyers who lost the cookie or are on a new device. Emails them a one-click link to restore access.
          </p>
          <AdminSendVodRecoveryForm />
        </div>

        {/* Feedback */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Feedback</h2>
            <span className="text-[10px] text-gray-600">{feedbackRows?.length ?? 0} recent</span>
          </div>

          {!feedbackRows?.length ? (
            <div className="border border-white/10 px-5 py-8 text-sm text-gray-500">No feedback yet.</div>
          ) : (
            <div className="border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Date', 'Email', 'Event / VOD', 'Type', 'Overall', 'Quality', 'Process', 'Comment', 'Testimonial'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(feedbackRows ?? []).map((f) => (
                    <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] align-top">
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs max-w-[140px] truncate">{f.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{f.subject}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-500 border border-white/10 px-2 py-0.5">
                          {f.trigger_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-amber-400 text-xs whitespace-nowrap">
                        {'★'.repeat(f.overall_rating)}{'☆'.repeat(5 - f.overall_rating)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {f.quality_rating ? `${f.quality_rating}/5` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {f.process_rating ? `${f.process_rating}/5` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[220px]">
                        {f.comment
                          ? <span className="line-clamp-2">&ldquo;{f.comment}&rdquo;</span>
                          : <span className="text-gray-700">—</span>}
                        {f.what_was_missing && (
                          <p className="text-gray-600 mt-1 text-[10px]">Missing: {f.what_was_missing}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f.comment
                          ? <AdminFeedbackApprove id={f.id} approved={!!f.approved_for_testimonial} />
                          : <span className="text-gray-700 text-[10px]">No comment</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <form method="GET" action="/admin" className="flex gap-3">
            <input
              type="text"
              name="q"
              defaultValue={searchEmail}
              placeholder="Search by email..."
              className="flex-1 bg-white/5 border border-white/20 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
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
                    <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const expired = p.expires_at && new Date(p.expires_at) < new Date();
                    const isRefunded = !!p.refunded_at;
                    const isComp = p.amount_paid === 0;
                    const canRefund = !isRefunded && !isComp && (p.stripe_payment_intent_id || p.stripe_session_id);
                    return (
                      <tr key={p.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${isRefunded ? 'opacity-60' : ''}`}>
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
                          {isComp
                            ? <span className="text-green-400 text-[10px] font-bold uppercase">Comp</span>
                            : <span className={isRefunded ? 'line-through text-gray-500' : ''}>${(p.amount_paid / 100).toFixed(2)}</span>}
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
                        <td className="px-5 py-3">
                          {isRefunded
                            ? <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-red-400 border border-red-900/50 px-2 py-0.5">
                                Refunded {new Date(p.refunded_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            : canRefund
                              ? <AdminRefundButton
                                  purchaseId={p.id}
                                  email={p.email}
                                  amountPaid={p.amount_paid}
                                  productName={p.product_name || '—'}
                                />
                              : <span className="text-gray-700 text-[10px]">—</span>
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
