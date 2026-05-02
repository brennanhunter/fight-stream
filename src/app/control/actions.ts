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

  const { data: fighter, error: lookupErr } = await supabase
    .from('event_fighters')
    .select('display_name, record, weight_class')
    .eq('id', fighterId)
    .maybeSingle();

  if (lookupErr || !fighter) {
    return { ok: false, error: 'Fighter not found' };
  }

  const payload = {
    match_id: matchId,
    fighter_id: fighterId,
    display_name: fighter.display_name,
    record: fighter.record ?? '',
    weight_class: fighter.weight_class ?? '',
  };

  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: true, payload, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'lower_third');

  if (error) {
    console.error('showLowerThird:', error);
    return { ok: false, error: 'Failed to show lower third' };
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
      'id, display_name, record, weight_class, height, reach, age, stance, hometown, nationality, photo_url',
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
  return { ok: true };
}
