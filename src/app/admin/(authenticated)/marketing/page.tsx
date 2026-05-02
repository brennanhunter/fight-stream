import { Suspense } from 'react';
import { Megaphone, Users, Mail, AlarmClock, Bell, MessageSquare } from 'lucide-react';
import PromoCodes, { PromoCodesSkeleton } from './_components/PromoCodes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { createServerClient } from '@/lib/supabase';
import AdminAnnounceForm from '../../AdminAnnounceForm';

export const dynamic = 'force-dynamic';

async function getAudience() {
  const supabase = createServerClient();
  const [{ count: subCount }, { data: ppvEmails }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trialing']),
    supabase
      .from('purchases')
      .select('email')
      .eq('purchase_type', 'ppv')
      .is('refunded_at', null),
  ]);

  const uniquePpvEmails = new Set(
    (ppvEmails ?? []).map((p) => p.email.toLowerCase()),
  );

  return {
    subscribers: subCount ?? 0,
    pastPpvBuyers: uniquePpvEmails.size,
  };
}

async function AudienceCard() {
  const { subscribers, pastPpvBuyers } = await getAudience();
  const total = subscribers + pastPpvBuyers; // upper-bound estimate (some may overlap)

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Announcement Audience
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">~{total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1">
        <p>{subscribers.toLocaleString()} active Fight Pass subscribers</p>
        <p>{pastPpvBuyers.toLocaleString()} unique past PPV buyers</p>
        <p className="text-muted-foreground/70">
          Upper bound — some emails appear in both lists. The send endpoint dedupes.
        </p>
      </CardContent>
    </Card>
  );
}

function AudienceCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-9 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

type EventCommsRow = {
  id: string;
  name: string;
  date: string;
  reminder_sent_at: string | null;
  starting_sent_at: string | null;
  survey_sent_at: string | null;
};

async function CommsHistory() {
  const supabase = createServerClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, reminder_sent_at, starting_sent_at, survey_sent_at')
    .order('date', { ascending: false })
    .limit(10);

  const rows = (events ?? []) as EventCommsRow[];

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No events to show comms for yet.</p>
        </CardContent>
      </Card>
    );
  }

  function fmt(iso: string | null) {
    if (!iso) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not sent
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/10">
        {new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Badge>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Event Date</TableHead>
            <TableHead className="whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                <AlarmClock className="h-3 w-3" /> Reminder
              </span>
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                <Bell className="h-3 w-3" /> Starting Soon
              </span>
            </TableHead>
            <TableHead className="whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Survey
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((ev) => (
            <TableRow key={ev.id}>
              <TableCell className="font-medium max-w-[280px] truncate">{ev.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums">
                {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </TableCell>
              <TableCell>{fmt(ev.reminder_sent_at)}</TableCell>
              <TableCell>{fmt(ev.starting_sent_at)}</TableCell>
              <TableCell>{fmt(ev.survey_sent_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function CommsHistorySkeleton() {
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

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Announce new events to your audience and track which automated comms have gone out.
        </p>
      </div>

      <Suspense fallback={<AudienceCardSkeleton />}>
        <AudienceCard />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            Announce New Event
          </CardTitle>
          <CardDescription>
            Sends an email to every active Fight Pass subscriber and every past PPV buyer. Use sparingly — high-traffic comms should ideally hit the audience once per event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAnnounceForm />
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">Comms History</h2>
            <p className="text-xs text-muted-foreground">
              Per-event timestamps for the automated reminder / starting / survey emails. Empty means never sent.
            </p>
          </div>
        </div>
        <Suspense fallback={<CommsHistorySkeleton />}>
          <CommsHistory />
        </Suspense>
      </div>

      <Suspense fallback={<PromoCodesSkeleton />}>
        <PromoCodes />
      </Suspense>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
            <Mail className="h-4 w-4" />
            Custom Broadcast
          </CardTitle>
          <CardDescription>
            Freeform email composer for non-event announcements (newsletters, promo codes, surveys). Coming in a future phase — for now use the Announce form above for any urgent broadcasts.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
