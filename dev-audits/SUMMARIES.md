# BoxStreamTV — Audit Summaries

---

## Dev 1: Authentication & Identity

**Status:** Complete  
**Date:** 2026-04-11  
**Files reviewed:** 11 files across auth pages, OAuth callbacks, middleware, Supabase clients, and user menu component.

### Issues Found: 6

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Critical** | Middleware redirected authenticated users away from `/reset-password`, completely breaking the password recovery flow (recovery OTP establishes a session before redirect) | `src/middleware.ts` | ✅ Yes |
| 2 | **Medium** | `type` query param in `/auth/confirm` cast without validation — user-controlled value passed directly to Supabase `verifyOtp` | `src/app/auth/confirm/route.ts` | ✅ Yes |
| 3 | **Low** | Duplicate welcome emails possible — both `/auth/callback` (OAuth) and `/auth/confirm` (email) could send welcome emails for the same user | `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts` | ✅ Yes |
| 4 | **Medium** | Duplicate signup detection relied on error message string matching; with email confirmation enabled, Supabase returns success with empty `identities` array instead | `src/app/(auth)/signup/page.tsx` | ✅ Yes |
| 5 | **Medium** | Password minimum length was 6 characters (NIST recommends 8+) | `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/reset-password/page.tsx` | ✅ Yes |
| 6 | **Medium** | No CAPTCHA on signup or password reset request forms | `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/forgot-password/page.tsx` | ✅ Yes |

### What Passed

- **Redirect sanitization:** `sanitizeRedirect()` in callback/confirm and inline check in login all use `startsWith('/') && !startsWith('//')` pinned to `${origin}` — no open redirect.
- **OAuth CSRF/state:** Supabase handles PKCE internally; `exchangeCodeForSession` validates the code.
- **Session refresh:** Middleware calls `getUser()` on every request with proper error handling.
- **Supabase client separation:** All auth files use the correct client (anon+cookies for user context, service-role only where needed). No key leakage.
- **Route protection:** `/account/*` and `/admin/*` correctly gated. Webhook and Inngest routes exempted from CSRF.
- **Error messages:** Login shows generic "Authentication failed". Forgot-password returns success regardless of email existence — no user enumeration.
- **Sign out:** Properly clears session and redirects.

### Manual Steps Required

1. **Supabase dashboard:** Update Auth password policy to enforce 8-char minimum server-side.
2. **Cloudflare Turnstile:** Create widget at dash.cloudflare.com, add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to env vars, enable CAPTCHA in Supabase Auth settings with the secret key.

### Files Changed

- `src/middleware.ts` — Removed `/reset-password` from authenticated-user redirect guard
- `src/app/auth/confirm/route.ts` — Added `allowedTypes` allowlist validation for `type` param
- `src/app/auth/callback/route.ts` — Added `welcome_email_sent` metadata check + flag
- `src/app/auth/confirm/route.ts` — Added `welcome_email_sent` metadata check + flag
- `src/app/(auth)/signup/page.tsx` — Added `identities.length === 0` check, increased `minLength` to 8, added Turnstile CAPTCHA
- `src/app/(auth)/reset-password/page.tsx` — Increased `minLength` to 8
- `src/app/(auth)/forgot-password/page.tsx` — Added Turnstile CAPTCHA

### Package Added

- `@marsidev/react-turnstile` — Cloudflare Turnstile React component

---

## Dev 2: PPV Checkout & Payment Verification

**Status:** Complete  
**Date:** 2026-04-11  
**Files reviewed:** 6 files across PPV checkout API, payment verification API, payment success page, Stripe lib, geo-restriction lib, and promoter rate lib. Cross-cutting reads of webhook handler, session lib, and access lib.

