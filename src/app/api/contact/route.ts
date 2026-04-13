import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'contact', 3, 60 * 60 * 1000); // 3 per hour
  if (limited) return limited;

  const body = await req.json();

  // Honeypot — if filled, silently succeed (bots won't know)
  if (body._gotcha) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, phone, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: 'BoxStreamTV <hunter@boxstreamtv.com>',
    to: 'hunter@boxstreamtv.com',
    replyTo: email,
    subject: `Contact: ${subject || 'No subject'}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      `Subject: ${subject || 'N/A'}`,
      '',
      message,
    ].filter(Boolean).join('\n'),
  });

  if (error) {
    console.error('Resend contact error:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
