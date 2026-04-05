import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { verifyAdminCookie, ADMIN_COOKIE } from '@/lib/admin-auth';
import { createServerClient } from '@/lib/supabase';
import { eventAnnouncedEmail } from '@/lib/emails/event-announced';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventName, eventDate, ppvPrice } = await request.json();
  if (!eventName || !eventDate || !ppvPrice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch users who opted out of new event announcements
  const { data: optedOut } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('new_events', false);

  const optedOutUserIds = new Set((optedOut || []).map((p) => p.user_id));

  // Collect recipient emails: active subscribers + past PPV buyers
  const recipientSet = new Set<string>();

  // 1. Active subscriber emails via user_id → auth.users
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('status', ['active', 'trialing']);

  if (subscriptions?.length) {
    const userIds = subscriptions.map((s) => s.user_id).filter((id) => id && !optedOutUserIds.has(id));
    // Fetch in pages to handle large lists
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !users?.length) break;
      for (const u of users) {
        if (u.email && userIds.includes(u.id)) {
          recipientSet.add(u.email.toLowerCase());
        }
      }
      hasMore = users.length === 1000;
      page++;
    }
  }

  // 2. Past PPV buyer emails (only include non-account buyers;
  //    account holders are already handled above with preference filtering)
  const { data: ppvPurchases } = await supabase
    .from('purchases')
    .select('email, user_id')
    .eq('purchase_type', 'ppv')
    .not('email', 'is', null);

  if (ppvPurchases?.length) {
    for (const p of ppvPurchases) {
      if (p.email) {
        // If this purchase is tied to an account, skip — they were handled above
        // (either included or excluded by preference)
        if (p.user_id && optedOutUserIds.has(p.user_id)) continue;
        recipientSet.add(p.email.toLowerCase());
      }
    }
  }

  const recipients = Array.from(recipientSet);
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Send in batches of 100 (Resend batch limit)
  const { html, text } = eventAnnouncedEmail({ eventName, eventDate, ppvPrice });
  const subject = `${eventName} is coming to BoxStreamTV — watch live`;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100).map((to) => ({
      from: 'BoxStreamTV <noreply@boxstreamtv.com>',
      replyTo: 'hunter@boxstreamtv.com',
      to,
      subject,
      html,
      text,
    }));
    try {
      await resend.batch.send(batch);
      sent += batch.length;
    } catch (err) {
      console.error('Announce batch send error:', err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
