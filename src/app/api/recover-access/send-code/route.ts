import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { recoveryCodeEmail } from '@/lib/emails/recovery-code';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'send-recovery-code', 5);
  if (limited) return limited;

  try {
    const { email, eventId: clientEventId } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Per-email rate limit: 3 code requests per hour
    const emailLimited = await rateLimit(req, 'send-recovery-code-email', 3, 60 * 60 * 1000, trimmedEmail);
    if (emailLimited) return emailLimited;

    const supabase = createServerClient();

    // Resolve target event
    let targetEvent;
    if (clientEventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('id', clientEventId)
        .maybeSingle();
      targetEvent = data;
    }
    if (!targetEvent) {
      const { data } = await supabase
        .from('events')
        .select('id, name, expires_at')
        .eq('is_active', true)
        .maybeSingle();
      targetEvent = data;
    }

    if (!targetEvent) {
      return NextResponse.json({ error: 'No event found' }, { status: 404 });
    }

    // Find purchase — same generic response whether found or not to prevent enumeration
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, expires_at')
      .eq('email', trimmedEmail)
      .eq('event_id', targetEvent.id)
      .eq('purchase_type', 'ppv')
      .order('created_at', { ascending: false })
      .limit(1);

    const purchase = purchases?.[0] || null;

    // Always respond the same way — don't reveal whether email exists
    if (!purchase || (purchase.expires_at && new Date(purchase.expires_at) < new Date())) {
      return NextResponse.json({ success: true });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('purchases')
      .update({ recovery_code: code, recovery_code_expires_at: expiresAt })
      .eq('id', purchase.id);

    const { html, text } = recoveryCodeEmail({ eventName: targetEvent.name, code });

    await resend.emails.send({
      from: 'BoxStreamTV <hunter@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to: trimmedEmail,
      subject: 'Your BoxStreamTV access code',
      html,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send recovery code error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
