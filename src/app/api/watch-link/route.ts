import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const baseUrl = request.nextUrl.origin;

  if (!token) return NextResponse.redirect(new URL('/', baseUrl));

  let purchaseId: string | null = null;
  let email: string | null = null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.type === 'magic-link' && payload.purchaseId && payload.email) {
      purchaseId = payload.purchaseId as string;
      email = payload.email as string;
    }
  } catch {
    // Invalid or expired token
  }

  if (!purchaseId || !email) return NextResponse.redirect(new URL('/', baseUrl));

  const response = NextResponse.redirect(new URL(`/watch?purchase_id=${purchaseId}`, baseUrl));
  response.cookies.set('customer_email', encodeURIComponent(email), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 3650, // 10 years
    path: '/',
  });

  return response;
}