### Issues Found: 5

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Low** | Race condition — webhook inserts between verify-payment's SELECT and upsert, leaving `session_claimed_at` null. A second visitor could theoretically claim cookies. | `src/app/api/verify-payment/route.ts` | ✅ Yes |
| 2 | **Medium** | Geo-restriction used plaintext HTTP (`ip-api.com` free tier) — MITM could forge response to bypass blackout | `src/lib/geo.ts` | ✅ Yes |
| 3 | **Low** | ppv-checkout created its own `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of using shared null-safe `stripeServer` from `src/lib/stripe.ts` | `src/app/api/ppv-checkout/route.ts` | ✅ Yes |
| 4 | **Low** | `PURCHASE_WINDOW_DAYS` (2) and `REPLAY_WINDOW_DAYS` (4) defined as inline constants across 7+ files — drift risk | `src/app/api/ppv-checkout/route.ts`, `src/app/api/verify-payment/route.ts`, +5 others | ⏳ Deferred to Dev 5 |
| 5 | **Medium** | `ip-api.com` rate limit (45 req/min free tier) could exhaust on event day, causing all geo lookups to fail-open and disabling blackout enforcement | `src/lib/geo.ts` | ✅ Yes |

### What Passed

- **Price integrity:** Client-submitted `priceId` validated against `event.stripe_price_id` from DB. Stripe resolves charge amount from its Price object. No client influence on amount.
- **Payment status verification:** Both verify-payment and webhook check `payment_status === 'paid' || 'no_payment_required'` before granting access.
- **Double-claim protection:** 15-minute grace window, atomic conditional update with `.is('session_claimed_at', null)`, and ppv_session cookie verification for re-claims. Shared URLs outside grace window get success response but no cookies.
- **JWT session:** HS256-signed with server-side `JWT_SECRET`. Claims scoped to purchaseId + eventId + sessionVersion. Cookie: HttpOnly, Secure, SameSite=lax. Version-checked at both `check-purchase` and `generate-token`.
- **Webhook/verify-payment coexistence:** Clean separation — webhook writes purchase row; verify-payment claims via `session_claimed_at`. Upsert conflict resolution handles both orderings. No data loss.
- **Rate limiting:** Both ppv-checkout and verify-payment enforce `rateLimit(req, key, 20)`.
- **Discount integrity:** Entirely server-driven from verified subscription status. No client input influences coupons. `allow_promotion_codes` disabled when subscription discount applied. Coupon creation idempotent.
- **Geo fail-open design:** Intentional — avoids blocking legitimate users when lookup fails.
- **Payment success page:** Pure client-side UI. All security decisions server-side. No XSS, no open redirect, no information leakage.
- **stripe.ts:** Null-safe export, correct key separation, no secret key leakage.
- **promoter-rate.ts:** Consistent tier boundaries across all three functions. Pure display logic.

### Coordination Note

- **Issue 4 deferred to Dev 5:** Coordination note added to `dev-audits/ACCESS-CONTROL-SESSION-AUDIT.md` with full file list and line numbers. Dev 5 owns the access control scope where most inline constants live. Once they create a shared constants file, Dev 2 will update ppv-checkout and verify-payment to import from it.

### Files Changed

- `src/app/api/verify-payment/route.ts` — Added follow-up conditional UPDATE after upsert to set `session_claimed_at` in webhook race case
- `src/lib/geo.ts` — Switched from `http://ip-api.com` to `https://ipapi.co` (HTTPS); added per-IP geo cache (10-min TTL, 500 entries)
- `src/app/api/ppv-checkout/route.ts` — Replaced direct `new Stripe()` with shared `stripeServer` import + null guard

---

## Dev 3: Stripe Webhooks

**Status:** Complete  
**Date:** 2026-04-11  
**Files reviewed:** 8 files — webhook handler (`route.ts`), schema (`schema.sql`), verify-payment, save-session, access.ts, stripe.ts, supabase.ts, middleware.ts. Cross-cutting reads of email templates, admin panel, and billing portal config.

### Issues Found: 8

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Low** | Webhook created its own `new Stripe()` instead of using shared null-safe `stripeServer` | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 2 | **Medium** | Non-23505 dedup INSERT error allowed event processing without idempotency guard — retries would double-process | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 3 | **Low** | No RLS on `stripe_events` table — inconsistent with all other tables in schema | `supabase/schema.sql` | ✅ Yes |
| 4 | **Medium** | PPV checkout.session.completed sent no confirmation email — only verify-payment did, so browser-close before success page meant no email | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 5 | **Medium** | Subscription upsert/update errors silently ignored in 4 places — DB failures returned 200 to Stripe, preventing retries | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 6 | **High** | No `charge.dispute.created` handler — disputed charges left customer access fully intact | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 7 | **Medium** | Stripe SDK throws (network/rate-limit) after dedup INSERT caused permanent event loss — dedup record existed but event never processed | `src/app/api/webhooks/stripe/route.ts` | ✅ Yes |
| 8 | **High** | VOD refunds didn't revoke access — VOD rows stored `stripe_session_id` but not `stripe_payment_intent_id`, so `charge.refunded` lookup missed them | `src/app/api/webhooks/stripe/route.ts`, `src/app/api/save-session/route.ts` | ✅ Yes |

### What Passed

- **Signature verification:** `stripe.webhooks.constructEvent` validates HMAC-SHA256 signature with `STRIPE_WEBHOOK_SECRET`. Raw body correctly passed. Invalid signatures return 400.
- **Idempotency (after fix):** SELECT-then-INSERT dedup on `stripe_events.event_id` (unique constraint). Duplicate events return `{ duplicate: true }` immediately. Non-duplicate errors now properly return 500 for Stripe retry.
- **Subscription lifecycle:** Full coverage — `checkout.session.completed` (create), `customer.subscription.updated` (changes), `customer.subscription.deleted` (cancel), `invoice.payment_succeeded` (renewal), `invoice.payment_failed` (dunning).
- **PPV/VOD purchase handling:** Correct upsert logic with `onConflict: 'stripe_session_id'`. Expiry calculation matches checkout route logic.
- **Email sends (subscriptions):** All subscription lifecycle emails individually try/caught — failures don't block webhook processing.
- **Refund revocation:** `charge.refunded` correctly sets `expires_at = now()` with both primary (payment_intent) and fallback (session ID) lookups.
- **Webhook/verify-payment coexistence:** `session_claimed_at` check prevents double confirmation emails. Race condition between webhook and verify-payment handled cleanly (Dev 2 also verified this from the verify-payment side).
- **No secrets in responses:** All webhook responses are minimal `{ received: true }` or `{ error: string }`. No Stripe data leaked.
- **Event type scoping:** Only processes known event types. Unknown events return 200 (correct — Stripe sends all enabled events to all endpoints).

