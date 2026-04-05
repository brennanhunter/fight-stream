# BoxStreamTV Email Plan

## Status Key
- ✅ Done
- 🎨 No code needed (Supabase dashboard branding)
- ⬜ Not started

---

## Transactional

| # | Email | Trigger | Status |
|---|-------|---------|--------|
| 1 | Email verification on signup | User signs up with email/password | ✅ Branded in Supabase dashboard |
| 2 | Password reset | User requests password reset | ✅ Branded in Supabase dashboard |
| 3 | PPV purchase confirmation | Successful Stripe checkout verified | ✅ Built |
| 4 | Fight Pass subscription confirmation | Stripe webhook: subscription created | ✅ Built |
| 5 | Fight Pass cancellation confirmation | Stripe webhook: subscription canceled | ✅ Built |
| 6 | Fight Pass payment failed | Stripe webhook: invoice payment failed | ✅ Built |

---

## Triggered

| # | Email | Trigger | Status |
|---|-------|---------|--------|
| 7 | Access code for recovery | User requests access recovery | ✅ Built |
| 8 | Event reminder — 24 hours before | Inngest cron (hourly): finds events with date 23–25h away | ✅ Built |
| 9 | Event is starting now | Inngest cron (every 5min): finds events with date in last 10min | ✅ Built |
| 10 | ~~Replay now available~~ | Dropped — replaced by #8 reminder mentioning replay | — |

---

## Relationship

| # | Email | Trigger | Status |
|---|-------|---------|--------|
| 11 | Welcome after Google OAuth signup | First OAuth login (no prior account) | ⬜ |
| 12 | New event announced | Admin publishes a new upcoming event | ⬜ (needs opt-in audience list via Resend) |

---

## Notes

- All emails send from `noreply@boxstreamtv.com` with `reply-to: hunter@boxstreamtv.com`
- Email templates live in `src/lib/emails/`
- Resend is the sending provider — API key in `.env.local` as `RESEND_API_KEY`
- #1 and #2 are controlled in the Supabase dashboard under **Authentication → Email Templates**
- #8 will require a cron job or Vercel scheduled function to query upcoming events and find purchasers
- #12 requires building an opt-in list using Resend Audiences before sending broadcasts
