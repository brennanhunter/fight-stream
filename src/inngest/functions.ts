import { Resend } from 'resend';
import { inngest } from '@/lib/inngest';
import { createServerClient } from '@/lib/supabase';
import { eventReminderEmail } from '@/lib/emails/event-reminder';
import { eventStartingEmail } from '@/lib/emails/event-starting';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── 24-hour reminder ────────────────────────────────────────────────────────
// Runs every hour. Finds events starting in the next 23–25 hour window
// that haven't had a reminder sent yet, then emails all PPV purchasers.

export const eventReminderFunction = inngest.createFunction(
  { id: 'event-reminder', triggers: [{ cron: '0 * * * *' }] },
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
      // Get all PPV purchasers for this event
      const { data: purchases } = await supabase
        .from('purchases')
        .select('email')
        .eq('event_id', event.id)
        .eq('purchase_type', 'ppv');

      if (!purchases?.length) {
        // Mark sent anyway so we don't retry on next cron
        await supabase
          .from('events')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', event.id);
        continue;
      }

      // Dedupe emails
      const emails = [...new Set(purchases.map((p) => p.email))];
      const { html, text } = eventReminderEmail({ eventName: event.name, eventDate: event.date });

      // Send in batches of 50 (Resend batch limit)
      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        await Promise.all(
          batch.map((email) =>
            resend.emails.send({
              from: 'BoxStreamTV <noreply@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: email,
              subject: `${event.name} is tomorrow — don't miss it`,
              html,
              text,
            }).catch((err) => console.error(`Reminder email failed for ${email}:`, err))
          )
        );
      }

      await supabase
        .from('events')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', event.id);

      totalSent += emails.length;
    }

    return { sent: totalSent };
  }
);

// ─── Event starting now ───────────────────────────────────────────────────────
// Runs every 5 minutes. Finds events whose date is within the last 10 minutes
// that haven't had a "starting" email sent yet.

export const eventStartingFunction = inngest.createFunction(
  { id: 'event-starting', triggers: [{ cron: '*/5 * * * *' }] },
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
      const { data: purchases } = await supabase
        .from('purchases')
        .select('email')
        .eq('event_id', event.id)
        .eq('purchase_type', 'ppv');

      if (!purchases?.length) {
        await supabase
          .from('events')
          .update({ starting_sent_at: new Date().toISOString() })
          .eq('id', event.id);
        continue;
      }

      const emails = [...new Set(purchases.map((p) => p.email))];
      const { html, text } = eventStartingEmail({ eventName: event.name });

      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        await Promise.all(
          batch.map((email) =>
            resend.emails.send({
              from: 'BoxStreamTV <noreply@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: email,
              subject: `${event.name} is live now — watch now`,
              html,
              text,
            }).catch((err) => console.error(`Starting email failed for ${email}:`, err))
          )
        );
      }

      await supabase
        .from('events')
        .update({ starting_sent_at: new Date().toISOString() })
        .eq('id', event.id);

      totalSent += emails.length;
    }

    return { sent: totalSent };
  }
);
