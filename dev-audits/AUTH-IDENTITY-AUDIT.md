# Audit: Authentication & Identity

**Auditor:** Dev 1
**Status:** In Progress
**Date started:** 2026-04-11
**Date completed:** ___

---

## Scope

Everything related to user sign-up, login, password reset, OAuth, and Supabase Auth integration.

### Files to review

| Type | Files |
|------|-------|
| Pages | `src/app/(auth)/login/`, `src/app/(auth)/signup/`, `src/app/(auth)/forgot-password/`, `src/app/(auth)/reset-password/`, `src/app/(auth)/layout.tsx` |
| Callbacks | `src/app/auth/callback/`, `src/app/auth/confirm/` |
| Components | `src/components/auth/` |
| Middleware | `src/middleware.ts` |
| Lib | `src/lib/supabase.ts`, `src/lib/supabase-server.ts` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Auth flow completeness (email confirm, OAuth redirect, magic link) | ❌ Fail | Password recovery flow is broken — middleware redirects authenticated recovery users away from `/reset-password` (see Issue 1). Email signup + OAuth flows work correctly. |
| 2 | Password reset token expiry and replay protection | ✅ Pass | Handled by Supabase OTP — tokens are single-use and expire (default 24h). `verifyOtp` invalidates after first use. |
| 3 | Middleware route protection — are all protected routes covered? | ✅ Pass | `/account/*` and `/admin/*` correctly gated. Matcher excludes only static files and webhooks. All 24 API routes get CSRF check (except webhooks + Inngest, correctly exempted). |
| 4 | Supabase RLS policy enforcement — do server components use the right client (auth vs service-role)? | ✅ Pass | All auth files use correct clients: `createAuthServerClient()` (anon+cookies) in callback/confirm routes, `createBrowserClient()` in client pages, middleware uses `@supabase/ssr` with anon key. No service-role leakage in auth scope. |
| 5 | Session refresh and cookie handling in middleware | ✅ Pass | `getUser()` called on every request with proper error handling (catches failures, degrades to unauthenticated). Cookie passthrough via `setAll` correctly updates both request and response. |
| 6 | CSRF protection on auth forms | ✅ Pass | Origin-based CSRF check on all POST/PUT/PATCH/DELETE to `/api/*`. This is the modern standard and sufficient with Supabase's `SameSite=Lax` cookies. Auth forms use Supabase client SDK which goes through these API routes. |
| 7 | Error states: expired tokens, duplicate signups, invalid OAuth state | ⚠️ Attention | Expired tokens: handled (Supabase returns error → redirect to `/login?error=confirmation`). Duplicate signups: detection is unreliable — checks error message string instead of checking `identities: []` (see Issue 4). Invalid OAuth state: handled by Supabase PKCE internally. Unvalidated `type` param in confirm route (see Issue 3). |

---

## Audit Plan

### Phase 1: Deep-Read & Catalog Issues
Go file-by-file through all 11 files, reading every line carefully. Document each issue with file, line number, severity, and suggested fix.

**Order (highest risk first):**
1. `src/app/auth/callback/route.ts` — OAuth callback. Open redirect, CSRF/state, session exchange.
2. `src/app/auth/confirm/route.ts` — Email confirmation. Open redirect, OTP type validation, token expiry, duplicate welcome email.
3. `src/middleware.ts` — Route protection gaps, CSRF origin-check, session refresh, admin auth path.
4. `src/lib/supabase-server.ts` + `src/lib/supabase.ts` — Client factories. Correct client usage, cookie handling, silent errors.
5. `src/app/(auth)/signup/page.tsx` — No CAPTCHA, weak password policy, duplicate signup handling.
6. `src/app/(auth)/login/page.tsx` — Rate limiting, redirect sanitization, error info leakage.
7. `src/app/(auth)/forgot-password/page.tsx` — User enumeration, no rate limit, no CAPTCHA.
8. `src/app/(auth)/reset-password/page.tsx` — Session assumption, password strength.
9. `src/components/auth/UserMenu.tsx` — Avatar URL validation, sign-out flow.
10. `src/app/(auth)/layout.tsx` — Quick sanity check.

### Phase 2: Cross-Cutting Checks
- **Checklist #1 (Auth flow completeness):** Trace signup → email confirm → login and OAuth flow end-to-end.
- **Checklist #3 (Middleware route protection):** Cross-reference matcher config against all `/account`, `/admin`, `/api` routes.
- **Checklist #4 (Supabase client usage):** Grep server files for wrong client usage (service-role where anon needed, etc.).
- **Checklist #7 (Error states):** Trace code paths for expired tokens, duplicate signups, invalid OAuth state.

### Phase 3: Write Up Findings
Fill in checklist with pass/fail/attention. Document each issue using template below.

