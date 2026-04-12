# Audit: Infrastructure, Security & Database

**Auditor:** Dev 10
**Status:** Complete
**Date completed:** 2026-04-12

---

## Scope

Cross-cutting concerns — rate limiting, database schema, RLS policies, error handling, reporting, and static/legal pages.

### Files to review

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

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Rate limiter — is the Supabase RPC atomic? Can it be bypassed by rotating IPs? Should there be a global fallback? | ✅ Pass | `check_rate_limit` uses atomic INSERT...ON CONFLICT with row-level locking. IP rotation is inherent to any IP-based scheme; mitigated by per-email secondary limits on sensitive routes. Fails open (correct — avoids blocking users on DB errors). |
| 2 | Schema — do all UNIQUE constraints, indexes, and foreign keys match what the app expects? | ⚠️ Fixed | Missing `idx_purchases_user_id` index added. Duplicate constraints/indexes cleaned up. Non-partial `uq_purchases_email_event_amount` removed (blocked repurchases). |
| 3 | RLS policies — are they restrictive enough? Does the service-role client bypass them correctly? | ❌ Fixed | **Critical:** 7 tables had `FOR ALL USING (true)` "service full access" policies granting unrestricted writes via anon key. All removed — service role bypasses RLS by design. `rate_limits` had no RLS at all — enabled. |
| 4 | Report flow (OTP-based piracy reporting) — is it rate-limited? Can it be used for email enumeration? | ⚠️ Fixed | Rate-limited (5/min IP + 3/hr email). No email enumeration (always returns `{ success: true }`). Fixed: verify-code leaked promoter status via distinct error messages. Fixed: report token used non-timing-safe comparison. |
| 5 | Contact form — honeypot effectiveness, spam prevention | ⚠️ Fixed | Honeypot field present. Rate-limited at 3/hr. Fixed: contact route created custom 429 response instead of using rateLimit() return value (lost `Retry-After` header). |
| 6 | Error boundaries — do `error.tsx` and `global-error.tsx` leak stack traces or internal details? | ✅ Pass | Both show generic "Something Went Wrong" with no stack trace, error message, or internal details. `console.error(error)` is server-side only. |
| 7 | Security headers — CSP, X-Frame-Options, HSTS (check `next.config.ts` and middleware) | ❌ Fixed | No security headers configured. Added HSTS (2yr + preload), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control via `next.config.ts` headers. |
| 8 | `robots.txt` and sitemap — are admin/API routes excluded from indexing? | ⚠️ Fixed | `/api/` was disallowed but `/admin` and `/report` were missing. Added both. Sitemap correctly lists only public pages. |
| 9 | Static pages (privacy, terms) — are they current and legally compliant? | ✅ Pass | Both present and rendered as static server components. Content is hardcoded — no injection risk. FAQ, work-with-us also clean. |

---

## Issues Found

### Issue 1: RLS "service full access" policies grant unrestricted anon-key access

- **File:** `supabase/schema.sql` (+ live DB)
- **Severity:** Critical
- **Description:** 7 tables (events, purchases, profiles, subscriptions, favorites, notification_preferences, stripe_events) had `FOR ALL USING (true) WITH CHECK (true)` policies labeled "service full access." These policies applied to ALL roles including anon — meaning anyone with the public anon key could INSERT, UPDATE, or DELETE any row in any of these tables. The service-role client already bypasses RLS entirely, so these policies only served to open access to the anon key.
- **Suggested fix:** Drop all "service full access" policies. Service role bypasses RLS by design.
- **Fixed?** Yes (SQL migration applied to live DB + schema.sql updated)

### Issue 2: No RLS on rate_limits table

- **File:** `supabase/schema.sql` (+ live DB)
- **Severity:** High
- **Description:** The `rate_limits` table had RLS disabled. Anyone with the anon key could directly read, insert, update, or delete rate limit records — completely bypassing rate limiting by resetting counts or deleting keys.
- **Suggested fix:** `ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;` with no user-facing policies (service-role only).
- **Fixed?** Yes

### Issue 3: No security headers configured

- **File:** `next.config.ts`
- **Severity:** Medium
- **Description:** No security response headers were configured. Missing: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Suggested fix:** Add `headers()` config to `next.config.ts` with all standard security headers.
- **Fixed?** Yes

