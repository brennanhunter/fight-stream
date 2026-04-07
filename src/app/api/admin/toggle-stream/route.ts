import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { live } = await req.json();

  const supabase = createServerClient();
  const { error } = await supabase
    .from('events')
    .update({ is_streaming: live })
    .eq('is_active', true);

  if (error) {
    console.error('toggle-stream error:', error);
    return NextResponse.json({ error: 'Failed to update stream status' }, { status: 500 });
  }

  return NextResponse.json({ success: true, live });
}
