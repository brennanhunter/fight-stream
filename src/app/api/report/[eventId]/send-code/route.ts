import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { generateReportOtp } from '@/lib/report-otp';
import { escapeHtml } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const limited = await rateLimit(req, 'report-send-code', 5);
  if (limited) return limited;

  const { eventId } = await params;
  const { email } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();

  const emailLimited = await rateLimit(req, 'report-send-code-email', 3, 60 * 60 * 1000, trimmed);
  if (emailLimited) return emailLimited;

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('name, promoter_email')
    .eq('id', eventId)
    .maybeSingle();

  // Always return the same response — don't reveal whether email is authorised
  if (!event || event.promoter_email?.toLowerCase() !== trimmed) {
    return NextResponse.json({ success: true });
  }

  const code = await generateReportOtp(eventId, trimmed);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Your BoxStreamTV Report Code</title></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width="60" height="60" style="display:block;" />
        </td></tr>
        <tr><td style="border:1px solid rgba(255,255,255,0.12);padding:36px;background:#0a0a0a;">
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fff;text-align:center;">Promoter Report Access</h1>
          <div style="width:32px;height:2px;background:#fff;margin:0 auto 20px;"></div>
          <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;text-align:center;line-height:1.6;">
            Your access code for the <strong style="color:#fff;">${escapeHtml(event.name)}</strong> report:
          </p>
          <div style="background:#111;border:1px solid rgba(255,255,255,0.1);padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;color:#fff;letter-spacing:0.3em;">${code}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;">
            This code is valid for one hour. Do not share it with anyone.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top:20px;">
          <p style="margin:0;font-size:11px;color:#374151;">© ${new Date().getFullYear()} BoxStreamTV</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: 'BoxStreamTV <hunter@boxstreamtv.com>',
    replyTo: 'hunter@boxstreamtv.com',
    to: trimmed,
    subject: `Your promoter report code — ${event.name}`,
    html,
    text: `BoxStreamTV Promoter Report\n\nYour access code for ${event.name}:\n\n${code}\n\nValid for one hour. Do not share this code.`,
  });

  return NextResponse.json({ success: true });
}
