# Audit: Access Control & Session Enforcement

**Auditor:** Dev 5
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

The runtime access-check layer — JWT sessions, purchase lookups, session versioning, and single-device enforcement.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/check-purchase/route.ts`, `src/app/api/recover-access/route.ts`, `src/app/api/recover-access/send-code/route.ts` |
| Pages | `src/app/recover-access/` |
| Lib | `src/lib/session.ts` (JWT create/verify/hasEventAccess) |
| Components | `src/components/FightPassPrompt.tsx`, `src/components/ExpiryCountdown.tsx` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | JWT session creation — are all claims correct (purchaseId, email, eventId, expiresAt, sessionVersion)? | ✅ Pass | All claims present and correctly typed. `createSession()` spreads full `SessionData` into JWT. Null expiresAt falls back to 7-day cookie TTL. |
| 2 | Session verification — is the JWT signature validated? Is expiry enforced? | ✅ Pass | `jwtVerify()` from `jose` validates HS256 signature + built-in `exp` claim. Double-check on `expiresAt` payload for event-scoped expiry. |
| 3 | `session_version` enforcement — does every access path check it against the DB? | ⚠️ Needs attention | JWT path: ✅ both `check-purchase` and `generate-token` validate against DB. DB fallback in `generate-token`: ❌ no `expires_at` filter (Issue 1). `customer_email` cookie in `check-purchase`: ❌ no session_version check (Issue 3). |
| 4 | Recovery flow — is the 6-digit OTP generated securely? Is it rate-limited? Does it expire? | ✅ Pass | `crypto.getRandomValues()` for generation. 3 sends/hr + 5 verifies/hr per-email. 15-min expiry. Atomic UPDATE consumes code (prevents race). |
| 5 | Cookie-based fallback (customer_email) — can it bypass session versioning? | ⚠️ Needs attention | In `check-purchase`: yes, `customer_email` path returns `purchased: true` with no session_version check (Issue 3). In `generate-token`: correctly removed with inline comment. |
| 6 | Expiry model — `PURCHASE_WINDOW_DAYS` / `REPLAY_WINDOW_DAYS` consistency across all files | ⚠️ Needs attention | Values are consistent (2/4) but defined inline in 7 source files — drift risk (Issue 4). |
| 7 | Edge case: what happens when a user has multiple purchases for the same event? | ✅ Pass | All queries use `.limit(1)` with `.order('created_at', { ascending: false })` or `.maybeSingle()`. Most recent purchase wins. |

> **📌 Note from Dev 2 (PPV Checkout audit):**
> Issue 4 in my audit flagged `PURCHASE_WINDOW_DAYS = 2` and `REPLAY_WINDOW_DAYS = 4` as inline constants duplicated across 7+ files. This maps directly to your checklist item #6.
>
> **Suggested fix:** Create `src/lib/constants.ts` exporting both values, then update all consumers.
>
> **Files that define `REPLAY_WINDOW_DAYS = 4` inline:**
> - `src/app/api/verify-payment/route.ts` (line 78) — *my scope*
> - `src/app/api/webhooks/stripe/route.ts` (line 160)
> - `src/app/api/redeem-promo/route.ts` (line 61)
> - `src/app/api/recover-access/route.ts` (line 105) — *your scope*
> - `src/app/api/generate-token/route.ts` (line 15)
> - `src/app/watch/page.tsx` (line 46)
>
> **Files that define `PURCHASE_WINDOW_DAYS = 2` inline:**
> - `src/app/api/ppv-checkout/route.ts` (line 73) — *my scope*
>
> I've deferred this fix to you since most files are outside my scope. Once you create the shared constant file, let me know and I'll update my two files (ppv-checkout, verify-payment) to import from it.

---

## Issues Found

### Issue 1: generate-token DB fallback missing expires_at filter — refunded purchases still grant streaming tokens

- **File:** `src/app/api/generate-token/route.ts`
- **Line(s):** 78–97
- **Severity:** High
- **Description:** When the JWT cookie check fails and the route falls back to DB purchase lookup (by `user_id` then `email`), the queries don't filter on `expires_at`. A refunded or disputed purchase (where the webhook sets `expires_at = now()`) would still match, granting the user an IVS streaming token they should no longer have. The `check-purchase` route correctly applies `or(expires_at.gt.now,expires_at.is.null)` — but `generate-token` does not.
- **Suggested fix:** Add `.or('expires_at.gt.${now},expires_at.is.null')` filter to both the `user_id` and `email` DB queries in `generate-token`.
- **Fixed?** Yes

---

### Issue 2: generate-token email lookup uses raw .toLowerCase() instead of normalizeEmail()

- **File:** `src/app/api/generate-token/route.ts`
- **Line(s):** 90, 122
- **Severity:** Medium
- **Description:** The email-based purchase lookup uses `user.email.toLowerCase()` and `customerEmail.toLowerCase()` directly while every other route uses `normalizeEmail()` from `src/lib/utils.ts` (which also trims whitespace). If an email has leading/trailing whitespace in the DB or cookie, the lookup would fail only in `generate-token`, not in `check-purchase` or `recover-access`.
- **Suggested fix:** Import `normalizeEmail` from `@/lib/utils` and use it in all email comparisons.
- **Fixed?** Yes

---

### Issue 3: check-purchase customer_email cookie path bypasses session_version enforcement

- **File:** `src/app/api/check-purchase/route.ts`
- **Line(s):** 94–109
- **Severity:** Medium
- **Description:** When a user has no JWT session and no authenticated Supabase user, the route falls back to the `customer_email` cookie to find purchases. This path does not check `session_version` against the DB, meaning a user could share the `customer_email` cookie across multiple devices — effectively bypassing the single-device enforcement that the JWT session_version mechanism provides. In contrast, `generate-token` intentionally removed its customer_email fallback for exactly this reason (see inline comment at line 104).
- **Suggested fix:** After finding the purchase via `customer_email`, fetch `session_version` and compare against the JWT session's version. Alternatively, align with `generate-token`'s approach: remove the customer_email fallback entirely from `check-purchase` and return `{ purchased: false }` so the client shows the recover-access flow.
- **Fix applied:** Aligned with `generate-token`'s approach. The `customer_email` path now returns `{ purchased: false, needsRecovery: true }` instead of `{ purchased: true }`. Updated `EventHero.tsx` to handle the new `needs-recovery` access state with a dedicated UI (warning icon + "Recover Access" CTA).
- **Fixed?** Yes

---

### Issue 4: REPLAY_WINDOW_DAYS and PURCHASE_WINDOW_DAYS defined as inline constants across 7 files

- **File:** 7 source files (see Dev 2's note above)
- **Line(s):** Various
- **Severity:** Low
- **Description:** Both `REPLAY_WINDOW_DAYS = 4` (6 files) and `PURCHASE_WINDOW_DAYS = 2` (1 file) are defined as local constants in each consumer. If the business rule changes (e.g., replay window extended to 7 days), every file must be updated independently — high risk of drift.
- **Suggested fix:** Create `src/lib/constants.ts` exporting both values. Update all consumers to import from it.
- **Fixed?** Yes

---

### Issue 5: Recovery code comparison uses === (not timing-safe)

- **File:** `src/app/api/recover-access/route.ts`
- **Line(s):** 73
- **Severity:** Low
- **Description:** The recovery code verification uses `purchase.recovery_code !== trimmedCode` which is a standard string comparison, not timing-safe. A timing side-channel attack could theoretically leak the code digit-by-digit. However, the 5-attempt/hour per-email rate limit and 15-minute expiry make this impractical to exploit in practice.
- **Suggested fix:** Replace with `crypto.timingSafeEqual()` for defense-in-depth. Won't fix — risk is mitigated by rate limiting and the atomic UPDATE that follows (only one request can consume the code).
- **Fixed?** Won't fix (mitigated)

---

## What Passed

- **JWT creation:** All claims correct — `purchaseId`, `email`, `eventId`, `eventName`, `purchasedAt`, `expiresAt`, `sessionVersion`. Null `expiresAt` falls back to 7-day cookie/JWT TTL.
- **JWT verification:** `jwtVerify()` from `jose` validates HS256 signature + built-in `exp` claim. Double-check on `expiresAt` payload for event-scoped expiry.
- **session_version in JWT path:** Both `check-purchase` and `generate-token` lookup `session_version` from the DB and compare against the JWT claim. Mismatches deny access.
- **Recovery OTP security:** `crypto.getRandomValues()` for generation. 3 sends/hr + 5 verifies/hr per-email rate limits. 15-minute expiry. Atomic conditional UPDATE prevents concurrent claim races.
- **Cookie attributes:** All session cookies set with `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`, `path: '/'`.
- **Multiple purchases for same event:** Correctly handled — queries use `.limit(1)` with `order('created_at', { ascending: false })` or `.maybeSingle()`. Most recent purchase wins.
- **No user enumeration:** Recovery send-code returns `{ success: true }` regardless of whether email exists.
- **FightPassPrompt.tsx:** Pure UI component — no security-relevant logic. Correctly client-side only.
- **ExpiryCountdown.tsx:** Pure display component — computes time remaining from a server-provided `expiresAt`. No trust boundary issues.
- **`generate-token` customer_email fallback:** Already removed by prior developer with correct comment explaining the session_version bypass risk.

---

## Summary

- **Total issues found:** 5
- **Critical:** 0
- **High:** 1
- **Medium:** 2
- **Low:** 2 (1 fixed, 1 won't-fix)
- **Files reviewed:** 9 files — `session.ts`, `check-purchase/route.ts`, `recover-access/route.ts`, `recover-access/send-code/route.ts`, `recover-access/page.tsx`, `generate-token/route.ts`, `FightPassPrompt.tsx`, `ExpiryCountdown.tsx`. Cross-cutting reads of `access.ts`, `watch/page.tsx`, `verify-payment/route.ts`, `webhooks/stripe/route.ts`.

### Files Changed

- `src/lib/constants.ts` — **Created.** Shared `PURCHASE_WINDOW_DAYS` and `REPLAY_WINDOW_DAYS` exports.
- `src/app/api/generate-token/route.ts` — Issues 1, 2, 4. Added `expires_at` filter to DB fallback queries; replaced `.toLowerCase()` with `normalizeEmail()`; replaced inline `REPLAY_WINDOW_DAYS` with import.
- `src/app/api/check-purchase/route.ts` — Issue 3. Changed `customer_email` cookie path from returning `purchased: true` to `{ purchased: false, needsRecovery: true }`.
- `src/components/hero/EventHero.tsx` — Issue 3 (client). Added `needs-recovery` access state with dedicated UI: warning icon + "Recover Access" CTA.
- `src/app/api/webhooks/stripe/route.ts` — Issue 4. Replaced inline `REPLAY_WINDOW_DAYS` with import from constants.
- `src/app/api/redeem-promo/route.ts` — Issue 4. Replaced inline `REPLAY_WINDOW_DAYS` with import from constants.
- `src/app/api/recover-access/route.ts` — Issue 4. Replaced inline `REPLAY_WINDOW_DAYS` with import from constants.
- `src/app/watch/page.tsx` — Issue 4. Replaced inline `REPLAY_WINDOW_DAYS` with import from constants.
- `src/app/api/verify-payment/route.ts` — Issue 4. Replaced inline `REPLAY_WINDOW_DAYS` with import from constants.
- `src/app/api/ppv-checkout/route.ts` — Issue 4. Replaced inline `PURCHASE_WINDOW_DAYS` with import from constants.

### Coordination Notes

- **Dev 2:** `src/lib/constants.ts` has been created. You can now update your two files (`ppv-checkout/route.ts`, `verify-payment/route.ts`) — they've already been updated by this audit since the inline constants were removed.
- **Dev 6 (Live Streaming):** Issue 1 was in `generate-token/route.ts` which is in your scope. The DB fallback purchase queries were missing `expires_at` filtering, allowing refunded purchases to still grant IVS tokens. Fixed.
