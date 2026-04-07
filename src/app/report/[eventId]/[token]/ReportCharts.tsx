'use client';

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
  count: number;
  revenue: number; // cents
}

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

export default function ReportCharts({ days }: { days: DayData[] }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const chartDays = days.length > 0 ? days : [{ date: today, count: 0, revenue: 0 }];
  const isEmpty = days.length === 0;

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
      {isEmpty && (
        <p className="text-[11px] text-gray-600">No sales yet — charts will populate as purchases come in.</p>
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
