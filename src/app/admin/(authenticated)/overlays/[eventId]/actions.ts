'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { imageToAscii } from '@/lib/image-to-ascii';

const PHOTO_BUCKET = 'boxer-photos';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/**
 * Fetch a photo URL and pre-bake its ASCII representation. Settings here
 * mirror the prototype defaults the user signed off on (cols=100, classic
 * ramp, alpha cutoff 32 — transparent backgrounds drop out as spaces). On
 * any failure (404, sharp error, network blip) we return null so the save
 * path proceeds without ASCII rather than blocking the operator.
 */
async function generateAsciiForPhotoUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const result = await imageToAscii(buf, {
      cols: 100,
      cellAspect: 2,
      ramp: ' .:-=+*#%@',
      alphaThreshold: 32,
    });
    return result.ascii;
  } catch (err) {
    console.error('generateAsciiForPhotoUrl:', err);
    return null;
  }
}

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

export type FighterInput = {
  display_name: string;
  record?: string | null;
  weight_class?: string | null;
  height?: string | null;
  reach?: string | null;
  age?: number | null;
  stance?: string | null;
  hometown?: string | null;
  nationality?: string | null;
  photo_url?: string | null;
  promoter_logo_url?: string | null;
  sort_order?: number;
};

export async function addFighter(
  eventId: string,
  input: FighterInput,
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!eventId || !input.display_name?.trim()) {
    return { ok: false, error: 'Event ID and display name are required' };
  }

  const supabase = createServerClient();
  const photoUrl = input.photo_url || null;
  const photoAscii = photoUrl ? await generateAsciiForPhotoUrl(photoUrl) : null;
  const row = {
    event_id: eventId,
    display_name: input.display_name.trim(),
    record: input.record || null,
    weight_class: input.weight_class || null,
    height: input.height || null,
    reach: input.reach || null,
    age: input.age ?? null,
    stance: input.stance || null,
    hometown: input.hometown || null,
    nationality: input.nationality || null,
    photo_url: photoUrl,
    photo_ascii: photoAscii,
    promoter_logo_url: input.promoter_logo_url || null,
    sort_order: input.sort_order ?? 0,
  };

  const { data, error } = await supabase
    .from('event_fighters')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    console.error('addFighter:', error);
    return { ok: false, error: 'Failed to add fighter' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true, id: data.id };
}

