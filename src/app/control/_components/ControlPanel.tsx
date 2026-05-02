'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, Skull, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOverlay } from '@/lib/use-overlay';
import {
  hideOverlay,
  killAllOverlays,
  showLowerThird,
  showTaleOfTape,
} from '../actions';

export type ControlFighter = {
  id: string;
  display_name: string;
  record: string | null;
  weight_class: string | null;
  photo_url: string | null;
};

export type ControlMatch = {
  id: string;
  sequence: number;
  fighter_left_id: string;
  fighter_right_id: string;
  label: string | null;
  scheduled_rounds: number;
  round_seconds: number;
  rest_seconds: number;
  status: 'scheduled' | 'in_progress' | 'completed';
};

export type ControlEvent = {
  id: string;
  name: string;
  date: string;
  fighters: ControlFighter[];
  matches: ControlMatch[];
};

type LowerThirdPayload = {
  match_id?: string;
  fighter_id?: string;
  display_name?: string;
};

export default function ControlPanel({ event }: { event: ControlEvent }) {
  const fighterById = new Map(event.fighters.map((f) => [f.id, f]));

  const [activeMatchId, setActiveMatchId] = useState<string>(event.matches[0]?.id ?? '');
  const activeMatch = event.matches.find((m) => m.id === activeMatchId) ?? event.matches[0];
  const left = activeMatch ? fighterById.get(activeMatch.fighter_left_id) : undefined;
  const right = activeMatch ? fighterById.get(activeMatch.fighter_right_id) : undefined;

  const lowerThird = useOverlay<LowerThirdPayload>('lower_third');
  const taleOfTape = useOverlay<{ match_id?: string }>('tale_of_tape');

  const [pending, startTransition] = useTransition();

  function handleShowFighter(fighter: ControlFighter | undefined) {
    if (!activeMatch || !fighter) return;
    startTransition(async () => {
      const res = await showLowerThird(activeMatch.id, fighter.id);
      if (res.ok) toast.success(`Showing ${fighter.display_name}`);
      else toast.error(res.error);
    });
  }

  function handleHideLowerThird() {
    startTransition(async () => {
      const res = await hideOverlay('lower_third');
      if (res.ok) toast.success('Lower third hidden');
      else toast.error(res.error);
    });
  }

  function handleShowTaleOfTape() {
    if (!activeMatch) return;
    startTransition(async () => {
      const res = await showTaleOfTape(activeMatch.id);
      if (res.ok) toast.success('Tale of the tape on air');
      else toast.error(res.error);
    });
  }

  function handleHideTaleOfTape() {
    startTransition(async () => {
      const res = await hideOverlay('tale_of_tape');
      if (res.ok) toast.success('Tale of the tape hidden');
      else toast.error(res.error);
    });
  }

  /** Re-snapshot the currently-on-air lower third with fresh data from the
   * fighter row. Useful after editing a fighter's photo or stats. */
  function handleRefreshLowerThird() {
    const matchId = lowerThird.payload.match_id;
    const fighterId = lowerThird.payload.fighter_id;
    if (!matchId || !fighterId) return;
    startTransition(async () => {
      const res = await showLowerThird(matchId, fighterId);
      if (res.ok) toast.success('Lower third refreshed');
      else toast.error(res.error);
    });
  }

  /** Re-snapshot the currently-on-air tale of the tape. */
  function handleRefreshTaleOfTape() {
    const matchId = taleOfTape.payload.match_id;
    if (!matchId) return;
    startTransition(async () => {
      const res = await showTaleOfTape(matchId);
      if (res.ok) toast.success('Tale of the tape refreshed');
      else toast.error(res.error);
    });
  }

  function handleKillAll() {
    if (!confirm('Hide every overlay immediately?')) return;
    startTransition(async () => {
      const res = await killAllOverlays();
      if (res.ok) toast.success('All overlays hidden');
      else toast.error(res.error);
    });
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Control · {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{event.name}</h1>
        </div>
        <Button
          onClick={handleKillAll}
          disabled={pending}
          variant="destructive"
        >
          <Skull />
          Kill all
        </Button>
      </header>

      <div className="flex flex-1 gap-6 p-6">
        {/* Match list */}
        <aside className="w-72 shrink-0">
          <h2 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Matches
          </h2>
          <ul className="space-y-1.5">
            {event.matches.map((m) => {
              const ml = fighterById.get(m.fighter_left_id);
              const mr = fighterById.get(m.fighter_right_id);
              const isActive = m.id === activeMatchId;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setActiveMatchId(m.id)}
                    className={`block w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border hover:border-foreground/40 hover:bg-muted/30'
                    }`}
                  >
                    {m.label && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {m.label}
                      </p>
                    )}
                    <p className="text-sm font-medium">
                      <span className="mr-2 text-muted-foreground tabular-nums">
                        {m.sequence}.
                      </span>
                      {ml?.display_name ?? '?'} vs {mr?.display_name ?? '?'}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {m.scheduled_rounds} × {Math.floor(m.round_seconds / 60)}:
                      {String(m.round_seconds % 60).padStart(2, '0')}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Active match panel */}
        <section className="flex-1 space-y-4">
          {activeMatch && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {activeMatch.label && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {activeMatch.label}
                      </p>
                    )}
                    <CardTitle className="text-xl">
                      {left?.display_name ?? '?'} vs {right?.display_name ?? '?'}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">Match {activeMatch.sequence}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lower third */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">Lower Third</h3>
                    {lowerThird.visible ? (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10">
                        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                        On air: {lowerThird.payload.display_name ?? 'unknown'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[left, right].map((f) => {
                      if (!f) return null;
                      const isCurrent =
                        lowerThird.visible && lowerThird.payload.fighter_id === f.id;
                      return (
                        <Button
                          key={f.id}
                          variant={isCurrent ? 'default' : 'outline'}
                          onClick={() => handleShowFighter(f)}
                          disabled={pending}
                          className="h-auto justify-start py-3"
                        >
                          <Eye />
                          <span className="text-left">
                            <span className="block font-semibold">{f.display_name}</span>
                            {f.record && (
                              <span className="block text-xs opacity-70">{f.record}</span>
                            )}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleRefreshLowerThird}
                      disabled={pending || !lowerThird.visible}
                    >
                      <RefreshCw />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleHideLowerThird}
                      disabled={pending || !lowerThird.visible}
                    >
                      <EyeOff />
                      Hide
                    </Button>
                  </div>
                </div>

                {/* Tale of the Tape */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">Tale of the Tape</h3>
                    {taleOfTape.visible && taleOfTape.payload.match_id === activeMatch.id ? (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10">
                        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                        On air
                      </Badge>
                    ) : taleOfTape.visible ? (
                      <Badge variant="outline" className="text-amber-400 border-amber-500/40">
                        On air (different match)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="default"
                    onClick={handleShowTaleOfTape}
                    disabled={pending}
                    className="w-full"
                  >
                    <Swords />
                    Show comparison
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleRefreshTaleOfTape}
                      disabled={pending || !taleOfTape.visible}
                    >
                      <RefreshCw />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleHideTaleOfTape}
                      disabled={pending || !taleOfTape.visible}
                    >
                      <EyeOff />
                      Hide
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full-screen comparison. Snapshots both fighters at Show time — use Refresh
                    after editing roster data to push the latest values to a live overlay.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
