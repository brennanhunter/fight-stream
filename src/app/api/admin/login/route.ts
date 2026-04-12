import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, getAdminToken } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 3 attempts per 30 minutes per IP
  const blocked = await rateLimit(request, 'admin-login', 3, 30 * 60 * 1000);
  if (blocked) return blocked;

  const { password } = await request.json();

  const expected = process.env.ADMIN_PASSWORD || '';
  const input = typeof password === 'string' ? password : '';

  // Constant-time comparison via HMAC to prevent timing attacks.
  // HMAC produces fixed-length outputs regardless of input length,
  // so timingSafeEqual never leaks password length via short-circuit.
  const hmacKey = Buffer.from(expected.length > 0 ? expected : 'dummy-key');
  const inputHash = crypto.createHmac('sha256', hmacKey).update(input).digest();
  const expectedHash = crypto.createHmac('sha256', hmacKey).update(expected).digest();
  const isValid =
    expected.length > 0 &&
    crypto.timingSafeEqual(inputHash, expectedHash);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await getAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 28800, // 8 hours
    path: '/',
  });
  return response;
}
