import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyUnsubscribeToken } from '@/lib/emails/unsubscribe';
import { normalizeEmail } from '@/lib/utils';

/**
 * GET  — browser visit from email link, shows a simple confirmation page.
 * POST — one-click unsubscribe via List-Unsubscribe-Post header (RFC 8058).
 */

async function handleUnsubscribe(req: NextRequest) {
  const url = new URL(req.url);
  const rawEmail = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  if (!rawEmail || !token) {
    return new NextResponse('Missing parameters.', { status: 400 });
  }

  const email = normalizeEmail(rawEmail);

  if (!verifyUnsubscribeToken(email, token)) {
    return new NextResponse('Invalid or expired link.', { status: 403 });
  }

  // Look up the user by email to get their user_id
  const supabase = createServerClient();
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(
    (u) => u.email && normalizeEmail(u.email) === email
  );

  if (user) {
    await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, new_events: false },
        { onConflict: 'user_id' }
      );
  }

  // For POST (one-click), return a minimal success response
  if (req.method === 'POST') {
    return new NextResponse('You have been unsubscribed.', { status: 200 });
  }

  // For GET (browser link), return a simple HTML page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed – BoxStreamTV</title>
  <style>
    body { margin:0; background:#000; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { text-align:center; max-width:400px; padding:40px; }
    h1 { font-size:24px; margin:0 0 12px; }
    p { color:#9ca3af; font-size:15px; line-height:1.6; margin:0 0 24px; }
    a { color:#9ca3af; text-decoration:underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribed</h1>
    <p>You won&rsquo;t receive new event announcements from BoxStreamTV anymore.</p>
    <p>Changed your mind? <a href="https://boxstreamtv.com/account/profile">Manage preferences</a></p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const GET = handleUnsubscribe;
export const POST = handleUnsubscribe;
