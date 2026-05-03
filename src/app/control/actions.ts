'use server';

import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import type { OverlayType } from '@/lib/use-overlay';

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

type Result = { ok: true } | { ok: false; error: string };

// Cover overlays auto-hide the logo + promoter_logo while they're up. When all
// covers go away, any logo we auto-hid is restored. Logos the operator
// manually turned off stay off because we only mark auto-hidden ones with
// `payload.auto_hidden = true`.
const COVER_TYPES: OverlayType[] = ['lower_third', 'tale_of_tape'];
const LOGO_TYPES: OverlayType[] = ['logo', 'promoter_logo'];

type SupabaseClient = ReturnType<typeof createServerClient>;

async function autoHideLogos(supabase: SupabaseClient): Promise<void> {
  const { data: rows } = await supabase
    .from('overlay_state')
    .select('overlay_type, visible, payload')
    .in('overlay_type', LOGO_TYPES);

  if (!rows) return;

  for (const row of rows) {
    if (!row.visible) continue;
    const existing = (row.payload ?? {}) as Record<string, unknown>;
    const newPayload = { ...existing, auto_hidden: true };
    await supabase
      .from('overlay_state')
      .update({
        visible: false,
        payload: newPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('overlay_type', row.overlay_type);
  }
}

async function restoreLogosIfNoCover(supabase: SupabaseClient): Promise<void> {
  const { data: covers } = await supabase
    .from('overlay_state')
    .select('overlay_type, visible')
    .in('overlay_type', COVER_TYPES);

  const anyCoverActive = covers?.some((c) => c.visible) ?? false;
  if (anyCoverActive) return;

  const { data: rows } = await supabase
    .from('overlay_state')
    .select('overlay_type, visible, payload')
    .in('overlay_type', LOGO_TYPES);

  if (!rows) return;

  for (const row of rows) {
    if (row.visible) continue;
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (payload.auto_hidden !== true) continue;
    const { auto_hidden: _drop, ...rest } = payload;
    await supabase
      .from('overlay_state')
      .update({
        visible: true,
        payload: rest,
        updated_at: new Date().toISOString(),
      })
      .eq('overlay_type', row.overlay_type);
  }
}

async function clearAutoHiddenFlag(
  supabase: SupabaseClient,
  type: OverlayType,
): Promise<void> {
  const { data: row } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', type)
    .maybeSingle();
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  if (payload.auto_hidden !== true) return;
  const { auto_hidden: _drop, ...rest } = payload;
  await supabase
    .from('overlay_state')
    .update({ payload: rest, updated_at: new Date().toISOString() })
    .eq('overlay_type', type);
}

/** Generic hide — works for any overlay type. */
export async function hideOverlay(type: OverlayType): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: false, updated_at: new Date().toISOString() })
    .eq('overlay_type', type);

  if (error) {
    console.error(`hideOverlay(${type}):`, error);
    return { ok: false, error: 'Failed to hide overlay' };
  }

  if (COVER_TYPES.includes(type)) {
    await restoreLogosIfNoCover(supabase);
  } else if (LOGO_TYPES.includes(type)) {
    // Operator manually hid a logo — make sure we don't auto-restore it later.
    await clearAutoHiddenFlag(supabase, type);
  }

  return { ok: true };
}

/**
 * Show the lower third with a snapshot of the given fighter.
 * Per OVERLAY.md: snapshot at show time so future roster edits don't bleed
 * onto the live overlay.
 */
