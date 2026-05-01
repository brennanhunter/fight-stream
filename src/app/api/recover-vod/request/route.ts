import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/utils';
import { generateVodRecoveryToken } from '@/lib/vod-recovery-token';
import { vodRecoveryLinkEmail } from '@/lib/emails/vod-recovery-link';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // IP rate limit: 5 requests per window
  const limited = await rateLimit(req, 'recover-vod', 5);
  if (limited) return limited;

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmed = normalizeEmail(email);

    // Per-email rate limit: 3 link requests per hour
    const emailLimited = await rateLimit(req, 'recover-vod-email', 3, 60 * 60 * 1000, trimmed);
    if (emailLimited) return emailLimited;

    const supabase = createServerClient();

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

    // Generic response — never reveal whether the email matched a purchase
    if (validVods.length === 0) {
      return NextResponse.json({ success: true });
    }

    const token = await generateVodRecoveryToken(trimmed);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxstreamtv.com';
    const link = `${baseUrl}/api/recover-vod/verify?token=${encodeURIComponent(token)}`;

    const { html, text } = vodRecoveryLinkEmail({ link, vodCount: validVods.length });

    await resend.emails.send({
      from: 'BoxStreamTV <hunter@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to: trimmed,
      subject: 'Recover your BoxStreamTV replays',
      html,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('VOD recovery request error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
