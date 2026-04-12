# Audit: PPV Checkout & Payment Verification

**Auditor:** Dev 2
**Status:** Complete
**Date started:** 2026-04-11
**Date completed:** 2026-04-11

---

## Scope

The full PPV purchase flow — from clicking "Buy" through Stripe Checkout to landing on the watch page with a valid session.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/ppv-checkout/route.ts`, `src/app/api/verify-payment/route.ts` |
| Pages | `src/app/payment-success/` |
| Lib | `src/lib/stripe.ts`, `src/lib/geo.ts`, `src/lib/promoter-rate.ts` |

### Cross-cutting files (read-only, for context)

| Type | Files |
|------|-------|
| Webhook | `src/app/api/webhooks/stripe/route.ts` — PPV upsert path (race condition analysis) |
| Session | `src/lib/session.ts` — JWT creation/verification for ppv_session cookie |
| Access | `src/lib/access.ts` — `getPpvDiscount()` subscription tier logic |

---

## Audit Plan

### Phase 1: Deep-Read & Catalog Issues
Go file-by-file through all 6 owned files, reading every line carefully. Document each issue with file, line number, severity, and suggested fix.

**Order (highest risk first):**
1. `src/app/api/verify-payment/route.ts` — Payment verification, double-claim protection, session cookie issuance, race with webhook, purchase deduplication.
2. `src/app/api/ppv-checkout/route.ts` — Price integrity, idempotency key, geo-restriction enforcement, Stripe session params, discount/coupon flow.
3. `src/lib/geo.ts` — IP spoofing, fail-open behavior, HTTP vs HTTPS for ip-api, cache poisoning.
4. `src/app/payment-success/page.tsx` — Client-side session_id handling, URL sharing, information leakage.
5. `src/lib/stripe.ts` — Secret key handling, null-safety, client-side key exposure.
6. `src/lib/promoter-rate.ts` — Tier boundary correctness, off-by-one errors.

### Phase 2: Cross-Cutting Checks
- **Price integrity:** ✅ Pass — Client `priceId` validated against DB `stripe_price_id`. Stripe resolves amount from its Price object. No client influence on charge.
- **Double-claim protection:** ✅ Pass — All 4 paths analyzed (verify-first, webhook-first, concurrent tabs, shared URL). Atomic `.is(null)` claim + 15-min grace + cookie verification. Only edge case is Issue 1 (d3 path: attacker visits before buyer while row exists with null claim).
- **Webhook race condition:** ✅ Pass — Both paths write compatible rows. Webhook preserves `session_claimed_at` (not in its upsert). `session_version` consistently 1. No data loss in any ordering.
- **Session cookie scope:** ✅ Pass — JWT HS256-signed, event-scoped, version-checked at both `check-purchase` and `generate-token`. Cookie: HttpOnly, Secure, SameSite=lax. Version mismatch (refund/revocation) denies access.
- **Geo bypass:** ⚠️ Known limitation — Geo only enforced at purchase time. VPN bypass is inherent to IP-based geo. Actionable findings remain Issues 2 (HTTP) and 5 (rate limit).
- **Discount integrity:** ✅ Pass — Entirely server-driven from verified subscription status. No client input influences coupon. `allow_promotion_codes` disabled when subscription discount applied. Coupon creation idempotent.

### Phase 3: Write Up Findings
Fill in the 8-item checklist. Document each issue using the issue template below.

### Phase 4: Implement Fixes
Critical → High → Medium → Low. Run `npx tsc --noEmit` after each fix.

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Stripe Checkout session creation — are all required params set (idempotency key, metadata, customer_email)? | ✅ Pass | Idempotency key: SHA-256 hash of user/IP + eventId + minute window. Metadata: eventId, eventName, user_id (when logged in). customer_email: set when no Stripe customer object. All present and correct. |
| 2 | Payment verification — is `payment_status` checked before granting access? | ✅ Pass | verify-payment checks `payment_status === 'paid' \|\| 'no_payment_required'` before any access granting. Webhook does the same check. |
| 3 | Double-claim protection — can the success URL be shared/replayed? | ✅ Pass | Well-designed: 15-min grace window for legitimate page refreshes. After grace, success response returned but NO cookies issued. Within grace, existing ppv_session cookie checked — only original buyer's browser gets cookies. |
| 4 | Purchase deduplication (session_claimed_at logic) | ⚠️ Attention | Mostly correct. Atomic conditional update (`.is('session_claimed_at', null)`) ensures only one concurrent request wins. However, narrow race condition exists where webhook inserts between verify-payment's SELECT and upsert, leaving `session_claimed_at` null despite cookies being issued (see Issue 1). |
| 5 | Geo-restriction enforcement and bypass prevention | ⚠️ Attention | Enforced at checkout time using IP geolocation, but `ip-api.com` is called over plaintext HTTP — a MITM could forge the response (see Issue 2). Also, geo is only checked at purchase time, not at watch time — VPN at checkout bypasses permanently. Fail-open on lookup failure is acceptable (avoids blocking legitimate users). |
| 6 | Price integrity — can the client influence the amount? | ✅ Pass | Client-submitted `priceId` is validated against `event.stripe_price_id` from the database. The charge amount is determined by Stripe's Price object, not by the client. No way for the client to influence the final amount. |
| 7 | Cookie issuance — is the ppv_session JWT correct and scoped? | ✅ Pass | JWT signed HS256 with JWT_SECRET. Claims: purchaseId, email, eventId, eventName, purchasedAt, expiresAt, sessionVersion. Cookie: HttpOnly, Secure (prod), SameSite=lax, expiry aligned with event replay window. Properly event-scoped. |
| 8 | Race condition between webhook and verify-payment (who writes first?) | ✅ Pass | Both use upsert on `stripe_payment_intent_id`. Webhook does NOT set `session_claimed_at` — leaves it for verify-payment to claim. verify-payment uses `ignoreDuplicates: true` so it won't overwrite webhook data. Webhook upsert updates existing rows but excludes `session_claimed_at` so it's preserved. Clean separation. |

---

## Issues Found

### Issue 1: Race condition — `session_claimed_at` not set when webhook inserts between verify-payment's SELECT and upsert

- **File:** `src/app/api/verify-payment/route.ts`
- **Line(s):** 93–193
- **Severity:** Low
- **Description:** A narrow race window exists between the `existingPurchase` SELECT (line 93) and the purchase upsert (line 178). The specific sequence:
  1. verify-payment SELECTs — no row exists (`existingPurchase = null`)
  2. Webhook fires and inserts the purchase row (with `session_claimed_at = null`)
  3. verify-payment issues cookies (line 149–159) — user has valid JWT
  4. verify-payment attempts upsert with `ignoreDuplicates: true` — silently skipped because webhook's row already exists
  5. Result: purchase row has `session_claimed_at = null` despite the buyer having valid cookies

  Consequence: if someone else obtains the success URL, they could visit it and "win" the conditional `.is('session_claimed_at', null)` update, receiving their own set of cookies. Both the original buyer and second visitor would have valid JWTs with `sessionVersion: 1`, breaking single-device enforcement.

  In practice, this requires: (a) the webhook to fire and complete within milliseconds of the SELECT, AND (b) a second party to have the Stripe checkout session ID. Both conditions are unlikely but theoretically possible.
- **Suggested fix:** After the upsert at line 178, do a follow-up UPDATE to set `session_claimed_at` if it's still null (handles the race case):
  ```typescript
  // Ensure session_claimed_at is set even if upsert was skipped (race with webhook)
  await supabase
    .from('purchases')
    .update({ session_claimed_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', deduplicationId)
    .is('session_claimed_at', null);
  ```
- **Fixed?** Yes — added a follow-up conditional UPDATE after the upsert (`ignoreDuplicates`) to set `session_claimed_at` when the webhook inserted between the SELECT and upsert. Uses `.is('session_claimed_at', null)` so it only fires in the race case.

---

### Issue 2: Geo-restriction uses plaintext HTTP for IP geolocation lookup

- **File:** `src/lib/geo.ts`
- **Line(s):** 90
- **Severity:** Medium
- **Description:** The `checkGeoRestriction()` function calls `http://ip-api.com/json/{ip}` over unencrypted HTTP. A network-level attacker (MITM) could intercept and forge the response to always return coordinates outside the blackout radius, bypassing the geo-restriction for any user on the same network. The `ip-api.com` free tier only supports HTTP; HTTPS requires a paid API key.
- **Suggested fix:** Switch to a geo-IP provider that supports HTTPS on its free tier (e.g., `ipapi.co`, `ipinfo.io`, or MaxMind GeoLite2). Alternatively, if ip-api.com is preferred, upgrade to their pro plan and use `https://pro.ip-api.com/json/{ip}?key=XXX`. Example swap:
  ```typescript
  // Before:
  const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(clientIp)}?fields=status,lat,lon`, { cache: 'no-store' });
  // After (using ipapi.co — free, HTTPS, 1k/day):
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, { cache: 'no-store' });
  ```
- **Fixed?** Yes — switched from `ip-api.com` (HTTP) to `ipapi.co` (HTTPS, free tier 1k/day). Updated response field names (`data.latitude`/`data.longitude` instead of `data.lat`/`data.lon`). Removed `data.status` check (ipapi.co uses HTTP status codes instead).

---

### Issue 3: ppv-checkout creates its own Stripe instance instead of using shared `stripeServer`

- **File:** `src/app/api/ppv-checkout/route.ts`
- **Line(s):** 9
- **Severity:** Low
- **Description:** ppv-checkout instantiates `new Stripe(process.env.STRIPE_SECRET_KEY!)` directly with a non-null assertion, while verify-payment and the webhook handler use the shared `stripeServer` from `src/lib/stripe.ts` (which includes a null-safety check and a warning). If `STRIPE_SECRET_KEY` is missing, ppv-checkout will throw an unhandled error at module load time, while verify-payment returns a graceful 500 with a helpful message.
- **Suggested fix:** Replace the direct instantiation with the shared import:
  ```typescript
  // Before:
  import Stripe from 'stripe';
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // After:
  import { stripeServer } from '@/lib/stripe';
  ```
  Add a null check at the top of POST, matching verify-payment's pattern.
- **Fixed?** Yes — replaced `new Stripe(process.env.STRIPE_SECRET_KEY!)` with `import { stripeServer } from '@/lib/stripe'`. Added null guard returning 500 with helpful message before the try block. All `stripe.` calls updated to `stripeServer.`. `Stripe` type import retained for type annotations.

---

### Issue 4: `PURCHASE_WINDOW_DAYS` and `REPLAY_WINDOW_DAYS` are inline constants across 7+ files

- **File:** `src/app/api/ppv-checkout/route.ts` (line 73), `src/app/api/verify-payment/route.ts` (line 78), plus 5 other files
- **Line(s):** Various
- **Severity:** Low
- **Description:** `REPLAY_WINDOW_DAYS = 4` is defined inline in 6 files (verify-payment, webhook, redeem-promo, recover-access, generate-token, watch page). `PURCHASE_WINDOW_DAYS = 2` is defined inline in ppv-checkout. These are different concepts (purchase cutoff vs replay access duration) but both are critical to the access model. If one file is updated and others are forgotten, access windows could become inconsistent — e.g., a user could be granted a 4-day replay window by verify-payment but be told the event expired after 2 days by another path.
- **Suggested fix:** Extract both constants to a shared config file (e.g., `src/lib/constants.ts` or add to an existing config) and import everywhere. This is noted in Dev 5's checklist as well — coordinate on the shared definition.
- **Fixed?** Deferred to Dev 5 — coordination note added to `dev-audits/ACCESS-CONTROL-SESSION-AUDIT.md` with full file list. Dev 5 owns the access control scope where most of these constants live. Once they create the shared file, Dev 2 will update ppv-checkout and verify-payment to import from it.

---

### Issue 5: ip-api.com rate limit (45 req/min) can disable blackout enforcement under load

- **File:** `src/lib/geo.ts`
- **Line(s):** 89–91
- **Severity:** Medium
- **Description:** `ip-api.com` enforces a 45 requests/minute rate limit on its free tier. The IP geolocation call uses `cache: 'no-store'`, so every request to the home page, live page, or ppv-checkout that involves a venue with a blackout zone triggers a fresh API call. On event day with hundreds of concurrent visitors, the 45/min limit will be exceeded quickly. Once rate-limited, `ip-api.com` returns a non-success response, which triggers the fail-open path (`{ blocked: false }`), effectively disabling all blackout enforcement during peak traffic — exactly when it matters most.
- **Suggested fix:** Add a short-lived per-IP cache (e.g., 5–10 minutes) so repeated requests from the same IP don't re-query the API. Example:
  ```typescript
  const ipCache = new Map<string, { result: GeoResult; expiresAt: number }>();
  const IP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  ```
  Alternatively, switching to a provider with higher rate limits or a local GeoIP database (MaxMind GeoLite2) would eliminate the dependency entirely.
- **Fixed?** Yes — added a per-IP in-memory cache (`ipGeoCache`) with 10-minute TTL and 500-entry max. Repeated requests from the same IP serve from cache instead of hitting the API. Combined with the Issue 2 fix (switching to ipapi.co with 1k/day limit), this dramatically reduces API calls on event day. Cache uses the same eviction pattern as the existing `geocodeCache`.

---

## Items That Pass (No Issues)

- **Price integrity:** Client-submitted `priceId` validated against `event.stripe_price_id` from the database (ppv-checkout lines 48–57). Stripe resolves the charge amount from the Price object. No client influence on amount.
- **Payment status verification:** Both verify-payment and webhook check `payment_status === 'paid' || 'no_payment_required'` before granting any access.
- **Double-claim (happy paths):** 15-minute grace window, atomic conditional update with `.is('session_claimed_at', null)`, and ppv_session cookie verification for re-claims. Shared URLs outside the grace window get a success response but no cookies.
- **JWT session:** HS256-signed with server-side `JWT_SECRET`. Claims correctly scoped to purchaseId + eventId + sessionVersion. Cookie is HttpOnly, Secure, SameSite=lax. Expiry aligned with event replay window (or 7-day fallback).
- **Webhook/verify-payment coexistence:** Clean separation — webhook writes the purchase row; verify-payment claims it via `session_claimed_at`. Upsert conflict resolution handles both orderings.
- **Rate limiting:** Both ppv-checkout and verify-payment enforce `rateLimit(req, key, 20)`.
- **Stripe metadata:** eventId, eventName, user_id all attached. Payment intent metadata captures IP and user-agent for Radar.
- **Promo code / discount handling:** `allow_promotion_codes` disabled when subscription discount is applied. Stripe doesn't allow both. Coupon creation is idempotent with try/catch for concurrent creation.
- **Purchase window enforcement:** ppv-checkout blocks purchases after `event.date + 2 days` (line 73–77).
- **Anonymous checkout:** Gracefully handles unauthenticated users — no user_id in metadata, no customer object, customer_email used for Radar scoring.
- **Geo fail-open design:** Every failure path in `checkGeoRestriction()` returns `{ blocked: false }` — avoids blocking legitimate users when geo lookup fails. Intentional and acceptable.
- **Geo IP extraction:** `getClientIp()` reads `x-forwarded-for` set by the edge proxy (Vercel/Cloudflare). Not spoofable by the user in production hosting.
- **Nominatim geocoding:** Uses HTTPS, `encodeURIComponent` on address, 24h TTL cache with max size eviction. User-Agent set per Nominatim ToS.
- **Geocode cache integrity:** In-memory `Map` keyed by DB-sourced `venueAddress` (admin-set). No user input enters cache keys — not poisonable.
- **Haversine formula:** Standard implementation, correct Earth radius (3958.8 mi). Math checked and correct.
- **Payment success page:** Pure client-side UI. `session_id` from URL is only sent to server-side verify-payment — no client-side access decisions. Event name rendered via JSX (auto-escaped, no XSS). Redirects use hardcoded paths (`/watch?event_id=...` or `/`). Error messages are generic. Timer cleanup prevents memory leaks. Shared success URLs show "success" UI but issue no cookies (server-enforced).
- **stripe.ts secret key handling:** `STRIPE_SECRET_KEY` via `process.env`, conditional instantiation, null-safe export. Publishable key correctly uses `NEXT_PUBLIC_` prefix. verify-payment null-checks `stripeServer` before use. No secret key leakage to client bundle (Next.js tree-shaking).
- **promoter-rate.ts tier boundaries:** All three functions (`getPromoterRate`, `getNextTierInfo`, `getTierLabel`) use identical boundary conditions. No gaps, no overlaps, no off-by-one errors. Pure display logic used only in admin page and promoter report — no payment integrity or access control implications.

---

## Summary

- **Total issues found:** 5
- **Critical:** 0
- **High:** 0
- **Medium:** 2 — both fixed (HTTP geo-IP → switched to HTTPS ipapi.co; rate limit → added per-IP cache)
- **Low:** 3 — 2 fixed (session_claimed_at race, inconsistent Stripe instance), 1 deferred to Dev 5 (inline constants)
- **Additional notes:** All phases complete. 4 of 5 issues fixed with passing `tsc`. Issue 4 (shared constants) deferred to Dev 5 with coordination note in their audit doc. The PPV checkout and payment verification flow is well-designed with solid price integrity, double-claim protection, session scoping, and discount integrity. The codebase shows careful handling of the Stripe → DB → JWT pipeline with proper race condition mitigation between webhook and verify-payment paths.
