# BoxStreamTV — Bug & Security Audit

_Audited: 2026-04-11_

---

## Critical

### 1. Admin "Grant Access" creates purchases with no `event_id` — granted access is invisible to all access checks
- **File:** `src/app/api/admin/grant/route.ts:19-26`
- The grant route inserts a purchase row without `event_id`. Every access check in the app (check-purchase, generate-token, watch page) filters by `.eq('event_id', ...)`. Admin-granted comps are dead rows — comp'd users are locked out of the event.
- **Fix:** Accept `eventId` in the grant form and include it in the insert. For VOD grants, accept `s3_key` and `stripe_product_id` so the VOD watch path can find the row.

---

### 2. `check-purchase` session validation skips JWT entirely when `expiresAt` is null
- **File:** `src/app/api/check-purchase/route.ts:25`
- The condition `session.expiresAt && new Date(session.expiresAt) > new Date()` short-circuits to `false` when `expiresAt` is null (events without a set date). The entire JWT session branch is skipped, including `session_version` enforcement, falling through to DB lookups that don't validate session version.
- **Impact:** For events without a fixed date, single-concurrent-viewer enforcement is bypassed. A shared/stolen JWT token is never invalidated.
- **Fix:** Treat null `expiresAt` as "still valid" — change to `(!session.expiresAt || new Date(session.expiresAt) > new Date())`.

---

### 3. Schema missing UNIQUE constraints required by all upsert operations
- **File:** `supabase/schema.sql`
- The schema defines regular indexes on `stripe_session_id`, `stripe_payment_intent_id`, `stripe_subscription_id` — but all upserts use `onConflict` against these columns, which requires UNIQUE constraints. Bootstrapping a new environment from this schema will break every payment flow, subscription sync, and promo redemption.
- **Fix:** Change the indexes to `CREATE UNIQUE INDEX` for: `stripe_session_id`, `stripe_payment_intent_id`, `stripe_subscription_id`, and add a composite unique on `(email, event_id, amount_paid)` for promo redemption.

---

### 4. `recover-access` puts DB row UUID into `purchaseId` but `check-purchase` looks up by `stripe_payment_intent_id`
- **File:** `src/app/api/recover-access/route.ts:111` → `src/app/api/check-purchase/route.ts:27`
- Recovery creates a session JWT with `purchaseId: purchase.id` (Supabase UUID). But `check-purchase` uses that value to query `.eq('stripe_payment_intent_id', session.purchaseId)` — which will never match. Session version enforcement is bypassed after recovery. Access only works because of fallback email/user lookups.
- **Fix:** Store `purchase.stripe_payment_intent_id` (or the relevant key) in the session JWT, not `purchase.id`. Also select it from the purchases query.

---

## High

### 5. `reactivate-subscription` passes invalid type to Stripe API
- **File:** `src/app/api/reactivate-subscription/route.ts:41-44`
- `cancel_at: '' as unknown as number` sends an empty string where Stripe expects `number | null`. Current SDK may accept it; newer versions may throw a client-side validation error.
- **Impact:** Users who canceled via Stripe portal (which uses `cancel_at` instead of `cancel_at_period_end`) may be unable to reactivate.
- **Fix:** Use `cancel_at: null` instead of `'' as unknown as number`.

---

### 6. In-memory rate limiter is ineffective in serverless deployments
- **File:** `src/lib/rate-limit.ts`
- `new Map<string, RateLimitEntry>()` is in-module scope. On Vercel, each cold start gets a fresh Map, and concurrent function instances have separate Maps. Rate limits provide zero protection in production.
- **Impact:** Admin login brute-force protection (3 attempts/30 min) and recover-access rate limit (5/hour) are both bypassable.
- **Fix:** Use Vercel KV, Upstash Redis, or Supabase-backed rate limiting.

---

### 7. Admin login timing comparison leaks password length
- **File:** `src/app/api/admin/login/route.ts:19-21`
- `inputBuf.length === expectedBuf.length` short-circuits before `timingSafeEqual`. An attacker can determine password length by measuring response timing. Combined with the broken rate limiter (#6), this is exploitable.
- **Fix:** Hash both inputs with HMAC before comparing so comparison is always on fixed-length buffers.

---

### 8. Announce route iterates entire auth.users table with no pagination guard
- **File:** `src/app/api/admin/announce/route.ts:46-56`
- Loops through `auth.admin.listUsers({ page, perPage: 1000 })` loading all users into memory. For each user, checks against subscriptions with O(users × subscriptions) complexity. Will OOM or timeout on Vercel as the user base grows past a few thousand.
- **Fix:** Move announcement to an Inngest background function. Or query subscriptions table directly (it already has `user_id`) instead of iterating all auth users.

---

## Medium

### 9. `account/page.tsx` and `purchases/page.tsx` use unsanitized email in `.or()` filter string
- **File:** `src/app/account/page.tsx:15`, `src/app/account/purchases/page.tsx:17`
- `.or(\`user_id.eq.${user.id},email.eq.${user.email}\`)` — if `user.email` contains commas (valid in quoted email local parts), the PostgREST filter is split incorrectly, potentially returning other users' data or erroring.
- **Fix:** Use separate `.or()` with parameterized filter builders, or filter with two separate queries and merge.

---

### 10. `customer_email` cookie has 1-year lifetime with no session versioning on cookie-based access
- **File:** Multiple — `verify-payment/route.ts`, `recover-access/route.ts`, `check-purchase/route.ts:100-115`, `watch/page.tsx`
- The `customer_email` cookie is set with `maxAge: 1 year`. Cookie-based purchase lookups (for unauthenticated users) don't check `session_version`. Anyone with physical access to the browser (shared computer) can access content for a full year.
- **Fix:** Reduce cookie lifetime to match the replay window, or require session version validation on cookie-based lookups too.

---

### 11. Watch page Path 3 makes a Stripe API call on every page load
- **File:** `src/app/watch/page.tsx:190-194`
- `stripe.checkout.sessions.retrieve(sessionId, { expand: [...] })` is called on every page load/refresh for session-based VOD viewers. Stripe rate limits to 100 reads/sec in live mode. Also doesn't validate ownership before the API call — any valid session_id triggers a Stripe call.
- **Fix:** Cache the session data in Supabase after first retrieval, or redirect session-based viewers to the purchase_id path after first load.

---

### 12. `generate-token` only checks `is_active` events — deactivating an event kills replay access
- **File:** `src/app/api/generate-token/route.ts:15-20`
- Token generation queries `.eq('is_active', true)`. If admin deactivates event A to set up event B while event A's 4-day replay window is still open, all event A buyers lose live-stream access immediately.
- **Fix:** Also check by event_id if provided, or keep events active until replay window closes.

---

## Recommended Fix Order

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | #1 — Admin grant missing `event_id` | Small |
| 2 | #2 — Session validation null bypass | Small |
| 3 | #4 — Recovery session ID mismatch | Small |
| 4 | #5 — Reactivate subscription type cast | Trivial |
| 5 | #3 — Schema unique constraints | Small |
| 6 | #7 — Admin login timing leak | Small |
| 7 | #6 — In-memory rate limiter | Medium |
| 8 | #9 — Filter injection in .or() | Small |
| 9 | #10 — Stale customer_email cookie | Small |
| 10 | #12 — generate-token active-only check | Small |
| 11 | #8 — Announce pagination bomb | Medium |
| 12 | #11 — Stripe API call per page load | Medium |