'use server';

import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

type Result = { ok: true } | { ok: false; error: string };

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

export async function hideLowerThird(): Promise<Result> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('overlay_state')
    .update({ visible: false, updated_at: new Date().toISOString() })
    .eq('overlay_type', 'lower_third');

  if (error) {
    console.error('hideLowerThird:', error);
    return { ok: false, error: 'Failed to hide lower third' };
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