### Phase 4: Implement Fixes
Critical → High → Medium → Low. Run `npx tsc --noEmit` after each fix.

### Priority Issues Identified (Initial Scan)

| # | Severity | Issue | File(s) |
|---|----------|-------|---------|  
| 1 | Critical | Open redirect via `next` param | callback/route.ts, confirm/route.ts |
| 2 | High | No rate limiting on auth forms | login, signup, forgot-password |
| 3 | High | Weak password policy (6 chars min) | signup, reset-password |
| 4 | High | User enumeration on forgot-password | forgot-password/page.tsx |
| 5 | High | CSRF protection is Origin-only (no token) | middleware.ts |
| 6 | Medium | Duplicate welcome emails possible | callback + confirm routes |
| 7 | Medium | Silent cookie error swallowing | supabase-server.ts |
| 8 | Low | Unvalidated avatar URL from user_metadata | UserMenu.tsx |

---

## Issues Found

### Issue 1: Middleware blocks password reset flow

- **File:** `src/middleware.ts`
- **Line(s):** 77–84
- **Severity:** Critical
- **Description:** The middleware redirects ALL authenticated users away from `/reset-password` to `/account`. However, users who just completed the recovery OTP verification (via `/auth/confirm?type=recovery`) ARE authenticated — `verifyOtp` establishes a full session before redirecting to `/reset-password`. This means the password reset flow is **completely broken**: the user clicks the recovery email link → confirm route verifies OTP and sets session cookies → redirect to `/reset-password` → middleware sees authenticated user → redirects to `/account` → user never reaches the password reset form.
- **Suggested fix:** Remove `/reset-password` from the authenticated-user redirect list. The page itself calls `updateUser({ password })` which requires a valid session, so there's no security risk in allowing access. Alternatively, check for a recovery-specific session via the JWT's `amr` claim.
- **Fixed?** Yes — removed `/reset-password` from the redirect guard in middleware.ts (lines 77–84). Added comment explaining why it's intentionally excluded.

---

### Issue 2: Unvalidated `type` parameter in confirm route

- **File:** `src/app/auth/confirm/route.ts`
- **Line(s):** 24
- **Severity:** Medium
- **Description:** The `type` search parameter is user-controlled and cast directly to a TypeScript union type (`type as 'signup' | 'recovery' | 'email'`) without runtime validation. While Supabase's `verifyOtp` would reject truly invalid types server-side, this bypasses type safety and could pass unexpected values like `phone_change` or `sms` to Supabase, potentially causing unexpected behavior.
- **Suggested fix:** Validate `type` against an allowlist before passing to `verifyOtp`:
  ```typescript
  const allowedTypes = ['signup', 'recovery', 'email'] as const;
  if (!type || !allowedTypes.includes(type as any)) {
    return NextResponse.redirect(`${origin}/login?error=confirmation`);
  }
  ```
- **Fixed?** Yes — added `allowedTypes` allowlist check before the `if` block. Invalid types now fall through to the error redirect (`/login?error=confirmation`). Type cast uses the derived `AllowedType` instead of a raw assertion.

---

### Issue 3: Duplicate welcome emails possible

- **File:** `src/app/auth/callback/route.ts` (line 29), `src/app/auth/confirm/route.ts` (line 30)
- **Line(s):** callback:29, confirm:30
- **Severity:** Low
- **Description:** Both routes send welcome emails for new users. The callback uses a 2-minute window (`Date.now() - createdAt < 2 * 60 * 1000`), while the confirm route sends for `type === 'signup'`. In a theoretical scenario where a user signs up with email, confirms, then immediately links Google OAuth within 2 minutes, they could receive two welcome emails. More practically, if the email confirmation flow is slow and overlaps with OAuth, duplicates could occur.
- **Suggested fix:** After sending a welcome email, set a flag in user metadata: `updateUser({ data: { welcome_email_sent: true } })`. Check this flag before sending in both routes. Or accept the low risk and document it.
- **Fixed?** Yes — both routes now check `!user.user_metadata?.welcome_email_sent` before sending, and call `updateUser({ data: { welcome_email_sent: true } })` after a successful send.

---

### Issue 4: Unreliable duplicate signup detection

- **File:** `src/app/(auth)/signup/page.tsx`
- **Line(s):** 37–39
- **Severity:** Medium
- **Description:** The duplicate signup check relies on Supabase returning an error message containing "already registered": `error.message?.toLowerCase().includes('already registered')`. In newer Supabase versions with email confirmation enabled, duplicate signups return a **success response** with `data.user.identities` as an empty array (`[]`) — no error is thrown. This means the "already registered" branch may never execute, and the user sees the generic "Check Your Email" success state even though no confirmation email was sent.
- **Suggested fix:** After `signUp`, check for the empty identities array:
  ```typescript
  const { data, error } = await supabase.auth.signUp({...});
  if (!error && data.user?.identities?.length === 0) {
    setError('Unable to create account. Please try signing in instead.');
    setLoading(false);
    return;
  }
  ```
