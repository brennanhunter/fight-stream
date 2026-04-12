# BoxStreamTV — Audit Responsibilities

_10 developers, 10 scopes. Each developer owns their area end-to-end: security, correctness, edge cases, error handling, and performance._

---

## 1. Authentication & Identity

**Owner:** Dev 1

**Scope:** Everything related to user sign-up, login, password reset, OAuth, and Supabase Auth integration.

| Type | Files |
|------|-------|
| Pages | `src/app/(auth)/login/`, `src/app/(auth)/signup/`, `src/app/(auth)/forgot-password/`, `src/app/(auth)/reset-password/`, `src/app/(auth)/layout.tsx` |
| Callbacks | `src/app/auth/callback/`, `src/app/auth/confirm/` |
| Components | `src/components/auth/` |
| Middleware | `src/middleware.ts` |
| Lib | `src/lib/supabase.ts`, `src/lib/supabase-server.ts` |

**Audit focus:**
- Auth flow completeness (email confirm, OAuth redirect, magic link)
- Password reset token expiry and replay protection
- Middleware route protection — are all protected routes covered?
- Supabase RLS policy enforcement — do server components use the right client (auth vs service-role)?
- Session refresh and cookie handling in middleware
- CSRF protection on auth forms
- Error states: expired tokens, duplicate signups, invalid OAuth state

---

## 2. PPV Checkout & Payment Verification

**Owner:** Dev 2

**Scope:** The full PPV purchase flow — from clicking "Buy" through Stripe Checkout to landing on the watch page with a valid session.

| Type | Files |
|------|-------|
| API | `src/app/api/ppv-checkout/route.ts`, `src/app/api/verify-payment/route.ts` |
| Pages | `src/app/payment-success/` |
| Lib | `src/lib/stripe.ts`, `src/lib/geo.ts`, `src/lib/promoter-rate.ts` |

**Audit focus:**
- Stripe Checkout session creation — are all required params set (idempotency key, metadata, customer_email)?
- Payment verification — is `payment_status` checked before granting access?
- Double-claim protection — can the success URL be shared/replayed?
- Purchase deduplication (session_claimed_at logic)
- Geo-restriction enforcement and bypass prevention
- Price integrity — can the client influence the amount?
- Cookie issuance — is the ppv_session JWT correct and scoped?
- Race condition between webhook and verify-payment (who writes first?)

---

## 3. Stripe Webhooks

**Owner:** Dev 3

**Scope:** The Stripe webhook handler and all event types it processes.

| Type | Files |
|------|-------|
| API | `src/app/api/webhooks/stripe/route.ts` |
| Schema | `supabase/schema.sql` — `stripe_events` table (idempotency) |

**Audit focus:**
- Signature verification — is `stripe.webhooks.constructEvent` used correctly?
- Idempotency — are duplicate webhook deliveries handled (stripe_events dedup)?
- Every handled event type: is the DB write correct? Are edge cases covered (e.g., subscription updated with no changes)?
- Unhandled event types — should any additional events be processed?
- Error handling — does a failure in one event type affect others?
- Data consistency between webhook writes and verify-payment writes (who wins on conflict?)
- Subscription lifecycle: `customer.subscription.created`, `updated`, `deleted` — state transitions
- Invoice events: `invoice.payment_succeeded`, `invoice.payment_failed` — are retries handled?
- Refund handling — does a refund revoke access?

---

## 4. Subscriptions & Billing

**Owner:** Dev 4

**Scope:** Subscription purchase, management, cancellation, reactivation, and billing portal.

| Type | Files |
|------|-------|
| API | `src/app/api/subscribe/route.ts`, `src/app/api/cancel-subscription/route.ts`, `src/app/api/reactivate-subscription/route.ts`, `src/app/api/billing-portal/route.ts` |
| Pages | `src/app/pricing/`, `src/app/account/subscription/` |
| Lib | `src/lib/access.ts` (subscription tier logic) |

**Audit focus:**
- Can an unauthenticated user hit subscribe/cancel/reactivate? Are all routes gated on `getUser()`?
- Stripe customer creation — are duplicate Stripe customers prevented?
- Cancel flow — `cancel_at_period_end` vs `cancel_at` — are both cases handled?
- Reactivation — does it correctly clear cancellation on Stripe's side?
- Billing portal — is the return URL safe from open redirect?
- Subscription tier resolution — `getSubscriptionTier()` correctness and caching
- Pricing page — are prices fetched server-side or hardcoded? Can they drift from Stripe?

---

## 5. Access Control & Session Enforcement

