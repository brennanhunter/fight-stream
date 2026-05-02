'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Swords } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addMatch, updateMatch, deleteMatch, type MatchInput } from '../actions';
import type { Fighter } from './RosterBuilder';

export type Match = {
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

const COMMON_LABELS = [
  'Main Event',
  'Co-Feature',
  'Title Fight',
  'World Title',
  'Title Eliminator',
  'Championship',
  'Undercard',
] as const;

export default function MatchBuilder({
  eventId,
  fighters,
  initialMatches,
}: {
  eventId: string;
  fighters: Fighter[];
  initialMatches: Match[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const fighterById = new Map(fighters.map((f) => [f.id, f]));
  const nextSequence = initialMatches.length === 0 ? 1 : Math.max(...initialMatches.map((m) => m.sequence)) + 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Match Card</CardTitle>
            <CardDescription>
              Pair fighters into bouts. The live control panel uses these as its primary
              navigation — pick a match, every overlay scopes to it.
            </CardDescription>
          </div>
          {!adding && fighters.length >= 2 && (
            <Button size="sm" onClick={() => { setAdding(true); setEditingId(null); }}>
              <Plus />
              Add match
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fighters.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Add at least two fighters above before creating matches.
          </p>
        ) : (
          <>
            {adding && (
              <MatchForm
                eventId={eventId}
                fighters={fighters}
                initial={{
                  sequence: nextSequence,
                  fighter_left_id: '',
                  fighter_right_id: '',
                  label: '',
                  scheduled_rounds: 3,
                  round_seconds: 180,
                  rest_seconds: 60,
                }}
                onCancel={() => setAdding(false)}
                onSaved={() => setAdding(false)}
                mode="create"
              />
            )}

            {initialMatches.length === 0 && !adding ? (
              <div className="rounded-md border border-dashed py-8 text-center">
                <Swords className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {initialMatches
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((m) => (
                    <li key={m.id}>
                      {editingId === m.id ? (
                        <div className="py-3">
                          <MatchForm
                            eventId={eventId}
                            matchId={m.id}
                            fighters={fighters}
                            initial={{
                              sequence: m.sequence,
                              fighter_left_id: m.fighter_left_id,
                              fighter_right_id: m.fighter_right_id,
                              label: m.label ?? '',
                              scheduled_rounds: m.scheduled_rounds,
                              round_seconds: m.round_seconds,
                              rest_seconds: m.rest_seconds,
                            }}
                            onCancel={() => setEditingId(null)}
                            onSaved={() => setEditingId(null)}
                            mode="edit"
                          />
                        </div>
                      ) : (
                        <MatchRow
                          match={m}
                          left={fighterById.get(m.fighter_left_id)}
                          right={fighterById.get(m.fighter_right_id)}
                          eventId={eventId}
                          onEdit={() => { setEditingId(m.id); setAdding(false); }}
                        />
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MatchRow({
  match,
  left,
  right,
  eventId,
  onEdit,
}: {
  match: Match;
  left: Fighter | undefined;
  right: Fighter | undefined;
  eventId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remove Match ${match.sequence}?`)) return;
    startTransition(async () => {
      const res = await deleteMatch(match.id, eventId);
      if (res.ok) toast.success('Match removed');
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold tabular-nums">
        {match.sequence}
      </div>
      <div className="min-w-0 flex-1">
        {match.label && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            {match.label}
          </p>
        )}
        <p className="truncate text-sm font-medium">
          {left?.display_name ?? 'Unknown'}
          <span className="mx-2 text-muted-foreground">vs</span>
          {right?.display_name ?? 'Unknown'}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {match.scheduled_rounds} × {Math.floor(match.round_seconds / 60)}:
          {String(match.round_seconds % 60).padStart(2, '0')} rounds
          <span className="mx-2">·</span>
          {Math.floor(match.rest_seconds / 60)}:
          {String(match.rest_seconds % 60).padStart(2, '0')} rest
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="icon-sm" variant="ghost" onClick={onEdit} disabled={pending}>
          <Pencil />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={handleDelete} disabled={pending}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function MatchForm({
  eventId,
  matchId,
  fighters,
  initial,
  mode,
  onCancel,
  onSaved,
}: {
  eventId: string;
  matchId?: string;
  fighters: Fighter[];
  initial: MatchInput;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<MatchInput>(initial);
  const [error, setError] = useState<string | null>(null);

  // Label split state: dropdown picks from common options, "Custom" reveals a text input.
  const initialLabel = (initial.label ?? '').trim();
  const isCommon = COMMON_LABELS.includes(initialLabel as (typeof COMMON_LABELS)[number]);
  const [labelMode, setLabelMode] = useState<'select' | 'custom'>(
    initialLabel && !isCommon ? 'custom' : 'select',
  );
  const [labelChoice, setLabelChoice] = useState(isCommon ? initialLabel : '');
  const [labelCustom, setLabelCustom] = useState(initialLabel && !isCommon ? initialLabel : '');

  function update<K extends keyof MatchInput>(key: K, value: MatchInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fighter_left_id || !form.fighter_right_id) {
      setError('Pick both fighters');
      return;
    }
    if (form.fighter_left_id === form.fighter_right_id) {
      setError("Fighter can't be on both sides");
      return;
    }

    const label =
      labelMode === 'select' ? labelChoice || null : labelCustom.trim() || null;
    const payload: MatchInput = { ...form, label };

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await addMatch(eventId, payload)
          : await updateMatch(matchId!, eventId, payload);
      if (res.ok) {
        toast.success(mode === 'create' ? 'Match added' : 'Match updated');
        onSaved();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Sequence (1, 2, 3…)">
          <Input
            type="number"
            value={form.sequence}
            onChange={(e) => update('sequence', Number(e.target.value))}
            min={1}
            required
          />
        </Field>
        <Field label="Label (shown above round timer)">
          <div className="flex flex-col gap-1.5">
            <select
              value={labelMode === 'select' ? labelChoice : '__custom__'}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setLabelMode('custom');
                } else {
                  setLabelMode('select');
                  setLabelChoice(e.target.value);
                }
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              <option value="">— none —</option>
              {COMMON_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            {labelMode === 'custom' && (
              <Input
                value={labelCustom}
                onChange={(e) => setLabelCustom(e.target.value)}
                placeholder="e.g. WBC Eliminator"
                aria-label="Custom label"
              />
            )}
          </div>
        </Field>
        <Field label="Scheduled rounds">
          <select
            value={form.scheduled_rounds}
            onChange={(e) => update('scheduled_rounds', Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          >
            {[3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} rounds
              </option>
            ))}
          </select>
        </Field>
        <Field label="Left fighter">
          <select
            value={form.fighter_left_id}
            onChange={(e) => update('fighter_left_id', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            required
          >
            <option value="">— pick —</option>
            {fighters.map((f) => (
              <option key={f.id} value={f.id}>
                {f.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Right fighter">
          <select
            value={form.fighter_right_id}
            onChange={(e) => update('fighter_right_id', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            required
          >
            <option value="">— pick —</option>
            {fighters.map((f) => (
              <option key={f.id} value={f.id}>
                {f.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Round length (seconds)">
          <Input
            type="number"
            value={form.round_seconds}
            onChange={(e) => update('round_seconds', Number(e.target.value))}
            min={30}
            step={30}
          />
        </Field>
        <Field label="Rest length (seconds)">
          <Input
            type="number"
            value={form.rest_seconds}
            onChange={(e) => update('rest_seconds', Number(e.target.value))}
            min={30}
            step={30}
          />
        </Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Add match' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
