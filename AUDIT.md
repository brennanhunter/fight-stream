# Security Audit — BoxStreamTV

Last updated: April 5, 2026

---

## CRITICAL (Fix Immediately)

- [x] **No webhook idempotency** — `src/app/api/webhooks/stripe/route.ts`
  ~~Stripe retries cause duplicate purchases and confirmation emails.~~ Fixed: events recorded in `stripe_events` table; duplicates rejected via unique constraint.

- [x] **No refund webhook handler** — `src/app/api/webhooks/stripe/route.ts`
  ~~No handlers for `charge.refunded`.~~ Fixed: `charge.refunded` handler sets `expires_at` to now and `session_version` to 999, invalidating all existing JWTs immediately.

- [x] **Admin login: no rate limiting + plaintext comparison** — `src/app/api/admin/login/route.ts`
  ~~Password compared with `!==` (timing attack vulnerable). No rate limiting.~~ Fixed: 3 attempts per 30 minutes per IP. Constant-time comparison via `crypto.timingSafeEqual()`. Generic error message.

- [x] **Promo code race condition** — `src/app/api/redeem-promo/route.ts`
  ~~Check-then-insert is not atomic.~~ Fixed: atomic upsert with `ON CONFLICT` + `crypto.randomUUID()` for purchase IDs. Duplicate redemption detected by empty return from upsert.

- [x] **Weak admin token derivation** — `src/lib/admin-auth.ts`
  ~~SHA-256 with no salt.~~ Fixed: HMAC-SHA256 keyed with `JWT_SECRET`. Brute-force requires knowing the secret key.

---

## HIGH (Fix This Week)

- [x] **`ignoreDuplicates` in webhook upsert** — `src/app/api/webhooks/stripe/route.ts`
  ~~If first webhook writes record with NULL email, retry won't update it. Customer never gets confirmation email. Replace `ignoreDuplicates: true` with proper `DO UPDATE`.~~ Fixed: removed `ignoreDuplicates: true` so upsert uses default `DO UPDATE SET` behavior, ensuring retries overwrite incomplete rows.

- [x] **Recovery code uses `Math.random()`** — `src/app/api/recover-access/send-code/route.ts`
  ~~Not cryptographically secure and only 6 digits (1M possibilities).~~ Fixed: replaced `Math.random()` with `crypto.getRandomValues()`. Kept 6-digit format.

- [x] **Session version never incremented** — `src/app/api/verify-payment/route.ts`, `src/lib/session.ts`
  ~~`sessionVersion` always defaults to 1. Stolen sessions remain valid after recovery or refund. Increment on each new purchase or recovery.~~ Fixed: webhook upserts now explicitly write `session_version: 1`; `verify-payment` writes it on first claim. Recovery and refund already increment/set it correctly.

- [ ] **Rate limit IP spoofable via x-forwarded-for** — `src/lib/rate-limit.ts`
  `getClientIp()` trusts `x-forwarded-for` header which can be forged. Validate only if behind trusted proxy (Vercel/Cloudflare).

- [ ] **save-session INSERT race with webhook** — `src/app/api/save-session/route.ts`
  Uses INSERT (not UPSERT). Parallel insert with webhook causes one to fail and purchase is lost. Change to UPSERT with proper conflict handling.

- [ ] **No email format validation on admin grant** — `src/app/api/admin/grant/route.ts`
  Admin can insert any string as email. Add regex validation.

- [ ] **Email send failure = silent loss** — `src/app/api/webhooks/stripe/route.ts`
  If Resend API is down, customer pays but never gets confirmation. Add retry queue or alert for failed sends.

---

## MEDIUM (Fix Soon)

- [ ] **Email enumeration via HTTP status codes** — `src/app/api/recover-access/route.ts`
  Returns 404 for unknown email, 403 for bad code. Return same status for all error cases.

- [ ] **No admin audit logging** — `src/app/api/admin/announce/route.ts`, `src/app/api/admin/grant/route.ts`
  No record of who did what. Create `admin_audit_log` table.

- [ ] **No CSRF tokens on admin actions** — admin grant/announce routes
  Only Origin header check, no CSRF token. Implement CSRF token validation.

- [ ] **check-purchase doesn't filter expired purchases** — `src/app/api/check-purchase/route.ts`
  Expired purchases return `purchased: true`, hiding the buy button. Add `expires_at` filter.

- [ ] **No input size limits on contact form** — `src/app/api/contact/route.ts`
  No max length on message/name fields. Can send 1MB+ payloads. Add length validation.

- [ ] **Missing security headers (HSTS, etc.)** — `next.config.ts`
  No `Strict-Transport-Security` or other security headers configured.

- [ ] **No session binding to IP/User-Agent** — `src/lib/session.ts`
  Stolen PPV session cookie can be replayed from any device/location.

- [ ] **15-minute grace window allows session sharing** — `src/app/api/verify-payment/route.ts`
  Two people can use same payment session simultaneously within grace window. Consider reducing to 2 minutes.

- [ ] **No idempotency on admin operations** — admin grant/announce routes
  Double-click or network retries can trigger operations twice.

- [ ] **Formspree endpoint ID hardcoded** — `src/app/api/contact/route.ts`
  Can't rotate without code change. Move to env var.