**Owner:** Dev 5

**Scope:** The runtime access-check layer — JWT sessions, purchase lookups, session versioning, and single-device enforcement.

| Type | Files |
|------|-------|
| API | `src/app/api/check-purchase/route.ts`, `src/app/api/recover-access/route.ts`, `src/app/api/recover-access/send-code/route.ts` |
| Pages | `src/app/recover-access/` |
| Lib | `src/lib/session.ts` (JWT create/verify/hasEventAccess) |
| Components | `src/components/FightPassPrompt.tsx`, `src/components/ExpiryCountdown.tsx` |

**Audit focus:**
- JWT session creation — are all claims correct (purchaseId, email, eventId, expiresAt, sessionVersion)?
- Session verification — is the JWT signature validated? Is expiry enforced?
- `session_version` enforcement — does every access path check it against the DB?
- Recovery flow — is the 6-digit OTP generated securely? Is it rate-limited? Does it expire?
- Cookie-based fallback (customer_email) — can it bypass session versioning?
- Expiry model — `PURCHASE_WINDOW_DAYS` / `REPLAY_WINDOW_DAYS` consistency across all files
- Edge case: what happens when a user has multiple purchases for the same event?

---

## 6. Live Streaming & IVS

**Owner:** Dev 6

**Scope:** The live event experience — token generation, IVS playback, stream status, and the live player UI.

| Type | Files |
|------|-------|
| API | `src/app/api/generate-token/route.ts`, `src/app/api/stream-status/route.ts` |
| Pages | `src/app/live/page.tsx`, `src/app/live/LivePlayer.tsx` |
| Public | `public/amazon-ivs-wasmworker.min.js` |

**Audit focus:**
- IVS token signing — is the private key handled securely? Is the token scoped correctly (channel ARN, expiry)?
- Access check in generate-token — does it cover all paths (cookie session, DB purchase, subscription, premium)?
- Stream status endpoint — is it public? Should it be rate-limited?
- Player error states — what happens when the stream goes down mid-watch?
- Token expiry and refresh — does the player request a new token before the old one expires?
- WASM worker — is the IVS SDK version current? Any known vulnerabilities?
- Can a valid token be reused across devices or shared?

---

## 7. VOD & Watch Experience

**Owner:** Dev 7

**Scope:** The VOD catalog, watch page (all 3 access paths), CloudFront signed cookies, and the video player.

| Type | Files |
|------|-------|
| API | `src/app/api/checkout/route.ts` (VOD checkout), `src/app/api/save-session/route.ts`, `src/app/api/redeem-promo/route.ts` |
| Pages | `src/app/vod/`, `src/app/watch/page.tsx` |
| Components | `src/app/watch/SaveSession.tsx`, `src/app/watch/VodPlayer.tsx`, `src/app/vod/VodBuyButton.tsx`, `src/app/vod/VodContent.tsx` |
| Lib | `src/lib/cloudfront.ts`, `src/lib/vod.ts` |

**Audit focus:**
- Watch page Path 1 (subscription), Path 2 (purchase_id), Path 3 (session_id) — ownership validation in each
- CloudFront signed cookie generation — key rotation, expiry alignment, domain scoping
- Can a user forge or manipulate `purchase_id` / `session_id` URL params to access others' content?
- VOD checkout — same Stripe integrity checks as PPV (price, idempotency)
- Promo code redemption — deduplication, case sensitivity, expiry
- Save-session route — what data does it write? Can it be abused?
- S3 key exposure — is the raw key ever leaked to the client?

---

## 8. Admin Panel

**Owner:** Dev 8

**Scope:** The entire admin interface — login, authentication, grant access, event announcements, and stream management.

| Type | Files |
|------|-------|
| API | `src/app/api/admin/login/route.ts`, `src/app/api/admin/grant/route.ts`, `src/app/api/admin/announce/route.ts` |
| Pages | `src/app/admin/page.tsx`, `src/app/admin/login/` |
| Components | `src/app/admin/AdminAnnounceForm.tsx`, `src/app/admin/AdminCopyButton.tsx`, `src/app/admin/AdminGrantForm.tsx`, `src/app/admin/AdminLogout.tsx`, `src/app/admin/AdminStreamToggle.tsx` |
| Lib | `src/lib/admin-auth.ts` |
| Background | `src/inngest/functions.ts` — `eventAnnounceFunction` |

