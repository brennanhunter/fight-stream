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

  const { email, productName, purchaseType, eventId, expiresAt } = await request.json();

  if (!email || !productName || !purchaseType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('purchases').insert({
    email: normalizeEmail(email),
    product_name: productName,
    purchase_type: purchaseType,
    event_id: eventId || null,
    expires_at: expiresAt || null,
    amount_paid: 0,
    currency: 'usd',
  });

  if (error) {
    console.error('Admin grant error:', error);
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