- **Fixed?** Yes — added `data.user?.identities?.length === 0` check after `signUp`. The existing error-string check is preserved as a fallback, but the identities check now catches the common case where Supabase returns success with empty identities.

---

### Issue 5: Weak password policy

- **File:** `src/app/(auth)/signup/page.tsx` (line 131), `src/app/(auth)/reset-password/page.tsx` (line 75)
- **Line(s):** signup:131, reset-password:75
- **Severity:** Medium
- **Description:** Password fields only enforce `minLength={6}` (HTML5 client-side validation). Supabase's server-side default minimum is also 6 characters. OWASP and NIST SP 800-63B recommend a minimum of 8 characters. No complexity requirements (uppercase, numbers, symbols) or strength indicator are present.
- **Suggested fix:** Increase `minLength` to 8 on both forms. Update Supabase dashboard password policy to require 8+ characters. Optionally add a client-side strength indicator. Note: NIST recommends against complexity rules (uppercase + special chars) — length is more important.
- **Fixed?** Yes — increased `minLength` from 6 to 8 on all 4 password fields in signup and reset-password. Login form left at 6 to avoid locking out existing users. **Manual step required:** update Supabase dashboard Auth settings to enforce 8-char minimum server-side.

---

### Issue 6: No CAPTCHA on signup and password reset request forms

- **File:** `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`
- **Line(s):** Entire form handlers
- **Severity:** Medium
- **Description:** Neither the signup nor forgot-password forms have CAPTCHA protection. While Supabase enforces built-in rate limiting on auth operations (e.g., ~30 requests/hour per email for `resetPasswordForEmail`), automated bots could still create many accounts or trigger mass reset emails up to those limits. The signup endpoint is particularly vulnerable to account creation spam.
- **Suggested fix:** Add Cloudflare Turnstile (free, privacy-friendly) to the signup and forgot-password forms. Supabase supports passing a `captchaToken` in `signUp` and `resetPasswordForEmail` options.
- **Fixed?** Yes — installed `@marsidev/react-turnstile`, added Turnstile widget to both forms, passing token via `options.captchaToken` to Supabase. Widget only renders when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` env var is set (graceful degradation). **Manual steps required:** (1) Create a Turnstile widget at dash.cloudflare.com, (2) Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to env, (3) Enable CAPTCHA protection in Supabase dashboard (Auth → Settings → Enable Captcha protection → Turnstile) with the secret key.

---

## Items That Pass (No Issues)

- **Redirect sanitization:** `sanitizeRedirect()` in callback and confirm routes, and the inline check in login page, all use the safe pattern `startsWith('/') && !startsWith('//')`. Combined with `${origin}${next}`, redirects are always pinned to the current origin. Not an open redirect.
- **OAuth CSRF/state:** Supabase handles PKCE challenge/verifier internally during the OAuth flow. The `exchangeCodeForSession` call validates the code.
- **Session refresh:** Middleware correctly calls `getUser()` on every request. Failures are caught and degrade safely to unauthenticated state.
- **Supabase client separation:** All 11 auth files use the correct client type. No service-role key leakage.
- **Route protection coverage:** `/account/*` and `/admin/*` are gated. Auth pages redirect logged-in users (except the Issue 1 bug). Webhook and Inngest routes are correctly exempted from CSRF.
- **Error messages:** Login shows "Authentication failed" (generic). Forgot-password shows success regardless of whether the email exists (Supabase doesn't error for non-existent emails). No user enumeration vulnerability.
- **UserMenu avatar:** `<img src={avatarUrl}>` cannot execute JavaScript. `onError` fallback to initials is safe. Not an XSS risk.
- **Sign out:** `supabase.auth.signOut()` properly clears session, redirects to home.
- **Auth layout:** Pure UI wrapper, no logic or security concern.
- **Cookie handling in supabase-server.ts:** The silent `catch` in `setAll` is expected — it's called from Server Components where cookies can't be set. In Route Handlers (where cookies matter), `set()` succeeds normally.

---

## Summary

- **Total issues found:** 6
- **Critical:** 1 (middleware blocks password reset flow)
- **High:** 0
- **Medium:** 4 (unvalidated type param, unreliable duplicate detection, weak password policy, no CAPTCHA)
- **Low:** 1 (duplicate welcome emails)
- **Additional notes:** Several items from the initial scan turned out to be non-issues after deep analysis: redirect sanitization is safe (not an open redirect), CSRF Origin-based protection is the modern standard (sufficient with SameSite cookies), user enumeration on forgot-password doesn't actually occur (Supabase returns success for all emails), avatar URL is not an XSS vector, and Supabase provides built-in rate limiting on all auth operations.
