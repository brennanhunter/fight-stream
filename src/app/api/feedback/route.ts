import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase';
import { verifySurveyToken } from '@/lib/survey-token';
import { escapeHtml } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    email,
    type,
    ref,
    token,
    overall_rating,
    quality_rating,
    process_rating,
    comment,
    what_was_missing,
  } = body as Record<string, unknown>;

  // Validate required fields
  if (
    typeof email !== 'string' ||
    typeof type !== 'string' ||
    typeof ref !== 'string' ||
    typeof token !== 'string' ||
    !['ppv', 'vod'].includes(type)
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const isValidRating = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;

  if (!isValidRating(overall_rating)) {
    return NextResponse.json({ error: 'overall_rating must be an integer 1–5' }, { status: 400 });
  }

  // Verify HMAC token
  if (!verifySurveyToken(email, type, ref, token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  const supabase = createServerClient();

  // Resolve subject server-side — never trust the URL parameter
  let resolvedSubject: string;
  if (type === 'ppv') {
    const { data: event } = await supabase
      .from('events')
      .select('name')
      .eq('id', ref)
      .maybeSingle();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    resolvedSubject = event.name;
  } else {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('product_name')
      .eq('id', ref)
      .maybeSingle();
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    resolvedSubject = purchase.product_name;
  }

  // Prevent duplicate submissions
  const refField = type === 'ppv' ? 'event_id' : 'purchase_id';
  const { data: existing } = await supabase
    .from('feedback')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('trigger_type', type)
    .eq(refField, ref)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
  }

  // Derive a display name from the email (e.g. john.doe@... → "John")
  const rawName = email.split('@')[0].split('.')[0].split('+')[0];
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  const { error: insertError } = await supabase.from('feedback').insert({
    email: email.toLowerCase(),
    display_name: displayName,
    trigger_type: type,
    event_id: type === 'ppv' ? ref : null,
    purchase_id: type === 'vod' ? ref : null,
    subject: resolvedSubject,
    overall_rating,
    quality_rating: isValidRating(quality_rating) ? quality_rating as number : null,
    process_rating: isValidRating(process_rating) ? process_rating as number : null,
    comment: typeof comment === 'string' ? comment.slice(0, 1000) : null,
    what_was_missing: typeof what_was_missing === 'string' ? what_was_missing.slice(0, 500) : null,
  });

  if (insertError) {
    console.error('Feedback insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  // Notify hunter
  const stars = (n: number | unknown) =>
    typeof n === 'number' ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—';

  const safeComment = typeof comment === 'string' ? escapeHtml(comment) : '';
  const safeMissing = typeof what_was_missing === 'string' ? escapeHtml(what_was_missing) : '';

  resend.emails.send({
    from: 'BoxStreamTV <hunter@boxstreamtv.com>',
    replyTo: email,
    to: 'hunter@boxstreamtv.com',
    subject: `New ${type.toUpperCase()} feedback — ${escapeHtml(resolvedSubject)} (${overall_rating}★)`,
    html: `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:500px;">
      <p style="color:#f59e0b;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 16px;">New Feedback</p>
      <h2 style="margin:0 0 24px;font-size:20px;">${escapeHtml(resolvedSubject)}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Overall</td><td style="color:#fbbf24;font-size:16px;">${stars(overall_rating)}</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Quality</td><td style="color:#fbbf24;font-size:16px;">${stars(quality_rating)}</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Process</td><td style="color:#fbbf24;font-size:16px;">${stars(process_rating)}</td></tr>
      </table>
      ${safeComment ? `<p style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px;">Comment</p><p style="color:#fff;font-size:14px;margin:0 0 20px;">&ldquo;${safeComment}&rdquo;</p>` : ''}
      ${safeMissing ? `<p style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px;">What Was Missing</p><p style="color:#fff;font-size:14px;margin:0 0 20px;">${safeMissing}</p>` : ''}
      <p style="color:#4b5563;font-size:12px;margin:0;">From: ${escapeHtml(email)} &middot; Type: ${type}</p>
    </div>`,
    text: `New ${type.toUpperCase()} feedback — ${resolvedSubject}\n\nOverall: ${overall_rating}/5\nQuality: ${quality_rating ?? '—'}/5\nProcess: ${process_rating ?? '—'}/5\n\n${comment ? `Comment: "${comment}"\n\n` : ''}${what_was_missing ? `What was missing: ${what_was_missing}\n\n` : ''}From: ${email}`,
  }).catch((err) => console.error('Feedback notification email failed:', err));

  return NextResponse.json({ ok: true });
}
