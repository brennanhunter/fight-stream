'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import type { DayData } from './ReportCharts';
import type { NextTierInfo } from '@/lib/promoter-rate';

// ─── Types ────────────────────────────────────────────────────────────────────
type View = 'overview' | 'revenue' | 'sales' | 'growth' | 'tier';
type Period = 'week' | 'month' | 'all';

export interface PromoterDashboardProps {
  promoterName: string;
  eventName: string;
  eventDate: string;
  totalCount: number;
  grossRevenueCents: number;
  promoterCutCents: number;
  ourCutCents: number;
  rate: number;
  tierLabel: string;
  avgPriceCents: number;
  nextTier: NextTierInfo | null;
  remaining: number;
  tierProgressPct: number;
  projectedCutCents: number;
  projectedDeltaCents: number;
  days: DayData[];
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV: { id: View; label: string; tip: string }[] = [
  { id: 'overview', label: 'Overview',      tip: 'Key stats and all charts in one place.' },
  { id: 'revenue',  label: 'Revenue',       tip: 'Gross revenue per day with your share broken out.' },
  { id: 'sales',    label: 'Daily Sales',   tip: 'Tickets sold each calendar day — spikes usually follow a post or announcement.' },
  { id: 'growth',   label: 'Growth',        tip: "Running total of all paid sales — shows your event's overall trajectory." },
  { id: 'tier',     label: 'Tier & Payout', tip: 'Your current revenue share rate and how many sales it takes to unlock the next tier.' },
];

const TIER_ROWS: { range: string; promoter: string; platform: string }[] = [
  { range: '0 – 99',         promoter: '0%',  platform: '100%' },
  { range: '100 – 1,000',    promoter: '20%', platform: '80%'  },
  { range: '1,001 – 2,000',  promoter: '30%', platform: '70%'  },
  { range: '2,001 – 3,000',  promoter: '40%', platform: '60%'  },
  { range: '3,001 – 4,000',  promoter: '50%', platform: '50%'  },
  { range: '4,001 – 5,000',  promoter: '60%', platform: '40%'  },
  { range: '5,001 – 6,000',  promoter: '70%', platform: '30%'  },
  { range: '6,001+',         promoter: '80%', platform: '20%'  },
];

// ─── Shared chart theme ───────────────────────────────────────────────────────
const THEME = {
  axis: { ticks: { text: { fill: '#6b7280', fontSize: 11 } }, legend: { text: { fill: '#6b7280' } } },
  grid: { line: { stroke: 'rgba(255,255,255,0.06)' } },
  tooltip: {
    container: {
      background: '#111', border: '1px solid rgba(255,255,255,0.12)',
      color: '#fff', fontSize: 12, borderRadius: 4,
    },
  },
};

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: 'week',  label: 'Last 7 Days'  },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'all',   label: 'All Time'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(cents: number) {
  return cents === 0
    ? '$0.00'
    : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function filterDays(days: DayData[], period: Period): DayData[] {
  if (period === 'all') return days;
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  if (period === 'week')  cutoff.setUTCDate(cutoff.getUTCDate() - 6);
  if (period === 'month') cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  return days.filter((d) => d.ts >= cutoff.getTime());
}

function isTierActive(range: string, count: number) {
  if (count < 100   && range === '0 – 99')         return true;
  if (count >= 100  && count <= 1000  && range === '100 – 1,000')    return true;
  if (count >= 1001 && count <= 2000  && range === '1,001 – 2,000')  return true;
  if (count >= 2001 && count <= 3000  && range === '2,001 – 3,000')  return true;
  if (count >= 3001 && count <= 4000  && range === '3,001 – 4,000')  return true;
  if (count >= 4001 && count <= 5000  && range === '4,001 – 5,000')  return true;
  if (count >= 5001 && count <= 6000  && range === '5,001 – 6,000')  return true;
  if (count > 6000  && range === '6,001+')          return true;
  return false;
}

// ─── Tip bubble ───────────────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-3.5 h-3.5 text-[8px] font-bold text-gray-600 border border-gray-700 rounded-full hover:text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center leading-none"
        aria-label="More info"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-zinc-900 border border-white/10 text-[11px] text-gray-300 px-3 py-2 z-50 pointer-events-none shadow-xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

function SectionLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-400">{label}</p>
      <Tip text={tip} />
    </div>
  );
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function Typewriter({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, 45);
    return () => clearInterval(iv);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-white align-middle ml-0.5 animate-pulse" />}
    </span>
  );
}

