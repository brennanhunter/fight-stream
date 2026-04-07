'use client';

import { useEffect, useState } from 'react';

export interface DayData {
  date: string;   // e.g. "Apr 5"
  count: number;
  revenue: number; // cents
}

function BarChart({
  days,
  valueKey,
  formatValue,
  animated,
}: {
  days: DayData[];
  valueKey: 'count' | 'revenue';
  formatValue: (v: number) => string;
  animated: boolean;
}) {
  const values = days.map((d) => d[valueKey]);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-36">
      {days.map((day) => {
        const val = day[valueKey];
        const pct = (val / max) * 100;
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
            {/* Tooltip */}
            {val > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-white text-black text-[10px] font-bold px-2 py-1 whitespace-nowrap">
                  {formatValue(val)}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white" />
              </div>
            )}
            <div
              className="w-full bg-white transition-all duration-700 ease-out"
              style={{
                height: animated ? `${pct}%` : '0%',
                minHeight: val > 0 && animated ? '2px' : '0',
              }}
            />
            <span className="text-[8px] text-gray-600 truncate w-full text-center">{day.date}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportCharts({ days }: { days: DayData[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  if (days.length === 0) {
    return <p className="text-gray-600 text-sm">No purchase data to display.</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
          Purchases Per Day
        </p>
        <BarChart
          days={days}
          valueKey="count"
          formatValue={(v) => `${v} purchase${v !== 1 ? 's' : ''}`}
          animated={animated}
        />
      </div>

      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-4">
          Revenue Per Day
        </p>
        <BarChart
          days={days}
          valueKey="revenue"
          formatValue={(v) => `$${(v / 100).toFixed(2)}`}
          animated={animated}
        />
      </div>
    </div>
  );
}