### Manual Steps Completed by Owner

1. ✅ Enabled `charge.dispute.created` in Stripe Dashboard webhook endpoint settings.
2. ✅ Applied RLS SQL to production `stripe_events` table.
3. ✅ Confirmed no trial periods or subscription pausing configured — no handlers needed.

### Files Changed

- `src/app/api/webhooks/stripe/route.ts` — Issues 1, 2, 4, 5, 6, 7, 8 (shared Stripe client, dedup error guard, PPV email, subscription error logging, dispute handler, SDK try/catch isolation, VOD payment_intent storage + refund/dispute fallback lookup)
- `src/app/api/save-session/route.ts` — Issue 8 (store `stripe_payment_intent_id` on VOD purchase rows)
- `supabase/schema.sql` — Issue 3 (RLS + service-role policy on `stripe_events`)

---

## Dev 4: Subscriptions & Billing

**Status:** Complete
**Date:** 2026-04-11
**Files reviewed:** 8 files across subscribe, cancel, reactivate, billing-portal API routes, pricing page, subscription management page, access.ts, and stripe.ts. Cross-checks against webhook handler and schema.

### Issues Found: 7

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Medium** | `priceId` from request body passed directly to Stripe with no validation — any recurring Stripe price accepted | `src/app/api/subscribe/route.ts` | ✅ Yes |
| 2 | **Medium** | `cancel-subscription` status filter excluded `past_due` — Cancel button shown but returns 404 | `src/app/api/cancel-subscription/route.ts` | ✅ Yes |
| 3 | **Medium** | `reactivate-subscription` status filter excluded `past_due` — same broken UX | `src/app/api/reactivate-subscription/route.ts` | ✅ Yes |
| 4 | **Low** | All 4 API routes + pricing page used unsafe `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of shared null-safe `stripeServer` | 5 files | ✅ Yes |
| 5 | **Low** | Orphaned Stripe customers created on abandoned checkouts — only checked local DB, not Stripe | `src/app/api/subscribe/route.ts` | ✅ Yes |
| 6 | **Low** | Subscribe error handler returned `error.message` to client, leaking Stripe internals | `src/app/api/subscribe/route.ts` | ✅ Yes |
| 7 | **Low** | Unnecessary type assertion for `cancel_at` (already on `Stripe.Subscription` in v19) + fragile `null as unknown as number` cast | `src/app/api/reactivate-subscription/route.ts` | ✅ Yes |

### What Passed

- **Auth gating:** All 4 API routes call `getUser()` and return 401 if missing.
- **Rate limiting:** All 4 API routes enforce `rateLimit()`.
- **Billing portal return URL:** Hardcoded from `NEXT_PUBLIC_BASE_URL` — no open redirect.
- **Reactivation logic:** Correctly clears both `cancel_at_period_end` and `cancel_at`.
- **Pricing page server-side fetch:** Prices fetched from Stripe API, not hardcoded. Fallback display strings cosmetic only.
- **Subscription tier resolution:** `getSubscriptionTier()` correct. `past_due` intentionally excluded from `ACTIVE_STATUSES` (confirmed by Dev 3).
- **Cancel flow correctness:** Uses `cancel_at_period_end: true`. Webhook normalizes both cancellation mechanisms.
- **Webhook coexistence:** Subscribe success page polls until webhook writes subscription row.
- **Duplicate subscription prevention:** Checks for existing active/trialing/past_due before creating checkout.
- **Idempotency:** Subscribe route generates idempotency key from `user_id:priceId:minute_window`.
- **PPV discount & VOD access logic:** `getPpvDiscount()` and `hasVodAccess()` in `access.ts` correct.

### Files Changed

> **Note from Dev 8:** All 7 fixes were documented but none were actually applied to the codebase. Dev 8 implemented all fixes + discovered a bonus issue: all 4 API routes had missing `await` on `rateLimit()` calls — rate limiting was completely non-functional (async function returned a truthy Promise, so every request was returning an unresolved Promise as the response). Fixed alongside Issues 1–7.

- `src/app/api/subscribe/route.ts` — Issues 1, 4, 5, 6 (priceId allowlist, shared Stripe client + null guard, Stripe customer search by email before create, generic error message)
- `src/app/api/cancel-subscription/route.ts` — Issues 2, 4 (added `past_due` to status filter, shared Stripe client + null guard)
- `src/app/api/reactivate-subscription/route.ts` — Issues 3, 4, 7 (added `past_due` to status filter, shared Stripe client + null guard, removed unnecessary type assertion, `cancel_at: ''` via `Stripe.Emptyable<number>`)
- `src/app/api/billing-portal/route.ts` — Issue 4 (shared Stripe client + null guard)
- `src/app/pricing/page.tsx` — Issue 4 (shared Stripe client, conditional calls with fallback)

---

## Dev 5: Access Control & Session Enforcement

**Status:** Complete
**Date:** 2026-04-11
**Files reviewed:** 9 files across session lib, check-purchase API, recover-access API + send-code, recover-access page, FightPassPrompt, ExpiryCountdown. Cross-cutting reads of generate-token, access.ts, watch/page.tsx, verify-payment, webhooks/stripe.

### Issues Found: 5

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **High** | `generate-token` DB fallback purchase queries missing `expires_at` filter — refunded/disputed purchases still granted IVS streaming tokens | `src/app/api/generate-token/route.ts` | ✅ Yes |
| 2 | **Medium** | `generate-token` email lookups used raw `.toLowerCase()` instead of `normalizeEmail()` — inconsistent with all other routes | `src/app/api/generate-token/route.ts` | ✅ Yes |
| 3 | **Medium** | `check-purchase` customer_email cookie path returned `purchased: true` without checking `session_version` — bypassed single-device enforcement | `src/app/api/check-purchase/route.ts`, `src/components/hero/EventHero.tsx` | ✅ Yes |
| 4 | **Low** | `REPLAY_WINDOW_DAYS` (4) and `PURCHASE_WINDOW_DAYS` (2) defined as inline constants across 7 source files — drift risk | 7 files | ✅ Yes |
| 5 | **Low** | Recovery code comparison uses `===` (not timing-safe) — mitigated by 5/hr rate limit + 15-min expiry + atomic UPDATE | `src/app/api/recover-access/route.ts` | ⏭️ Won't fix |

### What Passed

- **JWT creation:** All claims correct (purchaseId, email, eventId, eventName, purchasedAt, expiresAt, sessionVersion). Null expiresAt falls back to 7-day TTL.
- **JWT verification:** HS256 signature validated via `jose`. Built-in `exp` claim + `expiresAt` payload double-checked.
- **session_version (JWT path):** Both `check-purchase` and `generate-token` validate against DB. Mismatches deny access.
- **Recovery OTP:** `crypto.getRandomValues()`, 3 sends/hr + 5 verifies/hr per-email, 15-min expiry, atomic conditional UPDATE prevents race.
- **Cookie security:** HttpOnly, Secure, SameSite=lax on all session cookies.
- **Multiple purchases:** Correctly handled with `.limit(1)` + descending order. Most recent wins.
- **No user enumeration:** Send-code returns `{ success: true }` regardless of email existence.
- **generate-token customer_email fallback:** Already removed by prior developer (correct).
- **FightPassPrompt / ExpiryCountdown:** Pure UI components, no security-relevant logic.

### Files Changed

- `src/lib/constants.ts` — **Created.** Shared `PURCHASE_WINDOW_DAYS` and `REPLAY_WINDOW_DAYS` exports.
- `src/app/api/generate-token/route.ts` — Issues 1, 2, 4 (added `expires_at` filter to DB queries, `normalizeEmail()`, shared constant import)
- `src/app/api/check-purchase/route.ts` — Issue 3 (customer_email path now returns `{ purchased: false, needsRecovery: true }`)
- `src/components/hero/EventHero.tsx` — Issue 3 (added `needs-recovery` state with dedicated recovery UI)
- `src/app/api/webhooks/stripe/route.ts` — Issue 4 (shared constant import)
- `src/app/api/redeem-promo/route.ts` — Issue 4 (shared constant import)
- `src/app/api/recover-access/route.ts` — Issue 4 (shared constant import)
- `src/app/watch/page.tsx` — Issue 4 (shared constant import)
- `src/app/api/verify-payment/route.ts` — Issue 4 (shared constant import)
- `src/app/api/ppv-checkout/route.ts` — Issue 4 (shared constant import)

---

## Dev 6: Live Streaming & IVS

**Status:** Complete  
**Date:** 2026-04-11  
**Files reviewed:** 4 files — generate-token API, stream-status API, live page (server component), LivePlayer (client component). Cross-cutting reads of session.ts, access.ts, stripe.ts, constants.ts, rate-limit.ts, supabase.ts.

### Issues Found: 4

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Medium** | `live/page.tsx` used unsafe `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of shared null-safe `stripeServer` | `src/app/live/page.tsx` | ✅ Yes |
| 2 | **Medium** | No IVS token refresh — 12h token obtained once on mount; reconnection poll reused stale URL with expired token | `src/app/live/LivePlayer.tsx` | ✅ Yes |
| 3 | **Low** | `stream-status` endpoint had no rate limiting — CDN caching mitigated but origin unprotected | `src/app/api/stream-status/route.ts` | ✅ Yes |
| 4 | **Medium** | IVS SDK v1.26.0 outdated — current is v1.33.0 (7 minor versions behind) | `src/app/live/LivePlayer.tsx` | ✅ Yes |