export async function showLowerThird(
  matchId: string,
  fighterId: string,
): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const [{ data: match }, { data: fighter, error: lookupErr }] = await Promise.all([
    supabase
      .from('event_matches')
      .select('id, label, fighter_left_id, fighter_right_id')
      .eq('id', matchId)
      .maybeSingle(),
    supabase
      .from('event_fighters')
      .select('display_name, record, weight_class, nationality')
      .eq('id', fighterId)
      .maybeSingle(),
  ]);

  if (lookupErr || !fighter) {
    return { ok: false, error: 'Fighter not found' };
  }

  // Determine corner color based on which side this fighter is on in the match.
  const corner: 'blue' | 'red' =
    match?.fighter_left_id === fighterId ? 'blue' : 'red';

  const payload = {
    match_id: matchId,
    fighter_id: fighterId,
    match_label: match?.label ?? '',
    display_name: fighter.display_name,
    record: fighter.record ?? '',
    weight_class: fighter.weight_class ?? '',
    nationality: fighter.nationality ?? '',
    corner,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'lower_third');

  if (error) {
    console.error('showLowerThird:', error);
    return { ok: false, error: 'Failed to show lower third' };
  }

  await autoHideLogos(supabase);
  return { ok: true };
}

/**
 * Show a single-fighter spotlight card. Bigger than a lower third, smaller
 * than tale of the tape. Snapshots the fighter's full stat line + the match
 * label into the payload at show time.
 */
export async function showBoxerCard(matchId: string, fighterId: string): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const [{ data: match }, { data: fighter }] = await Promise.all([
    supabase
      .from('event_matches')
      .select('id, label, fighter_left_id, fighter_right_id')
      .eq('id', matchId)
      .maybeSingle(),
    supabase
      .from('event_fighters')
      .select(
        'id, display_name, record, weight_class, height, reach, age, stance, hometown, nationality, photo_url, photo_ascii',
      )
      .eq('id', fighterId)
      .maybeSingle(),
  ]);

  if (!match) return { ok: false, error: 'Match not found' };
  if (!fighter) return { ok: false, error: 'Fighter not found' };

  const corner: 'blue' | 'red' =
    match.fighter_left_id === fighterId ? 'blue' : 'red';

  const payload = {
    match_id: match.id,
    match_label: match.label ?? '',
    fighter_id: fighter.id,
    fighter,
    corner,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'boxer_card');

  if (error) {
    console.error('showBoxerCard:', error);
    return { ok: false, error: 'Failed to show boxer card' };
  }
  return { ok: true };
}

/**
 * Show the tale of the tape for a match. Snapshots both fighters' full stat
 * lines into the payload at show time so roster edits don't bleed onto the
 * live overlay.
 */
export async function showTaleOfTape(matchId: string): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data: match, error: matchErr } = await supabase
    .from('event_matches')
    .select('id, label, fighter_left_id, fighter_right_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchErr || !match) {
    return { ok: false, error: 'Match not found' };
  }

  const { data: fighters, error: fightersErr } = await supabase
    .from('event_fighters')
    .select(
      'id, display_name, record, weight_class, height, reach, age, stance, hometown, nationality, photo_url, photo_ascii',
    )
    .in('id', [match.fighter_left_id, match.fighter_right_id]);

  if (fightersErr || !fighters || fighters.length < 2) {
    return { ok: false, error: 'Could not load both fighters' };
  }

  const left = fighters.find((f) => f.id === match.fighter_left_id);
  const right = fighters.find((f) => f.id === match.fighter_right_id);
  if (!left || !right) {
    return { ok: false, error: 'Could not match fighters to match' };
  }

  const payload = {
    match_id: match.id,
    match_label: match.label ?? '',
    left,
    right,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'tale_of_tape');

  if (error) {
    console.error('showTaleOfTape:', error);
    return { ok: false, error: 'Failed to show tale of the tape' };
  }

  await autoHideLogos(supabase);
  return { ok: true };
}

type RoundTimerPayload = {
  match_id: string;
  match_label: string;
  left_name: string;
  left_record: string;
  left_nationality: string;
  right_name: string;
  right_record: string;
  right_nationality: string;
  current_round: number;
  total_rounds: number;
  round_seconds: number;
  rest_seconds: number;
  state: 'fighting' | 'paused' | 'ended';
  state_started_at: string;
  paused_remaining_seconds?: number;
};

