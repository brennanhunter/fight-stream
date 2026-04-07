import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { createServerClient } from '@/lib/supabase';
import { verifyReportToken } from '@/lib/report-token';
import { verifyReportSession, reportCookieName } from '@/lib/report-session';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getPromoterRate, getTierLabel, getNextTierInfo } from '@/lib/promoter-rate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportCharts, { type DayData } from './ReportCharts';
import ReportEmailGate from './ReportEmailGate';
import TierBreakdown from './TierBreakdown';

export const dynamic = 'force-dynamic';

export default async function PromoterReportPage({
  params,
}: {
  params: Promise<{ eventId: string; token: string }>;
}) {
  const { eventId, token } = await params;

  // Verify the URL token first — 404 if invalid
  const valid = await verifyReportToken(eventId, token);
  if (!valid) notFound();

  const supabase = createServerClient();

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('id, name, date, promoter_email')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) notFound();

  // Check access: admin cookie OR report session cookie
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value);
  const reportCookie = cookieStore.get(reportCookieName(eventId))?.value;
  const hasReportSession = reportCookie ? await verifyReportSession(eventId, reportCookie) : false;

  if (!isAdmin && !hasReportSession) {
    return <ReportEmailGate eventId={eventId} eventName={event.name} />;
  }

  // Fetch all paid PPV purchases for this event only
  const { data: purchases } = await supabase
    .from('purchases')
    .select('amount_paid, created_at')
    .eq('event_id', eventId)
    .eq('purchase_type', 'ppv')
    .gt('amount_paid', 0)
    .order('created_at', { ascending: true });

  const rows = purchases || [];
  const totalCount = rows.length;
  const grossRevenueCents = rows.reduce((sum, p) => sum + p.amount_paid, 0);
  const rate = getPromoterRate(totalCount);
  const tierLabel = getTierLabel(totalCount);
  const promoterCutCents = Math.round(grossRevenueCents * rate);
  const ourCutCents = grossRevenueCents - promoterCutCents;
  const nextTier = getNextTierInfo(totalCount);
  const avgPriceCents = totalCount > 0 ? Math.round(grossRevenueCents / totalCount) : 0;
  const projectedRevenueCents = nextTier && avgPriceCents > 0
    ? avgPriceCents * nextTier.nextThreshold
    : 0;
  const projectedCutCents = nextTier ? Math.round(projectedRevenueCents * nextTier.nextRate) : 0;
  const projectedDeltaCents = projectedCutCents - promoterCutCents;
  const tierProgressPct = nextTier
    ? Math.min(100, Math.round(((totalCount - nextTier.currentFloor) / (nextTier.nextThreshold - nextTier.currentFloor)) * 100))
    : 100;
  const remaining = nextTier ? nextTier.nextThreshold - totalCount : 0;

  // Group by calendar day for charts
  const dayMap = new Map<string, DayData>();
  for (const p of rows) {
    const d = new Date(p.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = dayMap.get(key) ?? { date: key, ts: d.getTime(), count: 0, revenue: 0 };
    dayMap.set(key, {
      date: key,
      ts: d.getTime(),
      count: existing.count + 1,
      revenue: existing.revenue + p.amount_paid,
    });
  }

  // Fill zero-count days between first and last purchase so the chart is continuous
  const days: DayData[] = [];
  if (rows.length > 0) {
    const first = new Date(rows[0].created_at);
    const last = new Date(rows[rows.length - 1].created_at);
    first.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    const cursor = new Date(first);
    while (cursor <= last) {
      const key = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push(dayMap.get(key) ?? { date: key, ts: cursor.getTime(), count: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const fmt = (cents: number) =>
    cents === 0 ? '$0.00' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Image
            src="/logos/BoxStreamVerticalLogo.png"
            alt="BoxStreamTV"
            width={120}
            height={48}
            className="h-12 w-auto"
          />
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-300">Promoter Report</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Live data — updates in real time</p>
          </div>
        </div>

        {/* Event name */}
        <div className="mb-10">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-300 mb-2">Event</p>
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-gray-300 text-sm mt-1">{eventDate}</p>
          <div className="w-12 h-[2px] bg-white mt-4" />
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Paid Purchases', value: totalCount.toLocaleString() },
            { label: 'Gross Revenue', value: fmt(grossRevenueCents) },
            { label: `Your Cut`, value: fmt(promoterCutCents) },
            { label: 'Platform Cut', value: fmt(ourCutCents) },
          ].map((stat) => (
            <Card key={stat.label} className="bg-zinc-900 border-white/20 text-white">
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tier */}
        <Card className="bg-zinc-900 border-white/20 text-white mb-4">
          <CardContent className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300 mb-1">Current Tier</p>
              <p className="text-white font-semibold">{tierLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300 mb-1">Your Rate</p>
              <p className="text-3xl font-bold">{Math.round(rate * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Next tier progress */}
        {nextTier ? (
          <Card className="bg-zinc-900 border-white/20 text-white mb-4">
            <CardContent className="px-5 py-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300 mb-1">Next Tier</p>
                  <p className="text-white font-semibold">
                    {remaining.toLocaleString()} more {remaining === 1 ? 'sale' : 'sales'} to unlock{' '}
                    <span className="text-white font-bold">{Math.round(nextTier.nextRate * 100)}%</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300 mb-1">
                    {totalCount.toLocaleString()} / {nextTier.nextThreshold.toLocaleString()}
                  </p>
                  <p className="text-2xl font-bold">{tierProgressPct}%</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
              {/* Projection */}
              {projectedDeltaCents > 0 && (
                <p className="text-[11px] text-gray-300 mt-3 leading-relaxed">
                  At {nextTier.nextThreshold.toLocaleString()} sales (avg {fmt(avgPriceCents)}/ticket), you&apos;d earn{' '}
                  <span className="text-white font-semibold">{fmt(projectedCutCents)}</span> — that&apos;s{' '}
                  <span className="text-white font-semibold">+{fmt(projectedDeltaCents)}</span> more than your current rate.
                </p>
              )}
              {projectedDeltaCents === 0 && (
                <p className="text-[11px] text-gray-300 mt-3 leading-relaxed">
                  Hit {nextTier.nextThreshold.toLocaleString()} sales and every dollar earned starts paying you{' '}
                  <span className="text-white font-semibold">{Math.round(nextTier.nextRate * 100)}%</span> — automatically.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-zinc-900 border-white/20 text-white mb-4">
            <CardContent className="px-5 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300 mb-1">Tier Status</p>
                <p className="text-white font-semibold">You&apos;ve reached the top tier</p>
              </div>
              <p className="text-3xl font-bold">80%</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-8">
          <TierBreakdown currentCount={totalCount} />
          <p className="text-[10px] text-gray-400 max-w-xs text-right leading-relaxed">
            Payouts are issued 14 days after the event. Final amounts may be adjusted for chargebacks or refunds processed during that window.
          </p>
        </div>

        {/* Charts */}
        <Card className="bg-zinc-900 border-white/20 text-white mb-8">
          <CardContent className="px-5 py-6">
            <ReportCharts days={days} />
          </CardContent>
        </Card>

        {/* Notes */}
        <p className="text-[11px] text-gray-400 leading-relaxed">
          This report reflects paid PPV purchases only. Complimentary accesses are excluded from all calculations.
          Stripe processing fees (~2.9% + $0.30 per transaction) are deducted from the platform share before payout.
          Questions? Email <a href="mailto:hunter@boxstreamtv.com" className="underline hover:text-white transition-colors">hunter@boxstreamtv.com</a>.
        </p>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-[10px] text-gray-500">Powered by BoxStreamTV</p>
          <p className="text-[10px] text-gray-500">boxstreamtv.com</p>
        </div>

      </div>
    </div>
  );
}
