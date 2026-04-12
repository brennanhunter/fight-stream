import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { verifyReportOtp } from '@/lib/report-otp';
import { createReportSession, reportCookieName } from '@/lib/report-session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const limited = await rateLimit(req, 'report-verify-code', 10);
  if (limited) return limited;

  const { eventId } = await params;
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();

  // Confirm email is the authorised promoter for this event
  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('promoter_email')
    .eq('id', eventId)
    .maybeSingle();

  if (!event || event.promoter_email?.toLowerCase() !== trimmed) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  const valid = await verifyReportOtp(eventId, trimmed, code);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  const sessionToken = await createReportSession(eventId, trimmed);
  const cookieName = reportCookieName(eventId);

  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
