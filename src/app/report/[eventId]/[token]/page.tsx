import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { verifyReportToken } from '@/lib/report-token';
import { verifyReportSession, reportCookieName } from '@/lib/report-session';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getPromoterRate, getTierLabel, getNextTierInfo } from '@/lib/promoter-rate';
import type { DayData } from './ReportCharts';
import ReportEmailGate from './ReportEmailGate';
import PromoterDashboard from './PromoterDashboard';

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
    .select('id, name, date, promoter_email, promoter_name')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) notFound();

  // Check access: admin cookie OR report session cookie
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value);
  const reportCookie = cookieStore.get(reportCookieName(eventId))?.value;
  const hasReportSession = reportCookie ? await verifyReportSession(eventId, reportCookie) : false;

  if (!isAdmin && !hasReportSession) {
    // If no promoter_email is configured, the OTP gate cannot work — show a clear error
    // rather than letting the promoter enter an email and get silently bounced.
    if (!event.promoter_email) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Promoter Report</p>
          <h1 className="text-xl font-bold text-white mb-3">{event.name}</h1>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            This report isn&apos;t configured yet. Contact{' '}
            <a href="mailto:hunter@boxstreamtv.com" className="text-white underline">hunter@boxstreamtv.com</a>{' '}
            to get access.
          </p>
        </div>
      );
    }
    return <ReportEmailGate eventId={eventId} eventName={event.name} promoterEmail={event.promoter_email} />;
  }

  // Fetch all paid, non-refunded PPV purchases for this event only.
  // session_version = 999 is the refund marker set by the charge.refunded webhook.
  const { data: purchases } = await supabase
    .from('purchases')
    .select('amount_paid, created_at')
    .eq('event_id', eventId)
    .eq('purchase_type', 'ppv')
    .gt('amount_paid', 0)
    .neq('session_version', 999)
    .order('created_at', { ascending: true });

  const rows = purchases || [];
  const totalCount = rows.length;
  const grossRevenueCents = rows.reduce((sum, p) => sum + p.amount_paid, 0);
  const rate = getPromoterRate(totalCount);
  const tierLabel = getTierLabel(totalCount);
  const promoterCutCents = Math.round(grossRevenueCents * rate);
  const ourCutCents = grossRevenueCents - promoterCutCents;
  const nextTier = getNextTierInfo(totalCount);
  const remaining = nextTier ? nextTier.nextThreshold - totalCount : 0;
  const avgPriceCents = totalCount > 0 ? Math.round(grossRevenueCents / totalCount) : 0;
  const projectedRevenueCents = nextTier && avgPriceCents > 0
    ? avgPriceCents * nextTier.nextThreshold
    : 0;
  const projectedCutCents = nextTier ? Math.round(projectedRevenueCents * nextTier.nextRate) : 0;
  const projectedDeltaCents = projectedCutCents - promoterCutCents;
  const tierProgressPct = nextTier
    ? Math.min(remaining > 0 ? 99 : 100, Math.round(((totalCount - nextTier.currentFloor) / (nextTier.nextThreshold - nextTier.currentFloor)) * 100))
    : 100;

  // Group by UTC calendar day for charts
  const dayMap = new Map<string, DayData>();
  for (const p of rows) {
    const d = new Date(p.created_at);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
    first.setUTCHours(0, 0, 0, 0);
    last.setUTCHours(0, 0, 0, 0);
    const cursor = new Date(first);
    while (cursor <= last) {
      const key = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      days.push(dayMap.get(key) ?? { date: key, ts: cursor.getTime(), count: 0, revenue: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <PromoterDashboard
      eventId={eventId}
      promoterName={event.promoter_name ?? ''}
      eventName={event.name}
      eventDate={eventDate}
      totalCount={totalCount}
      grossRevenueCents={grossRevenueCents}
      promoterCutCents={promoterCutCents}
      ourCutCents={ourCutCents}
      rate={rate}
      tierLabel={tierLabel}
      avgPriceCents={avgPriceCents}
      nextTier={nextTier}
      remaining={remaining}
      tierProgressPct={tierProgressPct}
      projectedCutCents={projectedCutCents}
      projectedDeltaCents={projectedDeltaCents}
      days={days}
    />
  );
}
