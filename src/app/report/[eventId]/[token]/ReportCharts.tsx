'use client';

import { useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';

export interface DayData {
  date: string;
  ts: number; // start-of-day timestamp ms
  count: number;
  revenue: number; // cents
}

type Period = 'today' | 'week' | 'month' | 'all';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week'  },
  { label: 'This Month', value: 'month' },
  { label: 'All Time',   value: 'all'   },
];

function filterByPeriod(days: DayData[], period: Period): DayData[] {
  if (period === 'all') return days;
  // Use UTC dates to match server-generated ts values (Vercel runs UTC)
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  if (period === 'week')  cutoff.setUTCDate(cutoff.getUTCDate() - 6);
  if (period === 'month') cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  return days.filter((d) => d.ts >= cutoff.getTime());
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const theme = {
  axis: {
    ticks: { text: { fill: '#6b7280', fontSize: 11 } },
    legend: { text: { fill: '#6b7280' } },
  },
  grid: { line: { stroke: 'rgba(255,255,255,0.06)' } },
  tooltip: {
    container: {
      background: '#111',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#fff',
      fontSize: 12,
      borderRadius: 4,
    },
  },
};

export default function ReportCharts({ days }: { days: DayData[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = filterByPeriod(days, period);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const chartDays = filtered.length > 0
    ? filtered
    : [{ date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: today.getTime(), count: 0, revenue: 0 }];
  const isEmpty = filtered.length === 0;

  // Bar chart data
  const barData = chartDays.map((d) => ({ date: d.date, Purchases: d.count }));
  const revenueData = chartDays.map((d) => ({ date: d.date, Revenue: d.revenue / 100 }));

  // Cumulative line data
  let running = 0;
  const lineData = [{
    id: 'Cumulative',
    data: chartDays.map((d) => {
      running += d.count;
      return { x: d.date, y: running };
    }),
  }];

  return (
    <div className="space-y-10">
      {/* Period toggle */}
      <div className="flex gap-1">
        {PERIODS.map((p) => (
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

      {isEmpty && (
        <p className="text-[11px] text-gray-500">No sales in this period — charts will populate as purchases come in.</p>
      )}

      {!mounted ? (
        <div className="space-y-10">
          {['Purchases Per Day', 'Cumulative Purchases', 'Revenue Per Day'].map((label) => (
            <div key={label}>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">{label}</p>
              <div className="h-52 bg-white/[0.02] animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Purchases per day */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">Purchases Per Day</p>
            <div className="h-52">
              <ResponsiveBar
                data={barData}
                keys={['Purchases']}
                indexBy="date"
                theme={theme}
                colors={['#ffffff']}
                borderRadius={2}
                padding={0.35}
                margin={{ top: 4, right: 4, bottom: chartDays.length > 10 ? 56 : 36, left: 36 }}
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: chartDays.length > 10 ? -45 : 0 }}
                axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => Number.isInteger(v) ? v : '' }}
                gridYValues={4}
                enableLabel={false}
                isInteractive={true}
                tooltip={({ value, indexValue }) => (
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
                    <strong>{indexValue}</strong>: {value} {value === 1 ? 'purchase' : 'purchases'}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Cumulative purchases */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">Cumulative Purchases</p>
            <div className="h-52">
              <ResponsiveLine
                data={lineData}
                theme={theme}
                colors={['#ffffff']}
                margin={{ top: 4, right: 4, bottom: chartDays.length > 10 ? 56 : 36, left: 36 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: chartDays.length > 10 ? -45 : 0 }}
                axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => Number.isInteger(v) ? v : '' }}
                gridYValues={4}
                enablePoints={chartDays.length === 1}
                pointSize={6}
                pointColor="#ffffff"
                enableArea={true}
                areaOpacity={0.08}
                curve="monotoneX"
                enableCrosshair={true}
                useMesh={true}
                tooltip={({ point }) => (
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
                    <strong>{point.data.xFormatted}</strong>: {point.data.y as number} total
                  </div>
                )}
              />
            </div>
          </div>

          {/* Revenue per day */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">Revenue Per Day</p>
            <div className="h-52">
              <ResponsiveBar
                data={revenueData}
                keys={['Revenue']}
                indexBy="date"
                theme={theme}
                colors={['#ffffff']}
                borderRadius={2}
                padding={0.35}
                margin={{ top: 4, right: 4, bottom: chartDays.length > 10 ? 56 : 36, left: 52 }}
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: chartDays.length > 10 ? -45 : 0 }}
                axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` }}
                gridYValues={4}
                enableLabel={false}
                isInteractive={true}
                tooltip={({ value, indexValue }) => (
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 10px', fontSize: 12, color: '#fff', borderRadius: 4 }}>
                    <strong>{indexValue}</strong>: {fmt((value as number) * 100)}
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
