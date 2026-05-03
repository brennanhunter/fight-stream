import { NextRequest, NextResponse } from 'next/server';
import { verifyVodRecoveryToken } from '@/lib/vod-recovery-token';
import { createServerClient } from '@/lib/supabase';

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

  // Pick the destination: if the recovered email has exactly one active VOD,
  // drop them straight on the watch page. Multiple actives → send to /vod so
  // they can pick. Zero (e.g. expired) → fall back to /vod with a flag.
  const supabase = createServerClient();
  const { data: vods } = await supabase
    .from('purchases')
    .select('id, expires_at, refunded_at, created_at')
    .eq('email', result.email)
    .eq('purchase_type', 'vod')
    .is('refunded_at', null)
    .order('created_at', { ascending: false });

  const now = Date.now();
  const active = (vods ?? []).filter(
    (v) => !v.expires_at || new Date(v.expires_at).getTime() > now,
  );

  let destination: string;
  if (active.length === 1) {
    destination = `${baseUrl}/watch?purchase_id=${active[0].id}`;
  } else if (active.length > 1) {
    destination = `${baseUrl}/vod?recover=success`;
  } else {
    destination = `${baseUrl}/vod?recover=expired`;
  }

  // Set the customer_email cookie on the response so /vod's getOwnedProducts
  // can find purchases by email on the very next render. Watch page also
  // uses this cookie to authorize a fresh-from-Stripe session_id claim.
  const response = NextResponse.redirect(destination);
  response.cookies.set('customer_email', result.email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days — give plenty of grace
  });
  return response;
}
