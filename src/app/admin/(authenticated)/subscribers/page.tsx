import { Suspense } from 'react';
import Link from 'next/link';
import { X, Crown, Star } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase';
import SubscriberRowActions from './_components/SubscriberRowActions';

export const dynamic = 'force-dynamic';

type Status = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
type StatusFilter = Status | 'all';
type SearchParams = { status?: StatusFilter };

type SubRow = {
  id: string;
  user_id: string;
  email: string | null;
  tier: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  created_at: string;
};

async function getStatusCounts() {
  const supabase = createServerClient();
  const statuses: Status[] = ['active', 'trialing', 'past_due', 'canceled'];

  const counts = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<Status, number>;
}

async function getSubscribers(filter: StatusFilter): Promise<SubRow[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('subscriptions')
    .select(
      'id, user_id, tier, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data: subs } = await query;
  const rows = subs ?? [];

  // Look up emails per user_id (auth.users — admin scope)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data.user?.email) emailByUserId.set(uid, data.user.email);
    }),
  );

  return rows.map((r) => ({ ...r, email: emailByUserId.get(r.user_id) ?? null }));
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10">
        Active
      </Badge>
    );
  }
  if (status === 'trialing') {
    return (
      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/10">
        Trialing
      </Badge>
    );
  }
  if (status === 'past_due') {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/10">
        Past Due
      </Badge>
    );
  }
  if (status === 'canceled') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Canceled
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === 'premium') {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 inline-flex items-center gap-1">
        <Crown className="h-3 w-3" />
        Premium
      </Badge>
    );
  }
  if (tier === 'basic') {
    return (
      <Badge variant="outline" className="inline-flex items-center gap-1">
        <Star className="h-3 w-3" />
        Basic
      </Badge>
    );
  }
  return <Badge variant="outline">{tier}</Badge>;
}

async function StatusKpis() {
  const counts = await getStatusCounts();

  const cards: { label: string; value: number; tone: 'good' | 'warn' | 'neutral' }[] = [
    { label: 'Active', value: counts.active, tone: 'good' },
    { label: 'Trialing', value: counts.trialing, tone: 'good' },
    { label: 'Past Due', value: counts.past_due, tone: 'warn' },
    { label: 'Canceled', value: counts.canceled, tone: 'neutral' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={`/admin/subscribers?status=${c.label.toLowerCase().replace(' ', '_')}`}
          className="group"
        >
          <Card className="transition-colors group-hover:border-foreground/40">
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle
                className={`text-3xl tabular-nums ${
                  c.tone === 'warn' && c.value > 0 ? 'text-amber-400' : ''
                }`}
              >
                {c.value.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function StatusKpisSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

async function SubscribersTable({ filter }: { filter: StatusFilter }) {
  const rows = await getSubscribers(filter);

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'No subscribers yet.' : `No ${filter.replace('_', ' ')} subscribers.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Period End</TableHead>
            <TableHead>Renewal</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="w-[1%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.email ?? <span className="text-muted-foreground italic">unknown</span>}</TableCell>
              <TableCell><TierBadge tier={r.tier} /></TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums">
                {fmtDate(r.current_period_end)}
              </TableCell>
              <TableCell>
                {r.status === 'canceled' ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : r.cancel_at_period_end ? (
                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/10">
                    Won&rsquo;t renew
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Auto-renews
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums">
                {fmtDate(r.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <SubscriberRowActions
                  subscriptionId={r.id}
                  email={r.email ?? ''}
                  status={r.status}
                  cancelAtPeriodEnd={r.cancel_at_period_end}
                  stripeSubscriptionId={r.stripe_subscription_id}
                  stripeCustomerId={r.stripe_customer_id}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function SubscribersTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

function FilterBar({ filter }: { filter: StatusFilter }) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'trialing', label: 'Trialing' },
    { value: 'past_due', label: 'Past Due' },
    { value: 'canceled', label: 'Canceled' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => {
        const isActive = filter === opt.value;
        return (
          <Link
            key={opt.value}
            href={opt.value === 'all' ? '/admin/subscribers' : `/admin/subscribers?status=${opt.value}`}
            className={buttonVariants({ variant: isActive ? 'default' : 'outline', size: 'sm' })}
          >
            {opt.label}
          </Link>
        );
      })}
      {filter !== 'all' && (
        <Link
          href="/admin/subscribers"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <X className="h-3 w-3" />
          Clear
        </Link>
      )}
    </div>
  );
}

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status } = await searchParams;
  const filter: StatusFilter =
    status && ['active', 'trialing', 'past_due', 'canceled', 'unpaid'].includes(status)
      ? (status as StatusFilter)
      : 'all';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Subscribers</h1>
        <p className="text-sm text-muted-foreground">
          Fight Pass subscribers. Click a status card to filter, or use row actions to cancel.
        </p>
      </div>

      <Suspense fallback={<StatusKpisSkeleton />}>
        <StatusKpis />
      </Suspense>

      <FilterBar filter={filter} />

      <Suspense fallback={<SubscribersTableSkeleton />} key={filter}>
        <SubscribersTable filter={filter} />
      </Suspense>
    </div>
  );
}
