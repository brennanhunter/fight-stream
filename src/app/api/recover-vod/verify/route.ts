import { NextRequest, NextResponse } from 'next/server';
import { verifyVodRecoveryToken } from '@/lib/vod-recovery-token';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/vod?recover=missing`);
  }

  const result = await verifyVodRecoveryToken(token);
  if (!result) {
    return NextResponse.redirect(`${baseUrl}/vod?recover=invalid`);
  }

  // Set the customer_email cookie on the response so /vod's getOwnedProducts
  // can find purchases by email on the very next render.
  const response = NextResponse.redirect(`${baseUrl}/vod?recover=success`);
  response.cookies.set('customer_email', result.email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days — give plenty of grace
  });
  return response;
}
