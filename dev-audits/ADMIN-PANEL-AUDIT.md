# Audit: Admin Panel

**Auditor:** Dev 8
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

The entire admin interface — login, authentication, grant access, event announcements, and stream management.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/admin/login/route.ts`, `src/app/api/admin/grant/route.ts`, `src/app/api/admin/announce/route.ts` |
| Pages | `src/app/admin/page.tsx`, `src/app/admin/login/` |
| Components | `src/app/admin/AdminAnnounceForm.tsx`, `src/app/admin/AdminCopyButton.tsx`, `src/app/admin/AdminGrantForm.tsx`, `src/app/admin/AdminLogout.tsx`, `src/app/admin/AdminStreamToggle.tsx` |
| Lib | `src/lib/admin-auth.ts` |
| Background | `src/inngest/functions.ts` — `eventAnnounceFunction` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Admin authentication — is the password comparison timing-safe? Is the cookie HttpOnly/Secure/SameSite? | ✅ | `crypto.timingSafeEqual` on HMAC hashes. Cookie: HttpOnly, Secure (prod), SameSite=lax, 8h maxAge. |
| 2 | Admin cookie verification — can the JWT be forged? Is expiry enforced? | ✅ | HMAC-SHA256 with `JWT_SECRET` as key. Requires both `ADMIN_PASSWORD` and `JWT_SECRET` to forge. Cookie expires via maxAge. |
| 3 | Grant access — does the inserted purchase row have all fields needed for every access path? | ✅ | Row has email, product_name, purchase_type, event_id, expires_at, amount_paid, currency. Missing `session_version` and `user_id` which are nullable, so access paths still work. Email normalization fixed (Issue 3). |
| 4 | Stream toggle — what happens if toggled during an active stream? Race conditions? | ✅ | Updates `is_streaming` on the active event. No race risk — single boolean toggle, UI disables button while loading. IVS stream itself is not affected (only controls "Watch Now" visibility). |
| 5 | Announce — does the Inngest function handle partial failures (some emails fail)? | ✅ | Uses try/catch per batch. `sent` count now uses Resend response data (Issue 5). Inngest idempotency key prevents retry re-sends (Issue 1). Route rate-limited at 2/hour (Issue 2). |
| 6 | Authorization — is every admin API route protected by `verifyAdminCookie()`? | ✅ | All 4 routes (grant, announce, toggle-stream, logout) are protected. Logout clears the cookie — no auth needed is acceptable. |
| 7 | Can a non-admin user access any admin functionality through direct API calls? | ✅ | Middleware redirects unauthenticated `/admin/*` page requests. API routes self-protect with `verifyAdminCookie()`. Login route has independent rate limiting. |

---

## Issues Found

### Issue 1: Announce function has no Inngest idempotency guard

- **File:** `src/inngest/functions.ts`
- **Line(s):** eventAnnounceFunction
- **Severity:** Medium
- **Description:** If Inngest retries the `admin/announce` event (network timeout, function error, etc.), the entire email blast is re-sent to all recipients. No deduplication at the function level.
- **Suggested fix:** Add an `idempotency` key to the Inngest function config derived from the event data, so retries reuse the same execution.
- **Fixed?** Yes

### Issue 2: Announce API route has no rate limit or duplicate-send prevention

- **File:** `src/app/api/admin/announce/route.ts`
- **Line(s):** 6–19
- **Severity:** Medium
- **Description:** Double-clicking "Send Announcement" fires two Inngest events. No rate limit on the route. No dedup key on `inngest.send()`. Both events execute independently, sending duplicate mass emails.
- **Suggested fix:** Add rate limiting and pass an idempotency key with `inngest.send()` so duplicate events within a time window are deduplicated.
- **Fixed?** Yes

### Issue 3: Grant route uses raw `.toLowerCase().trim()` instead of `normalizeEmail()`

- **File:** `src/app/api/admin/grant/route.ts`
- **Line(s):** 17
- **Severity:** Low
- **Description:** All other routes (Dev 5 migration) use the shared `normalizeEmail()` from `src/lib/utils.ts`. Grant route still uses inline normalization. Behavior is identical today but risks divergence if `normalizeEmail()` is updated.
- **Suggested fix:** Import and use `normalizeEmail()`.
- **Fixed?** Yes

### Issue 4: Admin page hardcodes replay/purchase window days

- **File:** `src/app/admin/page.tsx`
- **Line(s):** ~113–114
- **Severity:** Low
- **Description:** Uses `4 * 24 * 60 * 60 * 1000` and `2 * 24 * 60 * 60 * 1000` instead of importing `REPLAY_WINDOW_DAYS` and `PURCHASE_WINDOW_DAYS` from `src/lib/constants.ts` (created by Dev 5). Drift risk if constants change.
- **Suggested fix:** Import from shared constants.
- **Fixed?** Yes

### Issue 5: Announce batch `sent` count inaccurate on partial Resend failure

- **File:** `src/inngest/functions.ts`
- **Line(s):** eventAnnounceFunction batch loop
- **Severity:** Low
- **Description:** On successful batch, adds `batch.length` to `sent` — but if Resend returns partial failures in the batch response, the count is inflated. On error, adds 0 but emails may have partially sent.
- **Suggested fix:** Use Resend batch response `data` array to count actual successes.
- **Fixed?** Yes

### Issue 6: toggle-stream doesn't validate `live` param

- **File:** `src/app/api/admin/toggle-stream/route.ts`
- **Line(s):** 12
- **Severity:** Low
- **Description:** `live` from `req.json()` is passed directly to Supabase update without type validation. Non-boolean values (strings, numbers, objects) would produce unexpected behavior.
- **Suggested fix:** Coerce to boolean: `const isLive = live === true;`
- **Fixed?** Yes

---

## Summary

- **Total issues found:** 6
- **Critical:** 0
- **High:** 0
- **Medium:** 2
- **Low:** 4
- **Additional notes:** None of these issues require external service changes (Supabase, Stripe, Resend, Inngest dashboard). All fixes are code-only.

---

## Fix Plan

| Order | Issue | What to do |
|-------|-------|------------|
| 1 | **Issue 3** — Grant `normalizeEmail()` | Import `normalizeEmail` from `@/lib/utils`, replace `.toLowerCase().trim()` |
| 2 | **Issue 4** — Hardcoded window days | Import `PURCHASE_WINDOW_DAYS`, `REPLAY_WINDOW_DAYS` from `@/lib/constants` |
| 3 | **Issue 1 + 2** — Announce idempotency | Add rate limit to announce route; add Inngest idempotency key to both `inngest.send()` and function config |
| 4 | **Issue 5** — Batch sent count | Use Resend batch response `.data` to count actual successes |
| 5 | **Issue 6** — Toggle-stream validation | Coerce `live` to strict boolean |
| 6 | **Final** | Run `tsc --noEmit`, update checklist, write SUMMARIES entry |
