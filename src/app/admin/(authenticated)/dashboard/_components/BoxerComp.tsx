import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createServerClient } from '@/lib/supabase';

export default async function BoxerComp() {
  const supabase = createServerClient();
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) return null;

  const { data: rows } = await supabase
    .from('purchases')
    .select('boxer_name')
    .eq('event_id', activeEvent.id)
    .eq('purchase_type', 'ppv')
    .is('refunded_at', null)
    .not('boxer_name', 'is', null);

  const tally = new Map<string, number>();
  for (const r of rows ?? []) {
    if (r.boxer_name) tally.set(r.boxer_name, (tally.get(r.boxer_name) ?? 0) + 1);
  }
  const leaderboard = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" />
              Boxer Comp
            </CardDescription>
            <CardTitle className="text-base mt-1">{activeEvent.name}</CardTitle>
          </div>
          <Link
            href={`/admin/events/${activeEvent.id}`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Open event →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">No boxer-tagged purchases yet for this event.</p>
        ) : (
          <ul className="divide-y divide-border">
            {leaderboard.map(([name, count]) => (
              <li key={name} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize">{name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {count} buyer{count !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BoxerCompSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
