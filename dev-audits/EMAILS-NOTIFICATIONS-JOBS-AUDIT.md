# Audit: Emails, Notifications & Background Jobs

**Auditor:** Dev 9
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

All transactional emails, email templates, notification preferences, and Inngest scheduled functions.

### Files to review

| Type | Files |
|------|-------|
| Templates | `emails/event-announced.tsx`, `emails/event-reminder.tsx`, `emails/event-starting.tsx`, `emails/payment-failed.tsx`, `emails/purchase-confirmation.tsx`, `emails/recovery-code.tsx`, `emails/subscription-canceled.tsx`, `emails/subscription-confirmation.tsx`, `emails/subscription-renewed.tsx`, `emails/welcome.tsx` |
| Lib helpers | `src/lib/emails/` (all compiled email functions) |
| Background | `src/inngest/functions.ts` — `eventReminderFunction`, `eventStartingFunction` |
| Inngest handler | `src/app/api/inngest/route.ts` |
| Lib | `src/lib/inngest.ts` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Email content — are all dynamic values escaped to prevent HTML injection? | ✅ Pass | Fixed. All dynamic values in `src/lib/emails/*.ts` now escaped via `escapeHtml()`. React `.tsx` templates auto-escape via JSX. |
| 2 | Are unsubscribe/preference links included where legally required (CAN-SPAM)? | ✅ Pass | Fixed. All 4 marketing emails (announced, reminder, starting, welcome) now include visible unsubscribe footer link + `List-Unsubscribe` / `List-Unsubscribe-Post` headers. New `/api/unsubscribe` endpoint handles one-click and browser unsubscribe. Transactional emails exempt. |
| 3 | Notification preferences — is `new_events: false` respected in every send path? | ✅ Pass | `eventAnnounceFunction` correctly queries `notification_preferences` and excludes opted-out users. Reminder/starting functions only email purchasers (transactional). |
| 4 | Reminder/starting cron functions — are the time windows correct? Can duplicate sends happen? | ✅ Pass | Fixed. Time windows correct (23-25h reminder, -10m starting). Atomic claim-before-send pattern now prevents double-sends from overlapping cron runs. |
| 5 | Resend batch limits — are batches capped at 100? Error handling per batch? | ✅ Pass | Announce uses `resend.batch.send()` capped at 100. Reminder/starting use individual sends in batches of 50. Announce batch errors now log recipient count. |
| 6 | Inngest idempotency — can a function run twice safely? | ✅ Pass | Announce has explicit `idempotency` key. Reminder/starting use atomic DB timestamp claims. Email failures are `.catch()`-ed. |
| 7 | Are sensitive values (purchase amounts, emails) ever exposed in email previews or subject lines? | ✅ Pass | Subjects contain only event names (public). No amounts, emails, or codes in subject lines. |

---

## Issues Found

### Issue 1: HTML injection — dynamic values not escaped in email templates

- **File:** `src/lib/emails/event-announced.ts`, `event-reminder.ts`, `event-starting.ts`, `purchase-confirmation.ts`, `recovery-code.ts`, `subscription-renewed.ts`
- **Severity:** Medium
- **Description:** All `src/lib/emails/*.ts` files used raw template literal interpolation (`${eventName}`, `${code}`, `${vodPurchaseId}`, etc.) directly into HTML. Admin-controlled values like event names could inject HTML/scripts.
- **Suggested fix:** Created `escapeHtml()` utility in `src/lib/utils.ts`. Applied to all dynamic values in 6 HTML email template files. Also added `encodeURIComponent()` for `vodPurchaseId` in URL href.
- **Fixed?** Yes

### Issue 2: No unsubscribe links — CAN-SPAM violation

- **File:** All 10 email templates + `src/inngest/functions.ts` + `src/app/auth/callback/route.ts` + `src/app/auth/confirm/route.ts`
- **Severity:** High
- **Description:** None of the 10 email templates included an unsubscribe mechanism. Marketing emails (event-announced, event-reminder, event-starting, welcome) legally require this under CAN-SPAM.
- **Suggested fix:** Created `src/lib/emails/unsubscribe.ts` (HMAC-signed URL generator + `List-Unsubscribe` headers). Created `src/app/api/unsubscribe/route.ts` (GET for browser confirmation, POST for one-click RFC 8058). Added visible unsubscribe footer link + plaintext version to all 4 marketing templates. Added `List-Unsubscribe` + `List-Unsubscribe-Post` headers to all marketing email send calls.
- **Fixed?** Yes

### Issue 3: Cron race condition — reminder/starting double-sends

- **File:** `src/inngest/functions.ts`
- **Severity:** Medium
- **Description:** SELECT (`IS NULL`) then send emails then UPDATE was not atomic. Two overlapping cron instances could both see NULL and double-send all emails.
- **Suggested fix:** Moved UPDATE before sends with `IS NULL` condition. Only proceeds if rows returned (atomic claim via Postgres row-level locking). Removed separate empty-purchasers UPDATE since the claim covers it.
- **Fixed?** Yes

### Issue 4: Announce batch failures silently lost

- **File:** `src/inngest/functions.ts`
- **Severity:** Medium
- **Description:** Failed announce batches logged a generic message with no indication of how many recipients were affected.
- **Suggested fix:** Added recipient count to error log message.
- **Fixed?** Yes

### Issue 5: Email dedup missing case normalization

- **File:** `src/inngest/functions.ts`
- **Severity:** Low
- **Description:** Reminder and starting functions deduped emails via `new Set()` without `.toLowerCase()`. `User@Example.com` and `user@example.com` would create duplicates. Announce function already used `.toLowerCase()`.
- **Suggested fix:** Added `.toLowerCase()` to email dedup in both reminder and starting functions.
- **Fixed?** Yes

---

## What Passed

- **Notification preferences:** `eventAnnounceFunction` correctly queries `notification_preferences.new_events = false` and excludes opted-out users by user_id. Both subscriber and PPV buyer paths filtered.
- **Batch sending:** Announce capped at 100 (Resend batch API limit). Reminder/starting use individual sends in `Promise.all` batches of 50.
- **Idempotency (announce):** Explicit key `eventName + "-" + eventDate` prevents duplicate mass email jobs.
- **Non-blocking error handling:** Individual email failures in reminder/starting are `.catch()`-ed — don't crash the job. Announce batch failures try/caught.
- **Plain text alternatives:** All 10 email templates include `.text` versions.
- **Subject lines:** No sensitive data (amounts, emails, codes) in subjects — only event names (public).
- **Inngest handler:** Clean `serve()` setup. 300s maxDuration adequate for batch sends.
- **Inngest client:** Minimal config, no issues.
- **React email templates (`.tsx`):** JSX auto-escapes dynamic values — no injection risk.
- **Safe template values:** `tierLabel` derived from typed union ('basic'|'premium'), Date formatting outputs, hardcoded perk lists — all safe without escaping.
- **Recovery code email:** 15-minute expiry text matches backend OTP expiry (verified in Dev 5's audit).
- **Resend API key:** Environment variable, not hardcoded.

---

## Summary

- **Total issues found:** 5
- **Critical:** 0
- **High:** 1 (CAN-SPAM unsubscribe)
- **Medium:** 3 (HTML injection, cron race condition, announce error logging)
- **Low:** 1 (email case normalization)
- **All fixed:** Yes

## Summary

- **Total issues found:** 
- **Critical:** 
- **High:** 
- **Medium:** 
- **Low:** 
- **Additional notes:** 
