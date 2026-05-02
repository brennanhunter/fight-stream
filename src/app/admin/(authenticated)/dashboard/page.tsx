import { Suspense } from 'react';
import Kpis, { KpisSkeleton } from './_components/Kpis';
import ActiveEvent, { ActiveEventSkeleton } from './_components/ActiveEvent';
import BoxerComp, { BoxerCompSkeleton } from './_components/BoxerComp';
import RecentActivity, { RecentActivitySkeleton } from './_components/RecentActivity';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <Suspense fallback={<KpisSkeleton />}>
        <Kpis />
      </Suspense>

      <Suspense fallback={<ActiveEventSkeleton />}>
        <ActiveEvent />
      </Suspense>

      <Suspense fallback={<BoxerCompSkeleton />}>
        <BoxerComp />
      </Suspense>

      <Suspense fallback={<RecentActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
