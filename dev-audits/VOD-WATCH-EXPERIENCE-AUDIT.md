# Audit: VOD & Watch Experience

**Auditor:** Dev 7
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

The VOD catalog, watch page (all 3 access paths), CloudFront signed cookies, and the video player.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/checkout/route.ts` (VOD checkout), `src/app/api/save-session/route.ts`, `src/app/api/redeem-promo/route.ts` |
| Pages | `src/app/vod/`, `src/app/watch/page.tsx` |
| Components | `src/app/watch/SaveSession.tsx`, `src/app/watch/VodPlayer.tsx`, `src/app/vod/VodBuyButton.tsx`, `src/app/vod/VodContent.tsx` |
| Lib | `src/lib/cloudfront.ts`, `src/lib/vod.ts` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Watch page Path 0 (PPV replay by event_id), Path 1 (subscription), Path 2 (purchase_id), Path 3 (session_id) — ownership validation in each | ✅ | All paths verify buyer via user_id, email, or cookie email. Path 2 redirects to `/recover-access` if not owner. Path 3 checks email against Stripe session. Path 0 checks subscription + purchase + cookie. |
| 2 | CloudFront signed cookie generation — key rotation, expiry alignment, domain scoping | ✅ | HLS wildcard policy covers segments. Expiry aligned: PPV replays use actual window close time, subscribers/VOD default 6h. Cookies: HttpOnly, Secure, SameSite=none, scoped to `.boxstreamtv.com`. Private key from env var. |
| 3 | Can a user forge or manipulate `purchase_id` / `session_id` URL params to access others' content? | ✅ | `purchase_id` (Path 2): ownership checked via user_id + email match. Fails → redirect to `/recover-access`. `session_id` (Path 3): Stripe email matched against authenticated user or customer_email cookie. No access without ownership. |
| 4 | VOD checkout — same Stripe integrity checks as PPV (price, idempotency) | ⚠️ | Idempotency key ✅. Rate limiting ✅. But `priceId` from request body passed directly to Stripe with no validation — any recurring Stripe price ID would be accepted (Issue 1). |
| 5 | Promo code redemption — deduplication, case sensitivity, expiry | ✅ | Case-insensitive compare. Partial unique index `(email, event_id, amount_paid) WHERE amount_paid = 0` prevents duplicate redemptions. Rate limited at 5/window. Code from env var. |
| 6 | Save-session route — what data does it write? Can it be abused? | ✅ | Writes purchase row with product details from Stripe (not user-supplied). 15-min grace window prevents late-arriving attackers from displacing original buyer's cookies. Rate limited at 30/window. |
| 7 | S3 key exposure — is the raw key ever leaked to the client? | ✅ | S3 keys stored server-side only. Client receives CloudFront signed URLs (`https://cf-domain/key`). Raw key never in HTML, props, or API responses. |

---

## Issues Found

### Issue 1: VOD checkout `priceId` not validated