export async function updateFighter(
  fighterId: string,
  eventId: string,
  input: FighterInput,
): Promise<Result> {
  await requireAdmin();

  const supabase = createServerClient();

  // Only re-bake ASCII when the photo URL actually changed. Cheap guard so
  // editing a fighter's name doesn't trigger a fetch + sharp pass.
  const { data: existing } = await supabase
    .from('event_fighters')
    .select('photo_url, photo_ascii')
    .eq('id', fighterId)
    .maybeSingle();

  const photoUrl = input.photo_url || null;
  let photoAscii: string | null = existing?.photo_ascii ?? null;
  if (photoUrl && photoUrl !== existing?.photo_url) {
    photoAscii = await generateAsciiForPhotoUrl(photoUrl);
  } else if (!photoUrl) {
    photoAscii = null;
  }

  const { error } = await supabase
    .from('event_fighters')
    .update({
      display_name: input.display_name.trim(),
      record: input.record || null,
      weight_class: input.weight_class || null,
      height: input.height || null,
      reach: input.reach || null,
      age: input.age ?? null,
      stance: input.stance || null,
      hometown: input.hometown || null,
      nationality: input.nationality || null,
      photo_url: photoUrl,
      photo_ascii: photoAscii,
      promoter_logo_url: input.promoter_logo_url || null,
      sort_order: input.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fighterId);

  if (error) {
    console.error('updateFighter:', error);
    return { ok: false, error: 'Failed to update fighter' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true };
}

/**
 * Persist a photo URL change directly to the fighter row. Called from the
 * PhotoUploader after an upload succeeds in edit mode, so the new photo
 * survives even if the operator closes the form without clicking Save.
 */
export async function updateFighterPhoto(
  fighterId: string,
  photoUrl: string | null,
): Promise<Result> {
  await requireAdmin();
  if (!fighterId) return { ok: false, error: 'Missing fighterId' };

  const supabase = createServerClient();

  const { data: fighter } = await supabase
    .from('event_fighters')
    .select('event_id')
    .eq('id', fighterId)
    .maybeSingle();

  const photoAscii = photoUrl ? await generateAsciiForPhotoUrl(photoUrl) : null;

  const { error } = await supabase
    .from('event_fighters')
    .update({
      photo_url: photoUrl,
      photo_ascii: photoAscii,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fighterId);

  if (error) {
    console.error('updateFighterPhoto:', error);
    return { ok: false, error: 'Failed to save photo' };
  }

  if (fighter?.event_id) {
    revalidatePath(`/admin/overlays/${fighter.event_id}`);
  }
  return { ok: true };
}

export async function deleteFighter(fighterId: string, eventId: string): Promise<Result> {
  await requireAdmin();

  const supabase = createServerClient();

  // First check whether this fighter is referenced by any matches —
  // FK enforces this but we want a friendlier error than a 23503.
  const { data: matches } = await supabase
    .from('event_matches')
    .select('id')
    .or(`fighter_left_id.eq.${fighterId},fighter_right_id.eq.${fighterId}`)
    .limit(1);

  if (matches && matches.length > 0) {
    return { ok: false, error: 'Fighter is in a match — remove or edit the match first' };
  }

  const { error } = await supabase.from('event_fighters').delete().eq('id', fighterId);
  if (error) {
    console.error('deleteFighter:', error);
    return { ok: false, error: 'Failed to delete fighter' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true };
}

export type MatchInput = {
  sequence: number;
  fighter_left_id: string;
  fighter_right_id: string;
  label?: string | null;
  scheduled_rounds: number;
  round_seconds: number;
  rest_seconds: number;
};

export async function addMatch(eventId: string, input: MatchInput): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!eventId) return { ok: false, error: 'Event ID required' };
  if (input.fighter_left_id === input.fighter_right_id) {
    return { ok: false, error: "Fighter can't be on both sides" };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('event_matches')
    .insert({
      event_id: eventId,
      sequence: input.sequence,
      fighter_left_id: input.fighter_left_id,
      fighter_right_id: input.fighter_right_id,
      label: input.label?.trim() || null,
      scheduled_rounds: input.scheduled_rounds,
      round_seconds: input.round_seconds,
      rest_seconds: input.rest_seconds,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('addMatch:', error);
    if (error?.code === '23505') {
      return { ok: false, error: `A match with sequence ${input.sequence} already exists` };
    }
    return { ok: false, error: 'Failed to add match' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true, id: data.id };
}

export async function updateMatch(
  matchId: string,
  eventId: string,
  input: MatchInput,
): Promise<Result> {
  await requireAdmin();
  if (input.fighter_left_id === input.fighter_right_id) {
    return { ok: false, error: "Fighter can't be on both sides" };
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('event_matches')
    .update({
      sequence: input.sequence,
      fighter_left_id: input.fighter_left_id,
      fighter_right_id: input.fighter_right_id,
      label: input.label?.trim() || null,
      scheduled_rounds: input.scheduled_rounds,
      round_seconds: input.round_seconds,
      rest_seconds: input.rest_seconds,
    })
    .eq('id', matchId);

  if (error) {
    console.error('updateMatch:', error);
    if (error.code === '23505') {
      return { ok: false, error: `A match with sequence ${input.sequence} already exists` };
    }
    return { ok: false, error: 'Failed to update match' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true };
}

export async function uploadBoxerPhoto(
  formData: FormData,
): Promise<Result<{ url: string }>> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'No file provided' };
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'File must be JPEG, PNG, WebP, or AVIF' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${randomUUID()}.${ext}`;

  const supabase = createServerClient();
  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    console.error('uploadBoxerPhoto:', uploadError);
    return { ok: false, error: uploadError.message };
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, error: 'Upload succeeded but URL generation failed' };
  }

  return { ok: true, url: data.publicUrl };
}

/**
 * Re-bake the ASCII portrait for every fighter on the event that has a
 * photo_url but is missing photo_ascii (or always — pass `force: true`).
 * Useful after first deploying the ASCII feature, or after tweaking the
 * generator settings.
 */
export async function backfillFighterAscii(
  eventId: string,
  options: { force?: boolean } = {},
): Promise<Result<{ processed: number; succeeded: number; failed: number }>> {
  await requireAdmin();
  if (!eventId) return { ok: false, error: 'Missing eventId' };

  const supabase = createServerClient();
  const { data: fighters, error } = await supabase
    .from('event_fighters')
    .select('id, photo_url, photo_ascii')
    .eq('event_id', eventId);

  if (error) {
    console.error('backfillFighterAscii:', error);
    return { ok: false, error: 'Failed to load fighters' };
  }
  if (!fighters) {
    return { ok: true, processed: 0, succeeded: 0, failed: 0 };
  }

  const targets = fighters.filter(
    (f) => f.photo_url && (options.force || !f.photo_ascii),
  );

  let succeeded = 0;
  let failed = 0;
  for (const f of targets) {
    const ascii = await generateAsciiForPhotoUrl(f.photo_url!);
    if (!ascii) {
      failed++;
      continue;
    }
    const { error: updateErr } = await supabase
      .from('event_fighters')
      .update({ photo_ascii: ascii, updated_at: new Date().toISOString() })
      .eq('id', f.id);
    if (updateErr) {
      console.error('backfillFighterAscii update:', updateErr);
      failed++;
    } else {
      succeeded++;
    }
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true, processed: targets.length, succeeded, failed };
}

/** Persist the event-level promoter logo URL. Read by the live /control
 * panel when the operator clicks "Show promoter logo". */
export async function setEventPromoterLogo(
  eventId: string,
  url: string | null,
): Promise<Result> {
  await requireAdmin();
  if (!eventId) return { ok: false, error: 'Missing eventId' };

  const supabase = createServerClient();
  const { error } = await supabase
    .from('events')
    .update({ promoter_logo_url: url || null })
    .eq('id', eventId);

  if (error) {
    console.error('setEventPromoterLogo:', error);
    return { ok: false, error: 'Failed to save logo URL' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true };
}

export async function deleteMatch(matchId: string, eventId: string): Promise<Result> {
  await requireAdmin();

  const supabase = createServerClient();
  const { error } = await supabase.from('event_matches').delete().eq('id', matchId);
  if (error) {
    console.error('deleteMatch:', error);
    return { ok: false, error: 'Failed to delete match' };
  }

  revalidatePath(`/admin/overlays/${eventId}`);
  return { ok: true };
}
