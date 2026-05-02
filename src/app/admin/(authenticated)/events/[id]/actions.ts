'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';

async function requireAdmin() {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    throw new Error('Unauthorized');
  }
}

export async function saveVodMappings(
  eventId: string,
  productIds: string[],
): Promise<{ ok: true; linked: number } | { ok: false; error: string }> {
  await requireAdmin();

  if (!eventId || typeof eventId !== 'string') {
    return { ok: false, error: 'Missing eventId' };
  }

  const cleanIds = Array.from(
    new Set(productIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
  );

  const supabase = createServerClient();

  const { error: deleteError } = await supabase
    .from('event_vod_mapping')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    console.error('saveVodMappings: delete failed', deleteError);
    return { ok: false, error: 'Failed to clear existing links' };
  }

  if (cleanIds.length > 0) {
    const rows = cleanIds.map((pid) => ({ event_id: eventId, stripe_product_id: pid }));
    const { error: insertError } = await supabase.from('event_vod_mapping').insert(rows);
    if (insertError) {
      console.error('saveVodMappings: insert failed', insertError);
      return { ok: false, error: 'Failed to save links' };
    }
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);

  return { ok: true, linked: cleanIds.length };
}
