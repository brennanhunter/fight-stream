import { Suspense } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createServerClient } from '@/lib/supabase';
import BulkActionsBar from './_components/BulkActionsBar';
import PurchaseRowActions from './_components/PurchaseRowActions';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  type?: 'ppv' | 'vod' | 'all';
  status?: 'active' | 'refunded' | 'expired' | 'all';
};

const PAGE_SIZE = 100;

async function getActiveEvent() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('events')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

type PurchaseRow = {
  id: string;
  email: string;
  product_name: string | null;
  purchase_type: 'ppv' | 'vod';
  amount_paid: number;
  created_at: string;
  expires_at: string | null;
  refunded_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
};

async function getPurchases(params: SearchParams): Promise<{ rows: PurchaseRow[]; truncated: boolean }> {
  const supabase = createServerClient();
  let query = supabase
    .from('purchases')
    .select(
      'id, email, product_name, purchase_type, amount_paid, created_at, expires_at, refunded_at, stripe_payment_intent_id, stripe_session_id',
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  const q = params.q?.trim().toLowerCase();
  if (q) query = query.ilike('email', `%${q}%`);

  if (params.type === 'ppv' || params.type === 'vod') {
    query = query.eq('purchase_type', params.type);
  }

  if (params.status === 'refunded') {
    query = query.not('refunded_at', 'is', null);
  } else if (params.status === 'active') {
    query = query.is('refunded_at', null);
  } else if (params.status === 'expired') {
    query = query.is('refunded_at', null).lt('expires_at', new Date().toISOString());
  }

  const { data } = await query;
  const rows = (data ?? []) as PurchaseRow[];
  const truncated = rows.length > PAGE_SIZE;
  return { rows: truncated ? rows.slice(0, PAGE_SIZE) : rows, truncated };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FilterBar({ params }: { params: SearchParams }) {
  const q = params.q ?? '';
  const type = params.type ?? 'all';
  const status = params.status ?? 'all';
  const hasFilters = q || type !== 'all' || status !== 'all';

  return (
    <form
      method="GET"
      action="/admin/purchases"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label htmlFor="q" className="text-xs text-muted-foreground">
          Search email
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="q"
            name="q"
            type="text"
            defaultValue={q}
            placeholder="email@example.com"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-xs text-muted-foreground">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All</option>
          <option value="ppv">PPV</option>
          <option value="vod">VOD</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-xs text-muted-foreground">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="refunded">Refunded</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <Button type="submit">Apply</Button>
      {hasFilters && (
        <Link
          href="/admin/purchases"
          className={buttonVariants({ variant: 'ghost' })}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Link>
      )}
    </form>
  );
}

async function PurchasesTable({ params }: { params: SearchParams }) {
  const { rows, truncated } = await getPurchases(params);
  const now = new Date();

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No purchases match those filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const isRefunded = !!p.refunded_at;
              const isComp = p.amount_paid === 0;
              const isExpired = !isRefunded && p.expires_at && new Date(p.expires_at) < now;

              return (
                <TableRow key={p.id} className={isRefunded ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/purchases?q=${encodeURIComponent(p.email)}`}
                      className="hover:underline underline-offset-4"
                    >
                      {p.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.product_name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {p.purchase_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isComp ? (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/10">
                        Comp
                      </Badge>
                    ) : (
                      <span className={isRefunded ? 'line-through text-muted-foreground' : ''}>
                        ${(p.amount_paid / 100).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    {fmtDate(p.created_at)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {p.expires_at ? (
                      <span className={isExpired ? 'text-red-400' : 'text-muted-foreground'}>
                        {fmtDate(p.expires_at)}
                        {isExpired && ' (exp)'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isRefunded ? (
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/10">
                        Refunded {fmtDate(p.refunded_at!)}
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Expired
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <PurchaseRowActions
                      purchaseId={p.id}
                      email={p.email}
                      amountPaid={p.amount_paid}
                      productName={p.product_name || '—'}
                      purchaseType={p.purchase_type}
                      isRefunded={isRefunded}
                      isComp={isComp}
                      stripePaymentIntentId={p.stripe_payment_intent_id}
                      stripeSessionId={p.stripe_session_id}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {truncated && (
        <p className="text-[11px] text-muted-foreground text-center">
          Showing first {PAGE_SIZE} results. Refine filters to narrow.
        </p>
      )}
    </>
  );
}

function PurchasesTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeEvent = await getActiveEvent();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter all purchases. Use row actions to refund, copy email, or send recovery links.
          </p>
        </div>
        <BulkActionsBar
          activeEventId={activeEvent?.id ?? null}
          activeEventName={activeEvent?.name ?? null}
        />
      </div>

      <FilterBar params={params} />

      <Suspense fallback={<PurchasesTableSkeleton />} key={JSON.stringify(params)}>
        <PurchasesTable params={params} />
      </Suspense>
    </div>
  );
}
