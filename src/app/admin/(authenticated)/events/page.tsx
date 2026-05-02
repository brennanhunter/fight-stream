import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
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
import { createServerClient } from '@/lib/supabase';
import { getPromoterRate, getTierLabel } from '@/lib/promoter-rate';

export const dynamic = 'force-dynamic';

type EventRow = {
  id: string;
  name: string;
  date: string;
  ppvCount: number;
  ppvRevenue: number;
  vodCount: number;
  vodRevenue: number;
  rate: number;
  tier: string;
  promoterCut: number;
  ourCut: number;
  vodPromoterCut: number;
  vodOurCut: number;
};

async function getEvents(): Promise<EventRow[]> {
  const supabase = createServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, name, date')
    .order('date', { ascending: false })
    .limit(50);

  if (!events?.length) return [];
  const eventIds = events.map((e) => e.id);

  // PPV: group by event_id
  const { data: ppvRows } = await supabase
    .from('purchases')
    .select('event_id, amount_paid')
    .eq('purchase_type', 'ppv')
    .gt('amount_paid', 0)
    .is('refunded_at', null)
    .in('event_id', eventIds);

  const ppvByEvent = new Map<string, { count: number; revenue: number }>();
  for (const p of ppvRows ?? []) {
    const cur = ppvByEvent.get(p.event_id) ?? { count: 0, revenue: 0 };
    ppvByEvent.set(p.event_id, { count: cur.count + 1, revenue: cur.revenue + p.amount_paid });
  }

  // VOD: through event_vod_mapping
  const { data: mappings } = await supabase
    .from('event_vod_mapping')
    .select('event_id, stripe_product_id')
    .in('event_id', eventIds);

  const productToEvents = new Map<string, string[]>();
  for (const m of mappings ?? []) {
    const list = productToEvents.get(m.stripe_product_id) ?? [];
    list.push(m.event_id);
    productToEvents.set(m.stripe_product_id, list);
  }

  const productIds = [...productToEvents.keys()];
  const { data: vodRows } = productIds.length
    ? await supabase
        .from('purchases')
        .select('stripe_product_id, amount_paid')
        .eq('purchase_type', 'vod')
        .gt('amount_paid', 0)
        .is('refunded_at', null)
        .in('stripe_product_id', productIds)
    : { data: [] };

  const vodByEvent = new Map<string, { count: number; revenue: number }>();
  for (const v of vodRows ?? []) {
    if (!v.stripe_product_id) continue;
    const targets = productToEvents.get(v.stripe_product_id) ?? [];
    for (const eventId of targets) {
      const cur = vodByEvent.get(eventId) ?? { count: 0, revenue: 0 };
      vodByEvent.set(eventId, { count: cur.count + 1, revenue: cur.revenue + v.amount_paid });
    }
  }

  return events.map((event) => {
    const ppv = ppvByEvent.get(event.id) ?? { count: 0, revenue: 0 };
    const vod = vodByEvent.get(event.id) ?? { count: 0, revenue: 0 };
    const rate = getPromoterRate(ppv.count);
    const promoterCut = Math.round(ppv.revenue * rate);
    const vodPromoterCut = Math.round(vod.revenue * rate);
    return {
      id: event.id,
      name: event.name,
      date: event.date,
      ppvCount: ppv.count,
      ppvRevenue: ppv.revenue,
      vodCount: vod.count,
      vodRevenue: vod.revenue,
      rate,
      tier: getTierLabel(ppv.count),
      promoterCut,
      ourCut: ppv.revenue - promoterCut,
      vodPromoterCut,
      vodOurCut: vod.revenue - vodPromoterCut,
    };
  });
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function EventsTable() {
  const events = await getEvents();

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No events yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Tier</TableHead>
            <TableHead className="text-right border-l border-border/50">PPV Sales</TableHead>
            <TableHead className="text-right">PPV Rev</TableHead>
            <TableHead className="text-right">PPV Promoter</TableHead>
            <TableHead className="text-right">PPV Ours</TableHead>
            <TableHead className="text-right border-l border-border/50">VOD Sales</TableHead>
            <TableHead className="text-right">VOD Rev</TableHead>
            <TableHead className="text-right">VOD Promoter</TableHead>
            <TableHead className="text-right">VOD Ours</TableHead>
            <TableHead className="w-[1%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev) => (
            <TableRow key={ev.id} className="group">
              <TableCell className="font-medium">
                <Link
                  href={`/admin/events/${ev.id}`}
                  className="block hover:underline underline-offset-4"
                >
                  {ev.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                {ev.tier} · {Math.round(ev.rate * 100)}%
              </TableCell>
              <TableCell className="text-right tabular-nums border-l border-border/50">{ev.ppvCount.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(ev.ppvRevenue)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(ev.promoterCut)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(ev.ourCut)}</TableCell>
              <TableCell className="text-right tabular-nums border-l border-border/50">
                {ev.vodCount > 0 ? ev.vodCount.toLocaleString() : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {ev.vodCount > 0 ? fmtMoney(ev.vodRevenue) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {ev.vodCount > 0 ? fmtMoney(ev.vodPromoterCut) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {ev.vodCount > 0 ? fmtMoney(ev.vodOurCut) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/events/${ev.id}`}
                  className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-label={`Open ${ev.name}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function EventsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          PPV and VOD revenue per event. Click an event to drill into payouts, VOD mappings, and feedback.
        </p>
      </div>

      <Suspense fallback={<EventsTableSkeleton />}>
        <EventsTable />
      </Suspense>
    </div>
  );
}
