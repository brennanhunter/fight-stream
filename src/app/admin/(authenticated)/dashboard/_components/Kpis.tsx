import { ShoppingCart, Users, Undo2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createServerClient } from '@/lib/supabase';

async function getKpis() {
  const supabase = createServerClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);

  const [todayRes, subRes, refundedRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .is('refunded_at', null),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trialing']),
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .gte('refunded_at', last30.toISOString()),
  ]);

  return {
    todayCount: todayRes.count ?? 0,
    subCount: subRes.count ?? 0,
    refundedCount: refundedRes.count ?? 0,
  };
}

export default async function Kpis() {
  const { todayCount, subCount, refundedCount } = await getKpis();

  const cards = [
    {
      label: 'Purchases Today',
      value: todayCount,
      icon: ShoppingCart,
      hint: 'Excludes refunded.',
      tone: 'default' as const,
    },
    {
      label: 'Active Subscribers',
      value: subCount,
      icon: Users,
      hint: 'Active or trialing Fight Pass.',
      tone: 'default' as const,
    },
    {
      label: 'Refunded (30d)',
      value: refundedCount,
      icon: Undo2,
      hint: 'Refunds in the last 30 days.',
      tone: refundedCount > 0 ? ('warning' as const) : ('default' as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {card.label}
              </CardDescription>
              <CardTitle
                className={`text-3xl tabular-nums ${card.tone === 'warning' ? 'text-red-400' : ''}`}
              >
                {card.value.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{card.hint}</CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function KpisSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
