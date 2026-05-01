import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/utils';
import { generateVodRecoveryToken } from '@/lib/vod-recovery-token';
import { vodRecoveryLinkEmail } from '@/lib/emails/vod-recovery-link';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email } = await request.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const trimmed = normalizeEmail(email);
  const supabase = createServerClient();

  // Admin path: tell the truth about whether purchases were found.
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, expires_at, refunded_at')
    .eq('email', trimmed)
    .eq('purchase_type', 'vod')
    .is('refunded_at', null);

  const now = Date.now();
  const validVods = (purchases ?? []).filter(
    (p) => !p.expires_at || new Date(p.expires_at).getTime() > now,
  );

  if (validVods.length === 0) {
    return NextResponse.json({ error: 'No active VOD purchases found for that email' }, { status: 404 });
  }

  const token = await generateVodRecoveryToken(trimmed);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
  const link = `${baseUrl}/api/recover-vod/verify?token=${encodeURIComponent(token)}`;

  const { html, text } = vodRecoveryLinkEmail({ link, vodCount: validVods.length });

  try {
    await resend.emails.send({
      from: 'BoxStreamTV <hunter@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to: trimmed,
      subject: 'Recover your BoxStreamTV replays',
      html,
      text,
    });
  } catch (err) {
    console.error('Admin VOD recovery send failed:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, vodCount: validVods.length, sentTo: trimmed });
}
