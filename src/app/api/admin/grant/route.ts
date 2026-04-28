import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, productName, purchaseType, eventId, expiresAt, s3Key } = await request.json();

  if (!email || !productName || !purchaseType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.from('purchases').insert({
    email: normalizeEmail(email),
    product_name: productName,
    purchase_type: purchaseType,
    event_id: eventId || null,
    expires_at: expiresAt || null,
    s3_key: s3Key || null,
    amount_paid: 0,
    currency: 'usd',
  }).select('id').single();

  if (error) {
    console.error('Admin grant error:', error);
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, purchaseId: data.id });
}
