import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Radio } from 'lucide-react';
import { createServerClient } from '@/lib/supabase';
import { buttonVariants } from '@/components/ui/button';
import RosterBuilder, { type Fighter } from './_components/RosterBuilder';
import MatchBuilder, { type Match } from './_components/MatchBuilder';

export const dynamic = 'force-dynamic';

export default async function EventOverlaySetupPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = createServerClient();

  const [{ data: event }, { data: fighters }, { data: matches }] = await Promise.all([
    supabase.from('events').select('id, name, date, is_active').eq('id', eventId).maybeSingle(),
    supabase
      .from('event_fighters')
      .select(
        'id, display_name, record, weight_class, height, reach, age, stance, hometown, nationality, photo_url, promoter_logo_url, sort_order',
      )
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('event_matches')
      .select(
        'id, sequence, fighter_left_id, fighter_right_id, label, scheduled_rounds, round_seconds, rest_seconds, status',
      )
      .eq('event_id', eventId)
      .order('sequence', { ascending: true }),
  ]);

  if (!event) notFound();

  const eventDate = new Date(event.date);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/overlays"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All events
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <p className="text-sm text-muted-foreground">
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              <span className="mx-2">·</span>
              Build the roster and match card. The live <code>/control</code> panel will read from
              here during the broadcast.
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
      </div>

      <RosterBuilder eventId={eventId} initialFighters={(fighters ?? []) as Fighter[]} />

      <MatchBuilder
        eventId={eventId}
        fighters={(fighters ?? []) as Fighter[]}
        initialMatches={(matches ?? []) as Match[]}
      />
    </div>
  );
}
