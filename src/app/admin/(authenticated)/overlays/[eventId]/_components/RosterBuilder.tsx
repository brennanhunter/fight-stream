'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  addFighter,
  updateFighter,
  updateFighterPhoto,
  deleteFighter,
  type FighterInput,
} from '../actions';
import {
  MAIN_BOXING_COUNTRIES,
  formatNationality,
  isKnownCountryCode,
} from '@/lib/countries';
import PhotoUploader from './PhotoUploader';

export type Fighter = {
  id: string;
  display_name: string;
  record: string | null;
  weight_class: string | null;
  height: string | null;
  reach: string | null;
  age: number | null;
  stance: string | null;
  hometown: string | null;
  nationality: string | null;
  photo_url: string | null;
  promoter_logo_url: string | null;
  sort_order: number;
};

const EMPTY: FighterInput = {
  display_name: '',
  record: '',
  weight_class: '',
  height: '',
  reach: '',
  age: null,
  stance: '',
  hometown: '',
  nationality: '',
  photo_url: '',
  promoter_logo_url: '',
  sort_order: 0,
};

/** Parse "5'10\"" or "5'10" into [feet, inches]. Returns ['', ''] when empty/unparseable. */
function parseHeight(raw: string | null | undefined): [string, string] {
  if (!raw) return ['', ''];
  const m = raw.match(/^\s*(\d+)\s*['′]?\s*(\d+)?\s*["″]?\s*$/);
  if (!m) return ['', ''];
  return [m[1] ?? '', m[2] ?? ''];
}

/** Format feet + inches to a normalized "5'10\"" string. */
function formatHeight(feet: string, inches: string): string {
  const f = feet.trim();
  const i = inches.trim();
  if (!f && !i) return '';
  if (!f) return `${i}"`;
  if (!i) return `${f}'`;
  return `${f}'${i}"`;
}

/** Parse "12-3", "12-3-1", "12-3 (5 KOs)" etc. into individual fields. */
function parseRecord(raw: string | null | undefined): {
  wins: string;
  losses: string;
  draws: string;
  kos: string;
} {
  if (!raw) return { wins: '', losses: '', draws: '', kos: '' };
  const m = raw.match(
    /^\s*(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:\(\s*(\d+)\s*KOs?\s*\))?\s*$/i,
  );
  if (!m) return { wins: '', losses: '', draws: '', kos: '' };
  return {
    wins: m[1] ?? '',
    losses: m[2] ?? '',
    draws: m[3] ?? '',
    kos: m[4] ?? '',
  };
}

/** Format wins/losses/draws/KOs into "12-3" or "12-3-1" or "12-3 (5 KOs)" or "12-3-1 (5 KOs)". */
function formatRecord(wins: string, losses: string, draws: string, kos: string): string {
  const w = wins.trim();
  const l = losses.trim();
  const d = draws.trim();
  const k = kos.trim();
  if (!w && !l && !d && !k) return '';
  const core = d && d !== '0' ? `${w || 0}-${l || 0}-${d}` : `${w || 0}-${l || 0}`;
  return k && k !== '0' ? `${core} (${k} KOs)` : core;
}

export default function RosterBuilder({
  eventId,
  initialFighters,
}: {
  eventId: string;
  initialFighters: Fighter[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Roster</CardTitle>
            <CardDescription>
              Every fighter on the card. Add them here once and the live control panel
              will let you pick by name without typing.
            </CardDescription>
          </div>
          {!adding && (
            <Button size="sm" onClick={() => { setAdding(true); setEditingId(null); }}>
              <Plus />
              Add fighter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <FighterForm
            eventId={eventId}
            initial={EMPTY}
            onCancel={() => setAdding(false)}
            onSaved={() => setAdding(false)}
            mode="create"
          />
        )}

        {initialFighters.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">No fighters yet. Add one to get started.</p>
        ) : (
          <ul className="divide-y divide-border">
            {initialFighters.map((f) => (
              <li key={f.id}>
                {editingId === f.id ? (
                  <div className="py-3">
                    <FighterForm
                      eventId={eventId}
                      fighterId={f.id}
                      initial={{
                        display_name: f.display_name,
                        record: f.record ?? '',
                        weight_class: f.weight_class ?? '',
                        height: f.height ?? '',
                        reach: f.reach ?? '',
                        age: f.age,
                        stance: f.stance ?? '',
                        hometown: f.hometown ?? '',
                        nationality: f.nationality ?? '',
                        photo_url: f.photo_url ?? '',
                        promoter_logo_url: f.promoter_logo_url ?? '',
                        sort_order: f.sort_order,
                      }}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                      mode="edit"
                    />
                  </div>
                ) : (
                  <FighterRow
                    fighter={f}
                    eventId={eventId}
                    onEdit={() => { setEditingId(f.id); setAdding(false); }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FighterRow({
  fighter,
  eventId,
  onEdit,
}: {
  fighter: Fighter;
  eventId: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remove ${fighter.display_name} from the roster?`)) return;
    startTransition(async () => {
      const res = await deleteFighter(fighter.id, eventId);
      if (res.ok) toast.success('Fighter removed');
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
        {fighter.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fighter.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            ?
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fighter.display_name}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {fighter.record && <span>{fighter.record}</span>}
          {fighter.weight_class && <Badge variant="outline">{fighter.weight_class}</Badge>}
          {fighter.nationality && (() => {
            const { flag, label } = formatNationality(fighter.nationality);
            return (
              <span>
                · {flag && <span className="mr-1">{flag}</span>}
                {label}
              </span>
            );
          })()}
          {fighter.hometown && <span>· {fighter.hometown}</span>}
        </div>
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

function FighterForm({
  eventId,
  fighterId,
  initial,
  mode,
  onCancel,
  onSaved,
}: {
  eventId: string;
  fighterId?: string;
  initial: FighterInput;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FighterInput>(initial);
  const [heightFt, heightIn] = parseHeight(initial.height);
  const [feet, setFeet] = useState(heightFt);
  const [inches, setInches] = useState(heightIn);
  const initialRecord = parseRecord(initial.record);
  const [wins, setWins] = useState(initialRecord.wins);
  const [losses, setLosses] = useState(initialRecord.losses);
  const [draws, setDraws] = useState(initialRecord.draws);
  const [kos, setKos] = useState(initialRecord.kos);
  const [error, setError] = useState<string | null>(null);

  // Nationality split state: a code from the dropdown OR a custom free-text value.
  // Existing rows that hold a known code will pre-select that code; anything else
  // (legacy "USA" / "Mexico" text, or empty) falls back to custom mode.
  const initialNat = (initial.nationality ?? '').trim();
  const [natMode, setNatMode] = useState<'select' | 'custom'>(
    initialNat && isKnownCountryCode(initialNat) ? 'select' : initialNat ? 'custom' : 'select',
  );
  const [natCode, setNatCode] = useState(
    initialNat && isKnownCountryCode(initialNat) ? initialNat.toUpperCase() : '',
  );
  const [natCustom, setNatCustom] = useState(
    initialNat && !isKnownCountryCode(initialNat) ? initialNat : '',
  );

  function update<K extends keyof FighterInput>(key: K, value: FighterInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.display_name?.trim()) {
      setError('Display name is required');
      return;
    }

    const formatted = formatHeight(feet, inches);
    const formattedRecord = formatRecord(wins, losses, draws, kos);
    const nationality =
      natMode === 'select' ? natCode || null : natCustom.trim() || null;
    const payload: FighterInput = {
      ...form,
      height: formatted,
      record: formattedRecord || null,
      nationality,
    };

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await addFighter(eventId, payload)
          : await updateFighter(fighterId!, eventId, payload);
      if (res.ok) {
        toast.success(mode === 'create' ? 'Fighter added' : 'Fighter updated');
        onSaved();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Display name (required)">
          <Input
            value={form.display_name}
            onChange={(e) => update('display_name', e.target.value)}
            placeholder="Smith"
            required
          />
        </Field>
        <Field label="Record">
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-2">
              <RecordInput value={wins} onChange={setWins} label="W" />
              <RecordInput value={losses} onChange={setLosses} label="L" />
              <RecordInput value={draws} onChange={setDraws} label="D" />
              <RecordInput value={kos} onChange={setKos} label="KO" />
            </div>
            {(wins || losses || draws || kos) && (
              <p className="text-xs text-muted-foreground">
                = {formatRecord(wins, losses, draws, kos) || '—'}
              </p>
            )}
          </div>
        </Field>
        <Field label="Weight class">
          <Input
            value={form.weight_class ?? ''}
            onChange={(e) => update('weight_class', e.target.value)}
            placeholder="Welterweight"
          />
        </Field>
        <Field label="Hometown">
          <Input
            value={form.hometown ?? ''}
            onChange={(e) => update('hometown', e.target.value)}
            placeholder="Brooklyn, NY"
          />
        </Field>
        <Field label="Nationality">
          <div className="flex flex-col gap-1.5">
            <select
              value={natMode === 'select' ? natCode : '__custom__'}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setNatMode('custom');
                } else {
                  setNatMode('select');
                  setNatCode(e.target.value);
                }
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              <option value="">— pick —</option>
              {MAIN_BOXING_COUNTRIES.map((c) => {
                const flag = String.fromCodePoint(
                  ...c.code.split('').map((ch) => ch.charCodeAt(0) + 127397),
                );
                return (
                  <option key={c.code} value={c.code}>
                    {flag} {c.name}
                  </option>
                );
              })}
              <option value="__custom__">Custom…</option>
            </select>
            {natMode === 'custom' && (
              <Input
                value={natCustom}
                onChange={(e) => setNatCustom(e.target.value)}
                placeholder="e.g. Trinidad and Tobago"
                aria-label="Custom nationality"
              />
            )}
          </div>
        </Field>
        <Field label="Height">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={feet}
              onChange={(e) => setFeet(e.target.value.replace(/\D/g, ''))}
              placeholder="5"
              min={0}
              max={9}
              className="w-16 text-center"
              aria-label="Feet"
            />
            <span className="text-sm text-muted-foreground">ft</span>
            <Input
              type="number"
              value={inches}
              onChange={(e) => setInches(e.target.value.replace(/\D/g, ''))}
              placeholder="10"
              min={0}
              max={11}
              className="w-16 text-center"
              aria-label="Inches"
            />
            <span className="text-sm text-muted-foreground">in</span>
            {(feet || inches) && (
              <span className="ml-2 text-xs text-muted-foreground">
                = {formatHeight(feet, inches)}
              </span>
            )}
          </div>
        </Field>
        <Field label="Reach">
          <Input
            value={form.reach ?? ''}
            onChange={(e) => update('reach', e.target.value)}
            placeholder={`72"`}
          />
        </Field>
        <Field label="Age">
          <Input
            type="number"
            value={form.age ?? ''}
            onChange={(e) => update('age', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="28"
            min={0}
          />
        </Field>
        <Field label="Stance">
          <select
            value={form.stance ?? ''}
            onChange={(e) => update('stance', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          >
            <option value="">—</option>
            <option value="orthodox">Orthodox</option>
            <option value="southpaw">Southpaw</option>
            <option value="switch">Switch</option>
          </select>
        </Field>
      </div>

      <Field label="Photo">
        <PhotoUploader
          value={form.photo_url ?? ''}
          onChange={(url) => update('photo_url', url)}
          displayName={form.display_name}
          kind="fighter"
          onAutoSave={
            mode === 'edit' && fighterId
              ? (url) => updateFighterPhoto(fighterId, url)
              : undefined
          }
        />
      </Field>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Add fighter' : 'Save changes'}
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

function RecordInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="0"
        min={0}
        className="text-center"
        aria-label={label}
      />
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}