### Issue 4: Report verify-code leaks promoter email status

- **File:** `src/app/api/report/[eventId]/verify-code/route.ts`
- **Severity:** Medium
- **Description:** When the email doesn't match the promoter, the route returned `"Invalid code."` but when the OTP was wrong it returned `"Invalid or expired code."` — allowing an attacker to distinguish between "not the promoter" and "wrong code," confirming whether an email is the event's promoter.
- **Suggested fix:** Use the same error message for both cases.
- **Fixed?** Yes

### Issue 5: robots.txt missing /admin and /report disallow rules

- **File:** `src/app/robots.ts`
- **Severity:** Low
- **Description:** `/admin` and `/report` paths were not disallowed in robots.txt. While these are gated by auth, they shouldn't be crawled or indexed.
- **Suggested fix:** Add `/admin`, `/admin/`, `/report` to the disallow list.
- **Fixed?** Yes

### Issue 6: Report send-code HTML email missing escapeHtml on event name

- **File:** `src/app/api/report/[eventId]/send-code/route.ts`
- **Severity:** Low
- **Description:** The inline HTML email template interpolated `event.name` without escaping. If an event name contained HTML characters, this could inject content into the email.
- **Suggested fix:** Import and apply `escapeHtml()` from `@/lib/utils`.
- **Fixed?** Yes

### Issue 7: Report token verification not timing-safe

- **File:** `src/lib/report-token.ts`
- **Severity:** Low
- **Description:** `verifyReportToken()` used `===` string comparison, potentially leaking token bytes via timing side-channel. While the token is HMAC-derived and not user-facing, timing-safe comparison is best practice.
- **Suggested fix:** Use `crypto.timingSafeEqual()` with length pre-check.
- **Fixed?** Yes

### Issue 8: Duplicate table definitions in schema.sql

- **File:** `supabase/schema.sql`
- **Severity:** Low
- **Description:** The `purchases` and `events` tables were defined twice in the schema file — once in the canonical section at top and again in a legacy section at the bottom. The duplicate definitions had stale column lists (missing `session_claimed_at`, `recovery_code`, etc.) and included the dangerous `FOR ALL USING (true)` policies.
- **Suggested fix:** Remove the duplicate definitions, keeping only the canonical versions.
- **Fixed?** Yes

### Issue 9: Missing index on purchases.user_id

- **File:** `supabase/schema.sql` (+ live DB)
- **Severity:** Low
- **Description:** Several access-control queries (generate-token, check-purchase, watch page) filter purchases by `user_id` but no index existed. The `email` and `event_id` columns were indexed but `user_id` was not.
- **Suggested fix:** `CREATE INDEX idx_purchases_user_id ON purchases (user_id);`
- **Fixed?** Yes

### Issue 10: Contact route discards rateLimit() return value

- **File:** `src/app/api/contact/route.ts`
- **Severity:** Low
- **Description:** The contact route checked `rateLimit()` but created its own 429 response instead of returning the `NextResponse` from `rateLimit()` directly. This lost the `Retry-After` header that `rateLimit()` includes.
- **Suggested fix:** Return the `rateLimit()` response directly (`if (limited) return limited;`).
- **Fixed?** Yes

### Issue 11: Duplicate indexes and non-partial unique constraint

- **File:** `supabase/schema.sql` (+ live DB)
- **Severity:** Low
- **Description:** Three pairs of duplicate unique indexes existed (auto-created column constraints + explicit `CREATE INDEX` from schema). Additionally, `uq_purchases_email_event_amount` was a non-partial unique constraint on `(email, event_id, amount_paid)` that could block legitimate repurchases at the same price after a refund. The correct dedup is the partial `idx_purchases_promo_dedup WHERE amount_paid = 0`.
- **Suggested fix:** Drop duplicate constraints and the non-partial unique index.
- **Fixed?** Yes

---

## Summary

- **Total issues found:** 11
- **Critical:** 1
- **High:** 1
- **Medium:** 2
- **Low:** 7
- **Additional notes:** All issues fixed. 3 required SQL migrations to live DB (RLS policies, rate_limits RLS, index + constraint cleanup). Schema.sql updated to reflect live DB state as of 2026-04-12.