### What Passed

- **IVS token signing:** Private key from env var (`IVS_PRIVATE_KEY`), ES384 algorithm, scoped to channel ARN via `aws:channel-arn` claim, `access-control-allow-origin` set to site URL, 12h expiry.
- **Access checks (generate-token):** All paths covered — cookie session with `session_version` DB validation, DB purchase by `user_id`, DB purchase by `email` (normalizeEmail), premium subscription via `getSubscriptionTier()`. Dev 5 previously fixed `expires_at` filter and `normalizeEmail`.
- **Player error handling:** Proper state transitions on PLAYING/IDLE/ERROR/READY events. Health check detects stalls (>5s without `timeupdate`). Auto-reconnect poll every 5s when offline.
- **Stream status caching:** `s-maxage=10, stale-while-revalidate=5` means ~1000 concurrent viewers share one Supabase query.
- **Rate limiting on generate-token:** `rateLimit(req, 'generate-token', 30)` already in place.
- **Token scoping:** `access-control-allow-origin` prevents cross-origin token reuse. IVS tokens are stateless bearer tokens by design — no per-viewer binding available (platform limitation, not a bug).
- **No secret leakage:** generate-token returns only `{ token, playbackUrl }`. Errors return generic messages. Private key never exposed.

### Manual Steps Required

