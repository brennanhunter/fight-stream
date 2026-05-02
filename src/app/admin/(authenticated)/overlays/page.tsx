import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Radio, Users, Swords } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase';
import ObsSetupReference from './_components/ObsSetupReference';

export const dynamic = 'force-dynamic';

type EventRow = {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
  fighterCount: number;
  matchCount: number;
};

async function getEvents(): Promise<EventRow[]> {
  const supabase = createServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, is_active')
    .order('date', { ascending: false })
    .limit(50);

  if (!events?.length) return [];
  const eventIds = events.map((e) => e.id);

  const [{ data: fighters }, { data: matches }] = await Promise.all([
    supabase
      .from('event_fighters')
      .select('event_id')
      .in('event_id', eventIds),
    supabase
      .from('event_matches')
      .select('event_id')
      .in('event_id', eventIds),
  ]);

  const fighterByEvent = new Map<string, number>();
  for (const f of fighters ?? []) {
    fighterByEvent.set(f.event_id, (fighterByEvent.get(f.event_id) ?? 0) + 1);
  }

  const matchByEvent = new Map<string, number>();
  for (const m of matches ?? []) {
    matchByEvent.set(m.event_id, (matchByEvent.get(m.event_id) ?? 0) + 1);
  }

  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    is_active: e.is_active,
    fighterCount: fighterByEvent.get(e.id) ?? 0,
    matchCount: matchByEvent.get(e.id) ?? 0,
  }));
}

async function EventList() {
  const events = await getEvents();

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No events yet — create one in Supabase first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {events.map((ev) => (
        <Link
          key={ev.id}
          href={`/admin/overlays/${ev.id}`}
          className="group block"
        >
          <Card className="h-full transition-colors group-hover:border-foreground/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardDescription className="text-xs">
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                  <CardTitle className="text-base leading-tight">{ev.name}</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {ev.is_active && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/10">
                    Active
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {ev.fighterCount} fighter{ev.fighterCount === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Swords className="h-3.5 w-3.5" />
                  {ev.matchCount} match{ev.matchCount === 1 ? '' : 'es'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OverlaysPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Overlays</h1>
          <p className="text-sm text-muted-foreground">
            Pick an event to build its roster and match card. Pre-event setup happens here; the
            live control panel during broadcasts lives at <code>/control</code>.
          </p>
        </div>
        <a
          href="/control"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'default' })}
        >
          <Radio />
          Open Control Panel
        </a>
      </div>

      <Suspense fallback={<EventListSkeleton />}>
        <EventList />
      </Suspense>

      <ObsSetupReference />
    </div>
  );
}