// ─── Tour ─────────────────────────────────────────────────────────────────────
interface TourStep { title: string; body: string; activateView?: View }
const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to your Dashboard',
    body: 'This is your real-time promoter report for this event. Use the sidebar to navigate between sections. Click Next to take a quick tour.',
  },
  {
    title: 'Overview',
    body: "The Overview shows your top-line numbers at a glance — paid sales, gross revenue, your cut, and our cut. You'll also see your current tier and how close you are to the next one.",
    activateView: 'overview',
  },
  {
    title: 'Revenue',
    body: 'The Revenue tab breaks down how much money came in each day and exactly what your payout looks like at your current tier rate.',
    activateView: 'revenue',
  },
  {
    title: 'Daily Sales',
    body: 'Daily Sales shows how many tickets sold each calendar day. Spikes usually line up with a post, email blast, or announcement — useful for timing future marketing pushes.',
    activateView: 'sales',
  },
  {
    title: 'Growth',
    body: 'The Growth chart shows your running total over time. A steep slope means strong momentum. Use this to see the overall trajectory of the event.',
    activateView: 'growth',
  },
  {
    title: 'Tier & Payout',
    body: 'Your revenue share rate is tiered based on total paid sales. The higher the tier, the bigger your percentage — and it applies to all sales retroactively, not just the ones above the threshold.',
    activateView: 'tier',
  },
  {
    title: 'Period Filter',
    body: 'On any chart view you can toggle between Last 7 Days, Last 30 Days, or All Time. The stat cards always reflect your all-time totals for this event.',
    activateView: 'overview',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function PromoterDashboard({
  promoterName,
  eventName,
  eventDate,
  totalCount,
  grossRevenueCents,
  promoterCutCents,
  ourCutCents,
  rate,
  tierLabel,
  avgPriceCents,
  nextTier,
  remaining,
  tierProgressPct,
  projectedCutCents,
  projectedDeltaCents,
  days,
}: PromoterDashboardProps) {
  const [view, setView]         = useState<View>('overview');
  const [period, setPeriod]     = useState<Period>('all');
  const [mounted, setMounted]   = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);

  const tourActive       = tourStep !== null;
  const currentTourStep  = tourStep !== null ? TOUR_STEPS[tourStep] : null;

  function startTour()   { setTourStep(0); setView('overview'); }
  function advanceTour() {
    if (tourStep === null) return;
    const next = tourStep + 1;
    if (next >= TOUR_STEPS.length) { setTourStep(null); return; }
    const step = TOUR_STEPS[next];
    if (step.activateView) setView(step.activateView);
    setTourStep(next);
  }
  function skipTour() { setTourStep(null); }

  // Chart data
  const filtered     = filterDays(days, period);
  const today        = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const chartDays    = filtered.length > 0
    ? filtered
    : [{ date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: today.getTime(), count: 0, revenue: 0 }];
  const isEmpty      = filtered.length === 0;
  const rotate       = chartDays.length > 10;
  const bottomMargin = rotate ? 56 : 36;

  const barData     = chartDays.map((d) => ({ date: d.date, Purchases: d.count }));
  const revenueData = chartDays.map((d) => ({ date: d.date, Revenue: d.revenue / 100 }));
  let running = 0;
  const lineData = [{ id: 'Cumulative', data: chartDays.map((d) => { running += d.count; return { x: d.date, y: running }; }) }];

  const Skeleton = () => <div className="h-64 bg-white/[0.02] animate-pulse" />;

  const PeriodToggle = (
    <div className="flex gap-1 mb-6">
      {PERIOD_LABELS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={`text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1.5 transition-all duration-150 ${
            period === p.value
              ? 'bg-white text-black'
              : 'text-gray-500 hover:text-white border border-white/10 hover:border-white/30'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const EmptyNotice = isEmpty && (
    <p className="text-[11px] text-gray-500 mb-6">No sales in this period — charts will populate as purchases come in.</p>
  );

  const PurchasesChart = !mounted ? <Skeleton /> : (
    <div className="h-64">
      <ResponsiveBar
        data={barData} keys={['Purchases']} indexBy="date" theme={THEME}
        colors={['#ffffff']} borderRadius={2} padding={0.35}
        margin={{ top: 4, right: 4, bottom: bottomMargin, left: 36 }}
        axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: rotate ? -45 : 0 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => Number.isInteger(v) ? v : '' }}
        gridYValues={4} enableLabel={false} isInteractive
        tooltip={({ value, indexValue }) => (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
            <strong>{indexValue}</strong>: {value} {value === 1 ? 'sale' : 'sales'}
          </div>
        )}
      />
    </div>
  );

  const GrowthChart = !mounted ? <Skeleton /> : (
    <div className="h-64">
      <ResponsiveLine
        data={lineData} theme={THEME} colors={['#ffffff']}
        margin={{ top: 4, right: 4, bottom: bottomMargin, left: 36 }}
        xScale={{ type: 'point' }} yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
        axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: rotate ? -45 : 0 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => Number.isInteger(v) ? v : '' }}
        gridYValues={4} enablePoints={chartDays.length === 1} pointSize={6} pointColor="#fff"
        enableArea areaOpacity={0.08} curve="monotoneX" enableCrosshair useMesh
        tooltip={({ point }) => (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
            <strong>{point.data.xFormatted}</strong>: {point.data.y as number} total
          </div>
        )}
      />
    </div>
  );

  const RevenueChart = !mounted ? <Skeleton /> : (
    <div className="h-64">
      <ResponsiveBar
        data={revenueData} keys={['Revenue']} indexBy="date" theme={THEME}
        colors={['#ffffff']} borderRadius={2} padding={0.35}
        margin={{ top: 4, right: 4, bottom: bottomMargin, left: 56 }}
        axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: rotate ? -45 : 0 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` }}
        gridYValues={4} enableLabel={false} isInteractive
        tooltip={({ value, indexValue }) => (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
            <strong>{indexValue}</strong>: {fmt((value as number) * 100)}
          </div>
        )}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-white/10 flex flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10">
          <Image src="/logos/BoxStreamVerticalLogo.png" alt="BoxStreamTV" width={100} height={40} className="h-9 w-auto" />
        </div>

        {/* Event info */}
        <div className="px-5 pt-4 pb-5 border-b border-white/10">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">Promoter Report</p>
          <p className="text-white text-xs font-semibold leading-snug">{eventName}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{eventDate}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 mb-0.5 text-left transition-all duration-150 ${
                view === item.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              } ${tourActive && currentTourStep?.activateView === item.id && view !== item.id ? 'ring-1 ring-white/60' : ''}`}
            >
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase flex-1">{item.label}</span>
              {view !== item.id && (
                <span onClick={(e) => e.stopPropagation()}>
                  <Tip text={item.tip} />
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[9px] text-gray-700">Powered by BoxStreamTV</p>
          <p className="text-[9px] text-gray-700 mt-0.5">Refreshes with each page load</p>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-8 py-10 min-w-0">

        {/* Greeting */}
        <div className="mb-10 flex items-end justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            <Typewriter text={`Welcome${promoterName ? ` ${promoterName}` : ''}, to the BoxStreamTV Dashboard.`} />
          </h1>
          {!tourActive && (
            <button
              onClick={startTour}
              className="shrink-0 text-[10px] font-bold tracking-[0.15em] uppercase px-4 py-2 border border-white/20 text-gray-400 hover:border-white hover:text-white transition-all duration-150"
            >
              Take a Tour →
            </button>
          )}
        </div>

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {view === 'overview' && (
          <div className="space-y-10">
            <div>
              <SectionLabel label="Key Stats" tip="A snapshot of all top-level numbers for this event." />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  { label: 'Paid Purchases', value: totalCount.toLocaleString(),  tip: 'Total paid tickets. Complimentary accesses are excluded.' },
                  { label: 'Gross Revenue',  value: fmt(grossRevenueCents),        tip: 'Total collected before any fees or splits.' },
                  { label: 'Your Cut',       value: fmt(promoterCutCents),         tip: `Your ${Math.round(rate * 100)}% share of gross at the current tier.` },
                  { label: 'Platform Cut',   value: fmt(ourCutCents),              tip: "BoxStreamTV's share, covering infrastructure, streaming, and payment processing." },
                ] as { label: string; value: string; tip: string }[]).map((s) => (
                  <div key={s.label} className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">{s.label}</p>
                      <Tip text={s.tip} />
                    </div>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier snapshot */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Current Tier</p>
                  <Tip text="Your revenue share rate based on total paid sales for this event." />
                </div>
                <p className="text-2xl font-bold">{Math.round(rate * 100)}%</p>
                <p className="text-[11px] text-gray-500 mt-1">{tierLabel}</p>
              </div>
              {nextTier ? (
                <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Next Tier</p>
                    <Tip text="Hitting this unlocks a higher rate applied to all sales — not just the ones above the threshold." />
                  </div>
                  <p className="text-2xl font-bold">{remaining.toLocaleString()} more</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    to unlock {Math.round(nextTier.nextRate * 100)}% ({totalCount.toLocaleString()} / {nextTier.nextThreshold.toLocaleString()})
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Tier Status</p>
                  </div>
                  <p className="text-2xl font-bold">80%</p>
                  <p className="text-[11px] text-gray-500 mt-1">Top tier reached</p>
                </div>
              )}
            </div>

            <div>
              {PeriodToggle}
              {EmptyNotice}
              <SectionLabel label="Daily Sales" tip="Click 'Daily Sales' in the sidebar for a full-size view." />
              {PurchasesChart}
            </div>
            <div>
              {PeriodToggle}
              {EmptyNotice}
              <SectionLabel label="Cumulative Growth" tip="Running total over time — click 'Growth' for a full-size view." />
              {GrowthChart}
            </div>
            <div>
              {PeriodToggle}
              {EmptyNotice}
              <SectionLabel label="Revenue Per Day" tip="Click 'Revenue' in the sidebar for a full-size view." />
              {RevenueChart}
            </div>
          </div>
        )}

        {/* ── REVENUE ─────────────────────────────────────────────────────── */}
        {view === 'revenue' && (
          <div className="space-y-8">
            {PeriodToggle}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Gross Revenue</p>
                  <Tip text="Total collected before any fees are applied." />
                </div>
                <p className="text-3xl font-bold">{fmt(grossRevenueCents)}</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Your Cut ({Math.round(rate * 100)}%)</p>
                  <Tip text="Your payout at the current tier rate, applied to gross revenue." />
                </div>
                <p className="text-3xl font-bold">{fmt(promoterCutCents)}</p>
              </div>
            </div>
            {EmptyNotice}
            <div>
              <SectionLabel label="Revenue Per Day" tip="Hover any bar for the exact gross figure that day. Revenue is in USD." />
              {RevenueChart}
            </div>
            <div className="border border-white/10 px-5 py-4 text-[11px] text-gray-400 leading-relaxed">
              Payouts are issued <strong className="text-white">14 days after the event</strong>, adjusted for any chargebacks or refunds during that window. Stripe processing fees (~2.9% + $0.30/transaction) are deducted from the platform share — not yours.
            </div>
          </div>
        )}

        {/* ── DAILY SALES ─────────────────────────────────────────────────── */}
        {view === 'sales' && (
          <div className="space-y-8">
            {PeriodToggle}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Total Paid Sales</p>
                  <Tip text="Paid PPV orders only. Complimentary accesses are excluded." />
                </div>
                <p className="text-3xl font-bold">{totalCount.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Avg Ticket Price</p>
                  <Tip text="Gross revenue divided by total paid orders." />
                </div>
                <p className="text-3xl font-bold">{fmt(avgPriceCents)}</p>
              </div>
            </div>
            {EmptyNotice}
            <div>
              <SectionLabel label="Purchases Per Day" tip="Spikes usually follow marketing pushes or announcements. Use this to see which outreach drove the most sales." />
              {PurchasesChart}
            </div>
          </div>
        )}

        {/* ── GROWTH ──────────────────────────────────────────────────────── */}
        {view === 'growth' && (
          <div className="space-y-8">
            {PeriodToggle}
            <div className="bg-zinc-900 border border-white/10 px-5 pt-4 pb-5 inline-block">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Total to Date</p>
                <Tip text="All-time paid purchase count for this event." />
              </div>
              <p className="text-3xl font-bold">{totalCount.toLocaleString()} sales</p>
            </div>
            {EmptyNotice}
            <div>
              <SectionLabel label="Cumulative Purchases" tip="Each point is the running total up to that day. A steeper slope means faster momentum. Flat stretches are slow periods." />
              {GrowthChart}
            </div>
          </div>
        )}

        {/* ── TIER & PAYOUT ───────────────────────────────────────────────── */}
        {view === 'tier' && (
          <div className="space-y-6">
            {/* Current tier */}
            <div className="bg-zinc-900 border border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Current Tier</p>
                  <Tip text="Your tier is based on total paid sales for this event. Higher tiers unlock a larger share of gross revenue." />
                </div>
                <p className="text-white font-semibold">{tierLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">Your Rate</p>
                <p className="text-3xl font-bold">{Math.round(rate * 100)}%</p>
              </div>
            </div>

            {/* Progress to next tier */}
            {nextTier ? (
              <div className="bg-zinc-900 border border-white/10 px-5 py-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">Next Tier</p>
                      <Tip text="Hitting this threshold raises your rate for all sales — retroactively applied to your entire event total, not just the sales above the threshold." />
                    </div>
                    <p className="text-white font-semibold">
                      {remaining.toLocaleString()} more {remaining === 1 ? 'sale' : 'sales'} to unlock{' '}
                      <span className="font-bold">{Math.round(nextTier.nextRate * 100)}%</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-0.5">
                      {totalCount.toLocaleString()} / {nextTier.nextThreshold.toLocaleString()}
                    </p>
                    <p className="text-2xl font-bold">{tierProgressPct}%</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${tierProgressPct}%` }} />
                </div>
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
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/10 px-5 py-4 flex items-center justify-between">
                <p className="text-white font-semibold">You&apos;ve reached the top tier</p>
                <p className="text-3xl font-bold">80%</p>
              </div>
            )}

            {/* Tier table */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">All Tiers</p>
                <Tip text="Your rate updates automatically as soon as you cross a threshold. No action needed." />
              </div>
              <div className="border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Purchases', 'Your Cut', 'Platform'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_ROWS.map((tier) => {
                      const active = isTierActive(tier.range, totalCount);
                      return (
                        <tr key={tier.range} className={`border-b border-white/5 ${active ? 'bg-white/[0.06]' : ''}`}>
                          <td className="px-4 py-3 text-gray-300 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-white' : ''}`} />
                            {tier.range}
                          </td>
                          <td className={`px-4 py-3 text-center font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{tier.promoter}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{tier.platform}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
                Payouts are issued 14 days after the event. Stripe processing fees (~2.9% + $0.30/transaction) are deducted from the platform share — not yours. Questions?{' '}
                <a href="mailto:hunter@boxstreamtv.com" className="underline hover:text-gray-300 transition-colors">hunter@boxstreamtv.com</a>
              </p>
            </div>
          </div>
        )}

      </main>

      {/* ── Tour bubble ─────────────────────────────────────────────────────── */}
      {tourActive && currentTourStep && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" />
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-zinc-900 border border-white/20 shadow-2xl">
            <div className="h-[2px] bg-white/10">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${((tourStep! + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500">
                  Step {tourStep! + 1} of {TOUR_STEPS.length}
                </p>
                <button
                  onClick={skipTour}
                  className="text-[9px] font-bold tracking-[0.15em] uppercase text-gray-600 hover:text-gray-300 transition-colors"
                >
                  Skip Tour
                </button>
              </div>
              <p className="text-white font-bold text-base mb-2">{currentTourStep.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed mb-5">{currentTourStep.body}</p>
              <button
                onClick={advanceTour}
                className="w-full px-4 py-2.5 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-200 transition-colors"
              >
                {tourStep! + 1 >= TOUR_STEPS.length ? 'Finish Tour' : 'Next →'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