/** Show the round timer at round 1, fighting state, fresh start.
 * Resets all timer state — use this for a new match or to restart. */
export async function showRoundTimer(matchId: string): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data: match } = await supabase
    .from('event_matches')
    .select('id, label, scheduled_rounds, round_seconds, rest_seconds, fighter_left_id, fighter_right_id')
    .eq('id', matchId)
    .maybeSingle();

  if (!match) return { ok: false, error: 'Match not found' };

  const { data: fighters } = await supabase
    .from('event_fighters')
    .select('id, display_name, record, nationality')
    .in('id', [match.fighter_left_id, match.fighter_right_id]);

  const leftFighter = fighters?.find((f) => f.id === match.fighter_left_id);
  const rightFighter = fighters?.find((f) => f.id === match.fighter_right_id);

  const payload: RoundTimerPayload = {
    match_id: match.id,
    match_label: match.label ?? '',
    left_name: leftFighter?.display_name ?? '',
    left_record: leftFighter?.record ?? '',
    left_nationality: leftFighter?.nationality ?? '',
    right_name: rightFighter?.display_name ?? '',
    right_record: rightFighter?.record ?? '',
    right_nationality: rightFighter?.nationality ?? '',
    current_round: 1,
    total_rounds: match.scheduled_rounds,
    round_seconds: match.round_seconds,
    rest_seconds: match.rest_seconds,
    state: 'fighting',
    state_started_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) {
    console.error('showRoundTimer:', error);
    return { ok: false, error: 'Failed to show round timer' };
  }
  return { ok: true };
}

/** Re-display the round timer without resetting state. Used after a Hide
 * to bring the timer back at the current round/state. */
export async function displayRoundTimer(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;
  if (!current?.match_id) {
    return { ok: false, error: 'No saved timer state — start a fresh match first' };
  }

  // If we were paused at hide, just flip visible. If we were fighting,
  // re-anchor state_started_at so elapsed continues from where it was hidden.
  // Actually — the timer was either paused (display held) or fighting (display
  // continued ticking via local interval, but the elapsed kept growing because
  // state_started_at didn't change). Hiding doesn't pause. So we DO need to
  // hold the fighting elapsed during hide, otherwise the round runs out
  // invisibly and shows 0:00 on re-display.
  //
  // Solution: if state was 'fighting' on hide, snapshot remaining → 'paused'
  // when hiding (handled in hideRoundTimer below). Re-display just flips
  // visible: true.
  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to display timer' };
  return { ok: true };
}

/** Hide the round timer while preserving state. If the timer was fighting,
 * automatically pauses so elapsed time doesn't keep ticking invisibly. */
export async function hideRoundTimer(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;

  // If currently fighting, snapshot remaining and flip to paused so the timer
  // doesn't keep ticking down invisibly while hidden.
  let nextPayload: RoundTimerPayload | undefined = current;
  if (current?.state === 'fighting') {
    const elapsed =
      (Date.now() - new Date(current.state_started_at).getTime()) / 1000;
    const remaining = Math.max(0, current.round_seconds - elapsed);
    nextPayload = {
      ...current,
      state: 'paused',
      paused_remaining_seconds: remaining,
      state_started_at: new Date().toISOString(),
    };
  }

  const update: { visible: boolean; updated_at: string; payload?: RoundTimerPayload } = {
    visible: false,
    updated_at: new Date().toISOString(),
  };
  if (nextPayload && nextPayload !== current) {
    update.payload = nextPayload;
  }

  const { error } = await supabase
    .from('overlay_state')
    .update(update)
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to hide timer' };
  return { ok: true };
}

/** Pause: freeze remaining seconds into the payload so the browser can hold
 * the value while server isn't ticking. */
