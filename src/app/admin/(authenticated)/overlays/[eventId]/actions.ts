'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';

const PHOTO_BUCKET = 'boxer-photos';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

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
    photo_url: input.photo_url || null,
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
      photo_url: input.photo_url || null,
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
