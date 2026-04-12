import { Resend } from 'resend';
import { inngest } from '@/lib/inngest';
import { createServerClient } from '@/lib/supabase';
import { eventReminderEmail } from '@/lib/emails/event-reminder';
import { eventStartingEmail } from '@/lib/emails/event-starting';
import { eventAnnouncedEmail } from '@/lib/emails/event-announced';
import { unsubscribeHeaders, unsubscribeUrl } from '@/lib/emails/unsubscribe';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── 24-hour reminder ────────────────────────────────────────────────────────
// Runs every hour. Finds events starting in the next 23–25 hour window
// that haven't had a reminder sent yet, then emails all PPV purchasers.

export const eventReminderFunction = inngest.createFunction(
  { id: 'event-reminder', triggers: { cron: '0 * * * *' } },
  async () => {
    const supabase = createServerClient();

    const windowStart = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabase
      .from('events')
      .select('id, name, date')
      .gte('date', windowStart)
      .lte('date', windowEnd)
      .is('reminder_sent_at', null);

    if (!events?.length) return { sent: 0 };

    let totalSent = 0;

    for (const event of events) {
      // Atomically claim this event to prevent double-sends from overlapping runs
      const { data: claimed } = await supabase
        .from('events')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', event.id)
        .is('reminder_sent_at', null)
        .select('id');

      if (!claimed?.length) continue; // Another instance already claimed this event

      // Get all PPV purchasers for this event
      const { data: purchases } = await supabase
        .from('purchases')
        .select('email')
        .eq('event_id', event.id)
        .eq('purchase_type', 'ppv');

      if (!purchases?.length) continue;

      // Dedupe emails (normalize case)
      const emails = [...new Set(purchases.map((p) => p.email.toLowerCase()))];

      // Send in batches of 50 (Resend batch limit)
      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        await Promise.all(
          batch.map((email) => {
            const { html, text } = eventReminderEmail({ eventName: event.name, eventDate: event.date, unsubscribeUrl: unsubscribeUrl(email) });
            return resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: email,
              subject: `${event.name} is tomorrow — don't miss it`,
              html,
              text,
              headers: unsubscribeHeaders(email),
            }).catch((err) => console.error(`Reminder email failed for ${email}:`, err));
          })
        );
      }

      totalSent += emails.length;
    }

    return { sent: totalSent };
  }
);

// ─── Event starting now ───────────────────────────────────────────────────────
// Runs every 5 minutes. Finds events whose date is within the last 10 minutes
// that haven't had a "starting" email sent yet.

export const eventStartingFunction = inngest.createFunction(
  { id: 'event-starting', triggers: { cron: '*/5 * * * *' } },
  async () => {
    const supabase = createServerClient();

    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const windowEnd   = new Date().toISOString();

    const { data: events } = await supabase
      .from('events')
      .select('id, name, date')
      .gte('date', windowStart)
      .lte('date', windowEnd)
      .is('starting_sent_at', null);

    if (!events?.length) return { sent: 0 };

    let totalSent = 0;

    for (const event of events) {
      // Atomically claim this event to prevent double-sends from overlapping runs
      const { data: claimed } = await supabase
        .from('events')
        .update({ starting_sent_at: new Date().toISOString() })
        .eq('id', event.id)
        .is('starting_sent_at', null)
        .select('id');

      if (!claimed?.length) continue; // Another instance already claimed this event

      const { data: purchases } = await supabase
        .from('purchases')
        .select('email')
        .eq('event_id', event.id)
        .eq('purchase_type', 'ppv');

      if (!purchases?.length) continue;

      const emails = [...new Set(purchases.map((p) => p.email.toLowerCase()))];

      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        await Promise.all(
          batch.map((email) => {
            const { html, text } = eventStartingEmail({ eventName: event.name, unsubscribeUrl: unsubscribeUrl(email) });
            return resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: email,
              subject: `${event.name} is live now — watch now`,
              html,
              text,
              headers: unsubscribeHeaders(email),
            }).catch((err) => console.error(`Starting email failed for ${email}:`, err));
          })
        );
      }

      totalSent += emails.length;
    }

    return { sent: totalSent };
  }
);

// ─── Event announcement ──────────────────────────────────────────────────────
// Triggered by the admin announce route. Runs as a background job so the
// admin request returns immediately. Fetches subscriber emails directly by
// user_id instead of paginating all auth.users.

export const eventAnnounceFunction = inngest.createFunction(
  { id: 'event-announce', idempotency: 'event.data.eventName + "-" + event.data.eventDate', triggers: { event: 'admin/announce' } },
  async ({ event }: { event: { data: { eventName: string; eventDate: string; ppvPrice: string } } }) => {
    const { eventName, eventDate, ppvPrice } = event.data;

    const supabase = createServerClient();

    // Fetch users who opted out of new event announcements
    const { data: optedOut } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('new_events', false);

    const optedOutUserIds = new Set((optedOut || []).map((p) => p.user_id));

    const recipientSet = new Set<string>();

    // 1. Active subscriber emails — fetch only the user_ids we need
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trialing']);

    if (subscriptions?.length) {
      const userIds = subscriptions
        .map((s) => s.user_id)
        .filter((id): id is string => !!id && !optedOutUserIds.has(id));

      // Batch getUserById — 10 at a time to avoid overloading
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10);
        const results = await Promise.all(
          batch.map((id) => supabase.auth.admin.getUserById(id))
        );
        for (const { data } of results) {
          if (data?.user?.email) {
            recipientSet.add(data.user.email.toLowerCase());
          }
        }
      }
    }

    // 2. Past PPV buyer emails
    const { data: ppvPurchases } = await supabase
      .from('purchases')
      .select('email, user_id')
      .eq('purchase_type', 'ppv')
      .not('email', 'is', null);

    if (ppvPurchases?.length) {
      for (const p of ppvPurchases) {
        if (p.email) {
          if (p.user_id && optedOutUserIds.has(p.user_id)) continue;
          recipientSet.add(p.email.toLowerCase());
        }
      }
    }

    const recipients = Array.from(recipientSet);
    if (recipients.length === 0) return { sent: 0 };

    const subject = `${eventName} is coming to BoxStreamTV — watch live`;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += 100) {
      const batch = recipients.slice(i, i + 100).map((to) => {
        const { html, text } = eventAnnouncedEmail({ eventName, eventDate, ppvPrice, unsubscribeUrl: unsubscribeUrl(to) });
        return {
          from: 'BoxStreamTV <hunter@boxstreamtv.com>' as const,
          replyTo: 'hunter@boxstreamtv.com',
          to,
          subject,
          html,
          text,
          headers: unsubscribeHeaders(to),
        };
      });
      try {
        const { data } = await resend.batch.send(batch);
        sent += data?.length ?? batch.length;
      } catch (err) {
        console.error(`Announce batch send error (${batch.length} recipients skipped):`, err);
      }
    }

    return { sent };
  }
);