export async function pauseRoundTimer(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;
  if (!current?.match_id) return { ok: false, error: 'No active timer' };
  if (current.state !== 'fighting') return { ok: false, error: 'Timer is not running' };

  const elapsed =
    (Date.now() - new Date(current.state_started_at).getTime()) / 1000;
  const remaining = Math.max(0, current.round_seconds - elapsed);

  const next: RoundTimerPayload = {
    ...current,
    state: 'paused',
    paused_remaining_seconds: remaining,
    state_started_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ payload: next, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to pause' };
  return { ok: true };
}

/** Resume: time-shift state_started_at so elapsed continues from pause. */
export async function resumeRoundTimer(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;
  if (!current?.match_id) return { ok: false, error: 'No active timer' };
  if (current.state !== 'paused') return { ok: false, error: 'Timer is not paused' };

  const remaining = current.paused_remaining_seconds ?? current.round_seconds;
  const elapsedAtPause = current.round_seconds - remaining;
  const newStartedAt = new Date(Date.now() - elapsedAtPause * 1000).toISOString();

  const next: RoundTimerPayload = {
    ...current,
    state: 'fighting',
    state_started_at: newStartedAt,
    paused_remaining_seconds: undefined,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ payload: next, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to resume' };
  return { ok: true };
}

/** Advance to the next round. Resets timer to full round_seconds. */
export async function nextRound(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;
  if (!current?.match_id) return { ok: false, error: 'No active timer' };
  if (current.current_round >= current.total_rounds) {
    return { ok: false, error: 'Already on the final round — use End match' };
  }

  const next: RoundTimerPayload = {
    ...current,
    current_round: current.current_round + 1,
    state: 'fighting',
    state_started_at: new Date().toISOString(),
    paused_remaining_seconds: undefined,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ payload: next, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to advance round' };
  return { ok: true };
}

/** Mark match ended — timer holds at 0:00 until hidden. */
export async function endMatchTimer(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('overlay_state')
    .select('payload')
    .eq('overlay_type', 'round_timer')
    .maybeSingle();

  const current = data?.payload as RoundTimerPayload | undefined;
  if (!current?.match_id) return { ok: false, error: 'No active timer' };

  const next: RoundTimerPayload = {
    ...current,
    state: 'ended',
    state_started_at: new Date().toISOString(),
    paused_remaining_seconds: undefined,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ payload: next, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'round_timer');

  if (error) return { ok: false, error: 'Failed to end match' };
  return { ok: true };
}

/** Show the BoxStream logo. No payload — the asset is hard-coded. */
export async function showLogo(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();
  // Manual show always wins over auto-hide bookkeeping.
  await clearAutoHiddenFlag(supabase, 'logo');
  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'logo');

  if (error) return { ok: false, error: 'Failed to show logo' };
  return { ok: true };
}

/** Show the promoter logo using the URL stored on the active event. */
export async function showPromoterLogo(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name, promoter_logo_url')
    .eq('is_active', true)
    .maybeSingle();

  if (!event) {
    return { ok: false, error: 'No active event — set is_active = true on an event' };
  }
  if (!event.promoter_logo_url) {
    return {
      ok: false,
      error: 'Active event has no promoter logo URL set — add one in /admin/overlays',
    };
  }

  // payload is rebuilt fresh on every show, so any prior auto_hidden flag is
  // implicitly cleared.
  const payload = {
    event_id: event.id,
    url: event.promoter_logo_url,
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'promoter_logo');

  if (error) return { ok: false, error: 'Failed to show promoter logo' };
  return { ok: true };
}

/** Hide every overlay at once — panic button. */
export async function killAllOverlays(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: false, updated_at: new Date().toISOString() })
    .neq('overlay_type', '__never__');

  if (error) {
    console.error('killAllOverlays:', error);
    return { ok: false, error: 'Failed to kill overlays' };
  }

  // Wipe auto_hidden flags so the next show cycle starts clean.
  await Promise.all(LOGO_TYPES.map((t) => clearAutoHiddenFlag(supabase, t)));
  return { ok: true };
}
