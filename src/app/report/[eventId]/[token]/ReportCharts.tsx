'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export interface DayData {
  date: string;
  ts: number; // start-of-day timestamp ms
  count: number;
  revenue: number; // cents
}

type Period = 'today' | 'week' | 'month' | 'all';

const purchaseConfig: ChartConfig = {
  count: {
    label: 'Purchases',
    color: '#ffffff',
  },
};

const revenueConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#ffffff',
  },
};

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

function filterByPeriod(days: DayData[], period: Period): DayData[] {
  if (period === 'all') return days;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 6);
  if (period === 'month') cutoff.setDate(cutoff.getDate() - 29);
  return days.filter((d) => d.ts >= cutoff.getTime());
}

export default function ReportCharts({ days }: { days: DayData[] }) {
  const [period, setPeriod] = useState<Period>('all');

  const filtered = filterByPeriod(days, period);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const chartDays = filtered.length > 0 ? filtered : [{ date: today, ts: now.getTime(), count: 0, revenue: 0 }];
  const isEmpty = filtered.length === 0;

  // Build cumulative data for area chart
  let running = 0;
  const cumulativeData = chartDays.map((d) => {
    running += d.count;
    return { ...d, cumulative: running };
  });

  const revenueData = chartDays.map((d) => ({
    ...d,
    revenueDollars: d.revenue / 100,
  }));

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
        <p className="text-[11px] text-gray-600">No sales in this period — charts will populate as purchases come in.</p>
      )}

      {/* Purchases per day */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
          Purchases Per Day
        </p>
        <ChartContainer config={purchaseConfig} className="h-52 w-full">
          <BarChart data={chartDays} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="count" fill="#ffffff" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Cumulative purchases */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
          Cumulative Purchases
        </p>
        <ChartContainer config={purchaseConfig} className="h-52 w-full">
          <AreaChart data={cumulativeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="cumulative"
              stroke="#ffffff"
              strokeWidth={2}
              fill="url(#cumulativeGradient)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Revenue per day */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
          Revenue Per Day
        </p>
        <ChartContainer config={revenueConfig} className="h-52 w-full">
          <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={
                <ChartTooltipContent
                  formatter={(value) => [fmt((value as number) * 100), 'Revenue']}
                />
              }
            />
            <Bar dataKey="revenueDollars" fill="#ffffff" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

    </div>
  );
}