- **File:** `src/app/api/checkout/route.ts`
- **Line(s):** 14–15
- **Severity:** Medium
- **Description:** `priceId` from the request body is passed directly to `stripe.checkout.sessions.create` with no validation. Unlike the subscribe route (fixed by Dev 4 with a `VALID_PRICE_IDS` allowlist), any valid Stripe price ID — including non-VOD prices or recurring subscription prices — would be accepted. A malicious user could purchase unintended products through this endpoint.
- **Suggested fix:** Validate `priceId` by retrieving the associated product from Stripe and checking that it has `metadata.site === 'boxstreamtv'` and a valid `metadata.s3_key` (confirming it's a VOD product).
- **Fixed?** Yes

### Issue 2: Watch page Path 3 upsert missing fields

- **File:** `src/app/watch/page.tsx`
- **Line(s):** ~244–257 (Path 3 inline upsert)
- **Severity:** Medium
- **Description:** When Path 3 writes a purchase row to Supabase (first-visit caching), it omits `stripe_payment_intent_id`, `user_id`, `session_claimed_at`, and `session_version`. This means: (a) the `charge.refunded` webhook won't find the row via payment_intent lookup, (b) user_id ownership won't match for logged-in buyers until save-session runs, (c) session_version defaults to DB default but isn't explicitly set. The save-session route writes these fields correctly, but there's a race where watch/page.tsx's upsert wins and save-session's upsert becomes a no-op (onConflict: stripe_session_id).
- **Suggested fix:** Add `stripe_payment_intent_id`, `user_id`, `session_claimed_at`, and `session_version` to the Path 3 upsert to match save-session's row shape.
- **Fixed?** Yes

### Issue 3: Unsafe `new Stripe(process.env.STRIPE_SECRET_KEY!)` in 4 files

- **File:** `src/app/watch/page.tsx`, `src/lib/vod.ts`, `src/app/api/checkout/route.ts`, `src/app/api/save-session/route.ts`
- **Line(s):** Line 14, Line 32, Line 7, Line 7 respectively
- **Severity:** Low
- **Description:** All 4 files instantiate their own Stripe client with `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of using the shared null-safe `stripeServer` from `src/lib/stripe.ts`. The `!` non-null assertion produces a cryptic runtime error if the env var is missing. This same pattern was already fixed in 8+ files by Devs 2, 3, 4, and 6.
- **Suggested fix:** Replace with `import { stripeServer } from '@/lib/stripe'` + null guard returning 500.
- **Fixed?** Yes

### Issue 4: Checkout error leaks Stripe internals

- **File:** `src/app/api/checkout/route.ts`
- **Line(s):** 57–60
- **Severity:** Low
- **Description:** The catch block returns `error.message` to the client, which may contain Stripe SDK internals (API key prefixes, rate limit details, etc.). Dev 4 fixed this same pattern in the subscribe route.
- **Suggested fix:** Return a generic error message: `'Checkout failed. Please try again.'`
- **Fixed?** Yes

### Issue 5: Email normalization inconsistency

- **File:** `src/app/watch/page.tsx` (Path 2, line ~161), `src/app/vod/page.tsx` (getOwnedProducts), `src/app/api/save-session/route.ts` (line ~51)
- **Line(s):** Multiple
- **Severity:** Low
- **Description:** Several ownership checks use raw `.toLowerCase()` or `.toLowerCase().trim()` instead of the shared `normalizeEmail()` utility. While `normalizeEmail` currently does the same thing (trim + lowercase), using the shared function ensures consistency if normalization logic is ever extended (e.g., Gmail dot-stripping, alias handling). Dev 5 fixed this same inconsistency in `generate-token`.
- **Suggested fix:** Replace `.toLowerCase()` / `.toLowerCase().trim()` with `normalizeEmail()` in ownership checks.
- **Fixed?** Yes

---

## What Passed

- **CloudFront signed cookies:** Properly scoped (HLS wildcard, `.boxstreamtv.com` domain, HttpOnly/Secure/SameSite=none), expiry aligned with content window (PPV replays use actual window close; subscribers/VOD default 6h). Private key from env var, never exposed.
- **Ownership validation (all paths):** Path 0 checks subscription + purchase (user_id, email, cookie). Path 1 checks subscription tier. Path 2 validates user_id or email match, redirects to `/recover-access` on failure. Path 3 validates Stripe session email against auth user or cookie. All paths check `expires_at` where applicable.
- **S3 key exposure:** Raw S3 keys stored server-side only. Client receives CloudFront signed URLs. S3 key never appears in HTML, component props, or API responses.
- **Promo code redemption:** Case-insensitive compare. Partial unique index prevents duplicate redemptions. Rate limited. Atomic upsert with `ignoreDuplicates`.
- **Save-session write integrity:** Writes product details from Stripe API (not user-supplied). 15-min claim grace window prevents session hijacking. Payment status verified before writing.
- **Save-session cookie management:** `vod_sessions` array cookie + legacy `vod_session` migration. Customer email cookie set with 7-day TTL covering replay window.
- **VodPlayer error handling:** Distinguishes expired signed URLs from network errors using `expiresAt` comparison. Appropriate recovery UI for each case.
- **VodBuyButton:** FightPassPrompt shown once before checkout for non-subscribers. No security-relevant logic.
- **VodContent:** Pure UI component. Watchlist uses authenticated Supabase client with optimistic rollback. No security concerns.
- **VOD checkout idempotency:** SHA256 key from user/IP + priceId + minute window. Rate limited at 20/window.
- **redeem-promo:** Input validation (code required, email format check). Event must be active. Rate limited at 5/window. Creates PPV session via `createSession()`.
- **cloudfront.ts:** Wildcard policy for HLS segments. No raw key in return value. Key pair ID from env var.
- **vod.ts:** Products filtered by `metadata.site === 'boxstreamtv'`. Sort order from metadata. Event grouping logic correct.

---

## Summary

- **Total issues found:** 5
- **Critical:** 0
- **High:** 0
- **Medium:** 2
- **Low:** 3
- **Additional notes:** No non-code changes required. All issues are code-level fixes.
