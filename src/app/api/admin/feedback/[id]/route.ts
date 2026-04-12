import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { approved_for_testimonial } = body as Record<string, unknown>;
  if (typeof approved_for_testimonial !== 'boolean') {
    return NextResponse.json({ error: 'approved_for_testimonial must be boolean' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('feedback')
    .update({ approved_for_testimonial })
    .eq('id', id);

  if (error) {
    console.error('Feedback approval update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