1. **WASM worker update:** Download `amazon-ivs-wasmworker.min.js` for v1.33.0 from the IVS CDN and replace `public/amazon-ivs-wasmworker.min.js`.

### Files Changed

- `src/app/live/page.tsx` — Issue 1 (replaced `new Stripe()` with shared `stripeServer` import + null guard)
- `src/app/live/LivePlayer.tsx` — Issues 2, 4 (added token refresh mechanism with 10h threshold; updated IVS SDK from v1.26.0 to v1.33.0)
- `src/app/api/stream-status/route.ts` — Issue 3 (added `rateLimit(request, 'stream-status', 60)`)

---

## Dev 7: VOD & Watch Experience

**Status:** Complete  
**Date:** 2026-04-11  
**Files reviewed:** 12 files — watch page (server component), SaveSession, VodPlayer, VOD checkout API, save-session API, redeem-promo API, VOD catalog page, VodBuyButton, VodContent, cloudfront.ts, vod.ts, constants.ts. Cross-cutting reads of access.ts, session.ts, stripe.ts, schema.sql, utils.ts.

### Issues Found: 5

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Medium** | VOD checkout `priceId` not validated — any Stripe price ID accepted, including non-VOD or subscription prices | `src/app/api/checkout/route.ts` | ✅ Yes |
| 2 | **Medium** | Watch page Path 3 upsert missing `stripe_payment_intent_id`, `user_id`, `session_claimed_at`, `session_version` — refund webhook can't find row, ownership queries fail | `src/app/watch/page.tsx` | ✅ Yes |
| 3 | **Low** | 4 files used unsafe `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of shared null-safe `stripeServer` | `src/app/watch/page.tsx`, `src/lib/vod.ts`, `src/app/api/checkout/route.ts`, `src/app/api/save-session/route.ts` | ✅ Yes |
| 4 | **Low** | Checkout error response leaked Stripe internals (`error.message` returned to client) | `src/app/api/checkout/route.ts` | ✅ Yes |
| 5 | **Low** | Email normalization inconsistency — raw `.toLowerCase()` instead of shared `normalizeEmail()` in ownership checks | `src/app/watch/page.tsx`, `src/app/vod/page.tsx`, `src/app/api/save-session/route.ts` | ✅ Yes |

### What Passed

- **Ownership validation (all paths):** Path 0 (PPV replay) checks subscription + purchase by user_id, email, cookie. Path 1 (subscription) checks tier. Path 2 (purchase_id) validates user_id or email match. Path 3 (session_id) validates Stripe session email against auth user or cookie. All paths check `expires_at`.
- **CloudFront signed cookies:** HLS wildcard policy, `.boxstreamtv.com` domain, HttpOnly/Secure/SameSite=none. Expiry aligned with content window. Private key from env var, never exposed.
- **S3 key exposure:** Raw keys stored server-side only. Client receives CloudFront signed URLs. Never in HTML, props, or API responses.
- **Promo code redemption:** Case-insensitive compare. Partial unique index `(email, event_id, amount_paid) WHERE amount_paid = 0` prevents duplicates. Rate limited at 5/window.
- **Save-session write integrity:** Product details from Stripe API (not user-supplied). 15-min claim grace window. Payment status verified.
- **VOD checkout idempotency:** SHA256 key from user/IP + priceId + minute window. Rate limited at 20/window.
- **VodPlayer error handling:** Distinguishes expired signed URLs from network errors using `expiresAt`.
- **VodContent / VodBuyButton:** Pure UI. No security-relevant logic.
- **vod.ts:** Products filtered by `metadata.site === 'boxstreamtv'`. Sort order from metadata.
- **cloudfront.ts:** Wildcard policy for HLS segments. Key pair ID from env var.

### Files Changed

- `src/app/api/checkout/route.ts` — Issues 1, 3, 4 (priceId validation via Stripe product metadata check, shared `stripeServer` + null guard, generic error message)
- `src/app/watch/page.tsx` — Issues 2, 3, 5 (Path 3 upsert now includes `stripe_payment_intent_id`/`user_id`/`session_claimed_at`/`session_version`, shared `stripeServer` + null guard, `normalizeEmail()` in ownership checks)
- `src/lib/vod.ts` — Issue 3 (shared `stripeServer` + null guard)
- `src/app/api/save-session/route.ts` — Issues 3, 5 (shared `stripeServer` + null guard, `normalizeEmail()` for email extraction)
- `src/app/vod/page.tsx` — Issue 5 (`normalizeEmail()` for customer_email cookie lookup)

---

## Dev 8: Admin Panel

**Status:** Complete
**Date:** 2026-04-11
**Files reviewed:** 11 files — admin login API, grant API, announce API, toggle-stream API, logout API, admin page (server component), admin login page, AdminAnnounceForm, AdminGrantForm, AdminStreamToggle, admin-auth lib. Cross-cutting reads of inngest/functions.ts (eventAnnounceFunction), middleware.ts, constants.ts, utils.ts.

### Issues Found: 6

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Medium** | Announce function had no Inngest idempotency guard — retries resent all emails | `src/inngest/functions.ts` | ✅ Yes |
| 2 | **Medium** | Announce route had no rate limit or dedup — double-click queued duplicate mass email jobs | `src/app/api/admin/announce/route.ts` | ✅ Yes |
| 3 | **Low** | Grant route used raw `.toLowerCase().trim()` instead of shared `normalizeEmail()` | `src/app/api/admin/grant/route.ts` | ✅ Yes |
| 4 | **Low** | Admin page hardcoded `4`/`2` for replay/purchase window days instead of shared constants | `src/app/admin/page.tsx` | ✅ Yes |
| 5 | **Low** | Announce batch `sent` count used `batch.length` instead of Resend response data | `src/inngest/functions.ts` | ✅ Yes |
| 6 | **Low** | toggle-stream passed unvalidated `live` param to Supabase | `src/app/api/admin/toggle-stream/route.ts` | ✅ Yes |

### What Passed

- **Timing-safe password comparison:** `crypto.timingSafeEqual` on HMAC-SHA256 hashes in login route. Rate limited at 3/30min.
- **Admin cookie security:** HttpOnly, Secure (prod), SameSite=lax, 8h maxAge. HMAC-SHA256 token requires both `ADMIN_PASSWORD` and `JWT_SECRET` to forge.
- **Authorization on all routes:** grant, announce, toggle-stream all call `verifyAdminCookie()`. Middleware redirects unauthenticated `/admin/*` page requests.
- **No admin bypass:** Non-admin users cannot access admin functionality through direct API calls.
- **Grant row completeness:** Inserted row has all required fields. `session_version` and `user_id` are nullable — access paths handle their absence.
- **Stream toggle safety:** Single boolean update on active event. UI disables button during request. No IVS-level side effects.
- **Notification preferences:** Announce function filters out `new_events: false` users correctly.
- **Logout:** Clears cookie with `maxAge: 0`.
- **Login UI:** No user enumeration — generic "Incorrect password" error.
- **AdminCopyButton / AdminLogout / AdminGrantForm / AdminAnnounceForm:** Pure client UI components. No security-relevant logic.

### Files Changed

- `src/app/api/admin/grant/route.ts` — Issue 3 (imported and used `normalizeEmail()`)
- `src/app/admin/page.tsx` — Issue 4 (imported `PURCHASE_WINDOW_DAYS`, `REPLAY_WINDOW_DAYS` from `@/lib/constants`)
- `src/app/api/admin/announce/route.ts` — Issue 2 (added `rateLimit` at 2/hour, added Inngest event `id` dedup key based on eventName+eventDate+time bucket)
- `src/inngest/functions.ts` — Issues 1, 5 (added `idempotency` key to function config, used Resend `data?.length` for accurate batch count)
- `src/app/api/admin/toggle-stream/route.ts` — Issue 6 (coerced `live` to strict boolean via `live === true`)

---

## Dev 9: Emails, Notifications & Background Jobs

**Status:** Complete
**Date:** 2026-04-11
**Files reviewed:** 24 files — 10 React email templates (`.tsx`), 10 HTML email helpers (`src/lib/emails/*.ts`), `inngest/functions.ts` (3 background jobs), `src/app/api/inngest/route.ts`, `src/lib/inngest.ts`. Cross-cutting reads of auth callback/confirm routes (welcome email sends), webhook handler (transactional email sends), notification_preferences schema.

### Issues Found: 5

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Medium** | HTML injection — dynamic values (`eventName`, `code`, `vodPurchaseId`, `ppvPrice`, `amountPaid`) interpolated raw into HTML templates without escaping | `src/lib/emails/event-announced.ts`, `event-reminder.ts`, `event-starting.ts`, `purchase-confirmation.ts`, `recovery-code.ts`, `subscription-renewed.ts` | ✅ Yes |
| 2 | **High** | No unsubscribe links in any of the 10 email templates — CAN-SPAM compliance violation for marketing emails | All email templates + `src/inngest/functions.ts` + auth callback/confirm routes | ✅ Yes |
| 3 | **Medium** | Cron race condition — reminder/starting functions used non-atomic SELECT → send → UPDATE pattern. Overlapping runs could double-send all emails | `src/inngest/functions.ts` | ✅ Yes |
| 4 | **Medium** | Announce batch failures silently lost — error log had no recipient count | `src/inngest/functions.ts` | ✅ Yes |
| 5 | **Low** | Email dedup in reminder/starting functions missing `.toLowerCase()` — case-variant duplicates possible | `src/inngest/functions.ts` | ✅ Yes |

### What Passed

- **Notification preferences:** `eventAnnounceFunction` correctly queries `notification_preferences.new_events = false` and excludes opted-out users.
- **Batch sending:** Announce capped at 100 (Resend batch API). Reminder/starting use individual sends in batches of 50.
- **Inngest idempotency:** Announce has explicit key. Reminder/starting use DB timestamp guards.
- **Non-blocking error handling:** Individual email failures `.catch()`-ed, don't crash jobs.
- **Plain text alternatives:** All 10 templates include `.text` versions.
- **Subject lines:** No sensitive data (amounts, emails, codes) — only public event names.
- **React templates (`.tsx`):** JSX auto-escapes, no injection risk.
- **Safe values:** `tierLabel` from typed union, Date formatting, hardcoded perks — no escaping needed.
- **Recovery code expiry:** "15 minutes" matches backend OTP expiry (verified via Dev 5).
- **Resend API key:** Environment variable, not hardcoded.
- **Inngest handler:** Clean setup, 300s maxDuration adequate.

### Files Created

- `src/lib/emails/unsubscribe.ts` — HMAC-signed unsubscribe URL generator + `List-Unsubscribe` header helper
- `src/app/api/unsubscribe/route.ts` — GET (browser confirmation page) + POST (one-click RFC 8058) unsubscribe endpoint

### Files Changed

- `src/lib/utils.ts` — Issue 1 (added `escapeHtml()` utility)
- `src/lib/emails/event-announced.ts` — Issues 1, 2 (escapeHtml on `eventName`/`ppvPrice`, optional `unsubscribeUrl` param + footer link)
- `src/lib/emails/event-reminder.ts` — Issues 1, 2 (escapeHtml on `eventName`, optional `unsubscribeUrl` param + footer link)
- `src/lib/emails/event-starting.ts` — Issues 1, 2 (escapeHtml on `eventName`, optional `unsubscribeUrl` param + footer link)
- `src/lib/emails/purchase-confirmation.ts` — Issue 1 (escapeHtml on `eventName`, `encodeURIComponent` on `vodPurchaseId`)
- `src/lib/emails/recovery-code.ts` — Issue 1 (escapeHtml on `eventName`, `code`)
- `src/lib/emails/subscription-renewed.ts` — Issue 1 (escapeHtml on `amountPaid`)
- `src/lib/emails/welcome.ts` — Issue 2 (optional `unsubscribeUrl` param + footer link)
- `src/inngest/functions.ts` — Issues 2, 3, 4, 5 (per-recipient unsubscribe headers/URLs, atomic claim-before-send, improved error log, `.toLowerCase()` dedup)
- `src/app/auth/callback/route.ts` — Issue 2 (unsubscribe URL + headers on welcome email)
- `src/app/auth/confirm/route.ts` — Issue 2 (unsubscribe URL + headers on welcome email)

---

## Dev 10: Infrastructure, Security & Database

**Status:** Complete
**Date:** 2026-04-12
**Files reviewed:** 30+ files — rate-limit.ts, report-otp.ts, report-session.ts, report-token.ts, contact API, report send-code/verify-code APIs, schema.sql, next.config.ts, middleware.ts, robots.ts, sitemap.ts, error.tsx, global-error.tsx, not-found.tsx, layout.tsx, utils.ts, eslint.config.mjs. Report pages, contact page, privacy, terms, FAQ, work-with-us. Header, Footer, FooterWrapper components.

### Issues Found: 11

| # | Severity | Issue | File(s) | Fixed? |
|---|----------|-------|---------|--------|
| 1 | **Critical** | RLS "service full access" policies on 7 tables granted unrestricted read/write via public anon key | `supabase/schema.sql` + live DB | ✅ Yes |
| 2 | **High** | No RLS on `rate_limits` table — anon key could read/write/delete rate limit records, bypassing all rate limiting | `supabase/schema.sql` + live DB | ✅ Yes |
| 3 | **Medium** | No security headers configured (HSTS, X-Frame-Options, CSP, etc.) | `next.config.ts` | ✅ Yes |
| 4 | **Medium** | Report verify-code returned distinct error messages for "not promoter" vs "wrong code" — leaked promoter email status | `src/app/api/report/[eventId]/verify-code/route.ts` | ✅ Yes |
| 5 | **Low** | `robots.txt` missing `/admin` and `/report` disallow rules | `src/app/robots.ts` | ✅ Yes |
| 6 | **Low** | Report send-code HTML email interpolated `event.name` without `escapeHtml()` | `src/app/api/report/[eventId]/send-code/route.ts` | ✅ Yes |
| 7 | **Low** | Report token verification used `===` instead of timing-safe comparison | `src/lib/report-token.ts` | ✅ Yes |
| 8 | **Low** | Duplicate `purchases` and `events` table definitions in schema.sql with stale columns and dangerous policies | `supabase/schema.sql` | ✅ Yes |
| 9 | **Low** | Missing index on `purchases.user_id` — multiple access-control queries filter by user_id | `supabase/schema.sql` + live DB | ✅ Yes |
| 10 | **Low** | Contact route created custom 429 response, losing `Retry-After` header from `rateLimit()` | `src/app/api/contact/route.ts` | ✅ Yes |
| 11 | **Low** | Duplicate unique indexes/constraints + non-partial unique constraint blocking repurchases | `supabase/schema.sql` + live DB | ✅ Yes |

### What Passed

- **Rate limiter atomicity:** `check_rate_limit` RPC uses `INSERT...ON CONFLICT DO UPDATE` with row-level locking — fully atomic. Window reset and count increment happen in a single statement.
- **Rate limiter fail-open:** On DB error, returns `null` (allows request). Correct design — avoids blocking users during outages.
- **Report OTP security:** HMAC-SHA256 derived, scoped to `eventId:email:hourTs`. 1-hour window with previous-window acceptance. Rate-limited at both IP (5/min) and email (3/hr) levels.
- **Report session JWT:** HS256-signed with `JWT_SECRET`, scoped to eventId+email, 30-day expiry. Cookie: HttpOnly, Secure, SameSite=lax.
- **No email enumeration:** send-code returns `{ success: true }` regardless of whether email is the promoter. verify-code now uses identical error messages (after fix).
- **Error boundaries:** Both `error.tsx` and `global-error.tsx` show generic messages. No stack traces, error messages, or internal details exposed. `console.error` runs client-side only in `useEffect`.
- **CSRF protection:** Middleware validates Origin header on all state-changing API requests. Webhooks and Inngest exempted correctly.
- **Middleware route protection:** `/account/*` requires auth, `/admin/*` requires admin cookie, auth pages redirect when logged in. `/reset-password` correctly excluded from redirect (recovery flow needs auth session).
- **Sitemap:** Only public pages listed. No admin, account, or API routes.
- **Static pages:** Privacy, terms, FAQ, work-with-us — all hardcoded server components. No user input, no injection risk.
- **Contact form:** Honeypot field (hidden `_gotcha`), rate-limited at 3/hr, forwards to Formspree. No sensitive data leakage.
- **Global layout:** JSON-LD structured data uses hardcoded values only. No user-controlled content in `dangerouslySetInnerHTML`.
- **Components:** Header/Footer/FooterWrapper — standard React components. External links use `rel="noopener noreferrer"`. No XSS vectors.

### Manual Steps Completed by Owner

1. ✅ Applied SQL migration to live DB: dropped 8 permissive RLS policies across 7 tables.
2. ✅ Enabled RLS on `rate_limits` table.
3. ✅ Created `idx_purchases_user_id` index.
4. ✅ Dropped 3 duplicate constraint-backed indexes, 1 redundant index, and 1 problematic non-partial unique constraint.
5. ✅ Dropped remaining `stripe_events` service full access policy.

### Files Changed

- `next.config.ts` — Issue 3 (added security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control)
- `src/app/robots.ts` — Issue 5 (added `/admin`, `/admin/`, `/report` to disallow list)
- `src/app/api/report/[eventId]/verify-code/route.ts` — Issue 4 (unified error messages to prevent promoter email enumeration)
- `src/app/api/report/[eventId]/send-code/route.ts` — Issue 6 (imported and applied `escapeHtml()` on `event.name` in HTML template)
- `src/lib/report-token.ts` — Issue 7 (switched to `crypto.timingSafeEqual` with length pre-check)
- `src/app/api/contact/route.ts` — Issue 10 (return `rateLimit()` response directly instead of creating custom 429)
- `supabase/schema.sql` — Issues 1, 2, 8, 9, 11 (removed permissive policies, added rate_limits RLS, removed duplicate definitions, added user_id index, updated to reflect live DB as of 2026-04-12)
