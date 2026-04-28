import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { normalizeEmail } from '@/lib/utils';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { purchaseId, email, expiryDays = 3650 } = await request.json();

  if (!purchaseId || !email) {
    return NextResponse.json({ error: 'purchaseId and email are required' }, { status: 400 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

  const token = await new SignJWT({
    purchaseId,
    email: normalizeEmail(email),
    type: 'magic-link',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
  const url = `${baseUrl}/watch-link?token=${token}`;

  return NextResponse.json({ url });
}