**Audit focus:**
- Admin authentication — is the password comparison timing-safe? Is the cookie HttpOnly/Secure/SameSite?
- Admin cookie verification — can the JWT be forged? Is expiry enforced?
- Grant access — does the inserted purchase row have all fields needed for every access path?
- Stream toggle — what happens if toggled during an active stream? Race conditions?
- Announce — does the Inngest function handle partial failures (some emails fail)?
- Authorization — is every admin API route protected by `verifyAdminCookie()`?
- Can a non-admin user access any admin functionality through direct API calls?

---

## 9. Emails, Notifications & Background Jobs

**Owner:** Dev 9

**Scope:** All transactional emails, email templates, notification preferences, and Inngest scheduled functions.

| Type | Files |
|------|-------|
| Templates | `emails/event-announced.tsx`, `emails/event-reminder.tsx`, `emails/event-starting.tsx`, `emails/payment-failed.tsx`, `emails/purchase-confirmation.tsx`, `emails/recovery-code.tsx`, `emails/subscription-canceled.tsx`, `emails/subscription-confirmation.tsx`, `emails/subscription-renewed.tsx`, `emails/welcome.tsx` |
| Lib helpers | `src/lib/emails/` (all compiled email functions) |
| Background | `src/inngest/functions.ts` — `eventReminderFunction`, `eventStartingFunction` |
| Inngest handler | `src/app/api/inngest/route.ts` |
| Lib | `src/lib/inngest.ts` |

**Audit focus:**
- Email content — are all dynamic values escaped to prevent HTML injection?
- Are unsubscribe/preference links included where legally required (CAN-SPAM)?
- Notification preferences — is `new_events: false` respected in every send path?
- Reminder/starting cron functions — are the time windows correct? Can duplicate sends happen?
- Resend batch limits — are batches capped at 100? Error handling per batch?
- Inngest idempotency — can a function run twice safely?
- Are sensitive values (purchase amounts, emails) ever exposed in email previews or subject lines?

---

## 10. Infrastructure, Security & Database

**Owner:** Dev 10

**Scope:** Cross-cutting concerns — rate limiting, database schema, RLS policies, error handling, reporting, and static/legal pages.

| Type | Files |
|------|-------|
| Security | `src/lib/rate-limit.ts`, `src/lib/report-otp.ts`, `src/lib/report-session.ts`, `src/lib/report-token.ts` |
| API | `src/app/api/contact/route.ts`, `src/app/api/report/[eventId]/send-code/route.ts`, `src/app/api/report/[eventId]/verify-code/route.ts` |
| Pages | `src/app/report/`, `src/app/contact/`, `src/app/privacy/`, `src/app/terms/`, `src/app/faq/`, `src/app/work-with-us/` |
| Schema | `supabase/schema.sql` |
| Config | `src/middleware.ts` (shared with Dev 1), `next.config.ts`, `eslint.config.mjs`, `robots.ts`, `sitemap.ts` |
| Global | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/globals.css` |
| Components | `src/components/layout/` (Header, Footer), `src/components/hero/`, `src/components/ui/`, `src/components/motion.tsx` |
| Lib | `src/lib/utils.ts` |

**Audit focus:**
- Rate limiter — is the Supabase RPC atomic? Can it be bypassed by rotating IPs? Should there be a global fallback?
- Schema — do all UNIQUE constraints, indexes, and foreign keys match what the app expects?
- RLS policies — are they restrictive enough? Does the service-role client bypass them correctly?
- Report flow (OTP-based piracy reporting) — is it rate-limited? Can it be used for email enumeration?
- Contact form — honeypot effectiveness, spam prevention
- Error boundaries — do `error.tsx` and `global-error.tsx` leak stack traces or internal details?
- Security headers — CSP, X-Frame-Options, HSTS (check `next.config.ts` and middleware)
- `robots.txt` and sitemap — are admin/API routes excluded from indexing?
- Static pages (privacy, terms) — are they current and legally compliant?

---

## Ground Rules

1. **Own your scope.** If you find an issue, file it even if the root cause is in another team's files. Tag the other dev.
2. **Shared files.** `middleware.ts` is shared between Dev 1 and Dev 10. `src/lib/access.ts` is shared between Dev 4 and Dev 5. `inngest/functions.ts` is shared between Dev 8 and Dev 9. Coordinate on changes.
3. **Test every fix.** Run `npx tsc --noEmit` after every change. Test the actual user flow, not just the happy path.
4. **Document as you go.** For each issue found, note the file, line, severity (Critical/High/Medium/Low), and a concrete fix description.
5. **Prioritize:** Critical (data loss, access bypass, payment integrity) → High (security, broken flows) → Medium (edge cases, performance) → Low (code quality, minor UX).
