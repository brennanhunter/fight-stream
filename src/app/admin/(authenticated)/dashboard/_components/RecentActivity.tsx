import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { createServerClient } from '@/lib/supabase';

type Row = {
  id: string;
  email: string;
  product_name: string | null;
  purchase_type: 'ppv' | 'vod';
  amount_paid: number;
  created_at: string;
  refunded_at: string | null;
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function RecentActivity() {
  const supabase = createServerClient();
  const { data: rows } = await supabase
    .from('purchases')
    .select('id, email, product_name, purchase_type, amount_paid, created_at, refunded_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const purchases: Row[] = rows ?? [];

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Recent Activity
        </CardDescription>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Last 10 purchases</CardTitle>
          <Link
            href="/admin/purchases"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {purchases.map((p) => {
              const isComp = p.amount_paid === 0;
              const isRefunded = !!p.refunded_at;
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.product_name || '—'}
                      <span className="mx-1.5">·</span>
                      <span className="uppercase">{p.purchase_type}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {isRefunded && (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10">
                        Refunded
                      </Badge>
                    )}
                    {isComp ? (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/10">
                        Comp
                      </Badge>
                    ) : (
                      <span
                        className={`text-sm tabular-nums ${
                          isRefunded ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        ${(p.amount_paid / 100).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                      {relativeTime(p.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
