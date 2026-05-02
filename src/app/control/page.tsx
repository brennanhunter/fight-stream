import { createServerClient } from '@/lib/supabase';
import ControlPanel, {
  type ControlEvent,
  type ControlMatch,
  type ControlFighter,
} from './_components/ControlPanel';

export const dynamic = 'force-dynamic';

async function loadActiveEvent(): Promise<ControlEvent | null> {
  const supabase = createServerClient();

  // Most recent active event, falling back to soonest upcoming.
  const { data: active } = await supabase
    .from('events')
    .select('id, name, date')
    .eq('is_active', true)
    .maybeSingle();

  let event = active;
  if (!event) {
    const { data: upcoming } = await supabase
      .from('events')
      .select('id, name, date')
      .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();
    event = upcoming;
  }

  if (!event) return null;

  const [{ data: fighters }, { data: matches }] = await Promise.all([
    supabase
      .from('event_fighters')
      .select('id, display_name, record, weight_class, photo_url')
      .eq('event_id', event.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('event_matches')
      .select(
        'id, sequence, fighter_left_id, fighter_right_id, label, scheduled_rounds, round_seconds, rest_seconds, status',
      )
      .eq('event_id', event.id)
      .order('sequence', { ascending: true }),
  ]);

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    fighters: (fighters ?? []) as ControlFighter[],
    matches: (matches ?? []) as ControlMatch[],
  };
}

export default async function ControlPage() {
  const event = await loadActiveEvent();

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Control
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">No live event</h1>
          <p className="text-sm text-muted-foreground">
            Set <code>is_active = true</code> on an event in Supabase, or schedule one in the
            future. The control panel will then surface its match card.
          </p>
        </div>
      </main>
    );
  }

  if (event.matches.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Control
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            No matches added yet. Build the card at{' '}
            <a
              href={`/admin/overlays/${event.id}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              /admin/overlays/{event.id}
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  return <ControlPanel event={event} />;
}
