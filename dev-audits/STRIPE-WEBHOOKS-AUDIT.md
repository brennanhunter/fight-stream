# Audit: Stripe Webhooks

**Auditor:** Dev 3
**Status:** In Progress
**Date completed:** ___

---

## Scope

The Stripe webhook handler and all event types it processes.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/webhooks/stripe/route.ts` |
| Schema | `supabase/schema.sql` — `stripe_events` table (idempotency) |

### Cross-references read

- `src/app/api/verify-payment/route.ts` — data consistency (Dev 2 already audited)
- `src/lib/stripe.ts` — shared Stripe client
- `src/lib/supabase.ts` — service-role client used by webhook
- `src/lib/access.ts` — subscription tier resolution
- `src/middleware.ts` — CSRF exemption for `/api/webhooks`
- `supabase/schema.sql` — `stripe_events`, `purchases`, `subscriptions` tables

---

## Audit Plan

1. **Signature verification** — Verify `constructEvent` usage, raw body handling, middleware exemption, env var safety.
2. **Idempotency** — Verify `stripe_events` dedup logic, unique constraint, TOCTOU race handling.
3. **Event type DB writes** — Audit each of the 6 handled event types for correct upsert keys, required fields, edge cases.
4. **Unhandled event types** — Identify Stripe events that _should_ be processed but aren't (disputes, partial refunds, etc.).
5. **Error isolation** — Verify whether a failure in one event type causes a 500 that triggers Stripe retries for all events.
6. **Data consistency** — Verify webhook-vs-verify-payment conflict resolution and field parity.
7. **Subscription lifecycle** — Trace `created → updated → deleted` state transitions for correctness.
8. **Invoice events** — Verify renewal detection, `past_due` status writes, retry handling.
9. **Refund handling** — Verify access revocation, partial-vs-full refund behavior.
10. **Fix all issues** — Apply code fixes, run `tsc --noEmit`.
11. **Write report** — Fill audit doc and SUMMARIES.md.

**Manual steps for project owner (outside of code):**
- Will flag if any Stripe webhook event types need to be added in the Stripe Dashboard.
- Will flag if any Supabase schema changes (RLS, indexes) need to be applied via SQL Editor.

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Signature verification — is `stripe.webhooks.constructEvent` used correctly? | ✅ Pass | See Step 1 notes below |
| 2 | Idempotency — are duplicate webhook deliveries handled (stripe_events dedup)? | ⚠️ Needs attention | See Step 2 notes — two issues found |
| 3 | Every handled event type: is the DB write correct? Are edge cases covered? | ⚠️ Needs attention | See Step 3 notes — two issues found |
| 4 | Unhandled event types — should any additional events be processed? | ⚠️ Needs attention | See Step 4 notes — one issue found |
| 5 | Error handling — does a failure in one event type affect others? | ⚠️ Needs attention | See Step 5 notes — one issue found |
| 6 | Data consistency between webhook writes and verify-payment writes (who wins on conflict?) | ✅ Pass | See Step 6 notes |
| 7 | Subscription lifecycle: `customer.subscription.created`, `updated`, `deleted` — state transitions | ✅ Pass | See Step 7 notes |
| 8 | Invoice events: `invoice.payment_succeeded`, `invoice.payment_failed` — are retries handled? | ✅ Pass | See Step 8 notes — minor timing note |
| 9 | Refund handling — does a refund revoke access? | ⚠️ Needs attention | See Step 9 notes — one issue found |

---

## Step 1: Signature Verification — ✅ Pass

**What I checked:**

1. **Raw body handling (line 18):** `request.text()` is used to get the raw body before any JSON parsing. This is critical — `constructEvent` requires the exact raw body bytes to verify the HMAC signature. ✅
2. **Signature header (line 19):** `stripe-signature` header is read and null-checked before use. ✅
3. **constructEvent call (line 28):** `stripe.webhooks.constructEvent(body, signature, webhookSecret)` — correct parameter order (payload, sig header, secret). ✅
4. **Error handling (lines 29–31):** Verification failures return 400 with a generic error message. No internal details leaked. ✅
5. **Middleware exemption (middleware.ts line 96):** The matcher pattern excludes `api/webhooks` so the CSRF Origin check doesn't run on Stripe webhook POSTs. Stripe doesn't send an Origin header, so without this exemption webhooks would be rejected with 403. ✅
6. **Next.js body parsing:** App Router doesn't auto-parse request bodies — `request.text()` returns the raw stream. No `bodyParser: false` config needed (that's a Pages Router concern). ✅

**Issues found:** 1 (Low severity — Stripe client instantiation, filed as Issue 1 below)

- Line 13: `new Stripe(process.env.STRIPE_SECRET_KEY!)` — the `!` non-null assertion will throw a cryptic runtime error if the env var is missing. The shared `stripeServer` in `src/lib/stripe.ts` has a null-safe pattern with a warning. However, for the webhook this is module-level initialization, and a missing key would prevent _all_ signature verifications. This is low severity since the webhook won't work at all without the key (it would fail on `constructEvent` anyway), but using the shared client is better practice.
- Line 14: Same pattern for `webhookSecret` — `!` assertion. This one can't use the shared client since `webhookSecret` is webhook-specific.

---

## Issues Found

### Issue 1: Webhook creates its own Stripe client instead of using shared `stripeServer`

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 13
- **Severity:** Low
- **Description:** The webhook handler instantiates its own `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of importing the shared null-safe `stripeServer` from `src/lib/stripe.ts`. The `!` assertion will produce a confusing runtime error if the env var is missing. Dev 2 fixed this same pattern in `ppv-checkout`. Note: `constructEvent` is a method on the Stripe instance, so we need a non-null instance — we should guard and return 500 early if missing.
- **Suggested fix:** Import `stripeServer` from `@/lib/stripe` and add a null guard before `constructEvent`.
- **Fixed?** Yes

### Issue 2: Non-unique-constraint insert error allows event processing to continue

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 52–57
- **Severity:** Medium
- **Description:** When the `stripe_events` INSERT fails with an error that is _not_ a unique constraint violation (`23505`), the code logs the error but does **not** return. Execution falls through to the `switch` block and processes the event anyway — without a dedup record. This means if the same event is retried by Stripe later, the dedup SELECT won't find it, and the event will be processed again (double DB writes, double emails). A transient Supabase error (e.g., connection timeout) would trigger this.
- **Suggested fix:** Return a 500 after logging the non-23505 error so Stripe retries later when Supabase is healthy, rather than processing without the idempotency guard.
- **Fixed?** Yes

### Issue 3: No RLS on `stripe_events` table

- **File:** `supabase/schema.sql`
- **Line(s):** 176–181
- **Severity:** Low
- **Description:** The `stripe_events` table has no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or any RLS policies. While the webhook uses the service-role client (which bypasses RLS), this is inconsistent with every other table in the schema which explicitly enables RLS. If RLS were ever enabled on this table without adding a service-role policy, webhook processing would silently fail.
- **Suggested fix:** Add `ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;` and a service-role full-access policy for consistency with the rest of the schema.
- **Fixed?** Yes

---

## Step 2: Idempotency — ⚠️ Needs Attention

**What I checked:**

1. **stripe_events table (schema.sql lines 176–181):** `event_id text NOT NULL UNIQUE` — the unique constraint is the real dedup guard. ✅
2. **SELECT check (lines 37–43):** Queries for existing `event_id` and returns early if found. This is a fast-path optimization to avoid processing work on retries. ✅ (but see TOCTOU note below)
3. **INSERT with 23505 catch (lines 46–57):** Inserts the event _before_ processing. If a concurrent request already inserted, the unique constraint violation (`23505`) is caught and returns `{ duplicate: true }`. ✅
4. **TOCTOU race:** Two parallel Stripe deliveries of the same event could both pass the SELECT (neither finds a row yet), then both attempt INSERT. One succeeds, one gets `23505`. This is correctly handled — the INSERT is the authoritative guard, not the SELECT.
5. **Non-23505 error fallthrough (lines 52–57):** ❌ If the INSERT fails for a non-unique reason (Supabase down, connection timeout, permissions error), the code logs the error but continues processing. This means the event runs without a dedup record, and Stripe retries will double-process it. **Filed as Issue 2.**
6. **No processing status tracking:** The table records `event_id` and `event_type` at insert time, but there's no `processed_at` or `status` column. If processing fails after the INSERT (returns 500), the dedup record exists and Stripe's retry will be treated as a duplicate — the event is permanently lost. This is a known tradeoff: the alternative (delete the dedup record on failure) introduces complexity. Current approach biases toward "at most once" delivery, which is safer for financial operations (no double-charges, no double emails). ⚠️ Acceptable tradeoff but worth noting.
7. **No TTL/cleanup:** Old `stripe_events` rows accumulate forever. Not a correctness issue but the table will grow. Low priority — a periodic cleanup job could purge rows older than 30 days.
8. **RLS missing:** No RLS on `stripe_events`. Filed as Issue 3.

**Issues found:** 2 (Issue 2: Medium, Issue 3: Low)

---

## Step 3: Event Type DB Writes — ⚠️ Needs Attention

Audited all 6 handled event types. For each, I checked: (a) all NOT NULL schema columns are provided, (b) upsert conflict keys match unique indexes, (c) edge cases.

### 3a. `checkout.session.completed` — mode: `payment`, VOD

**DB write:** `purchases.upsert(vodRow, { onConflict: 'stripe_session_id' })`

| Field | Value | Schema match? |
|-------|-------|---------------|
| `email` | `customerEmail` (lowercased, trimmed) | ✅ NOT NULL |
| `purchase_type` | `'vod'` | ✅ CHECK constraint |
| `stripe_session_id` | `session.id` | ✅ conflict key matches `idx_purchases_stripe_session` |
| `stripe_product_id` | `product.id` | ✅ |
| `product_name` | `product.name` | ✅ NOT NULL |
| `product_image` | `product.images?.[0] || null` | ✅ nullable |
| `s3_key` | `product.metadata.s3_key` | ✅ (guarded by outer `if`) |
| `amount_paid` | `price?.unit_amount || 0` | ✅ NOT NULL |
| `currency` | `price?.currency || 'usd'` | ✅ |
| `expires_at` | `null` (VOD = lifetime) | ✅ |
| `user_id` | `session.metadata?.user_id || null` | ✅ nullable |
| `session_version` | `1` | ✅ |

**Edge cases:**
- ✅ If `product.metadata.s3_key` is missing, the webhook logs an error and breaks — no partial row written.
- ✅ Email send is try/caught — failure doesn't affect the purchase record.
- ⚠️ `price?.unit_amount || 0` — if `unit_amount` is explicitly `0` (free VOD), this is correct BUT `||` would also catch `null`/`undefined`, falling back to `0`. That's fine.

**Verdict:** ✅ Pass

### 3b. `checkout.session.completed` — mode: `payment`, PPV

**DB write:** `purchases.upsert(ppvRow, { onConflict: 'stripe_payment_intent_id' })`

| Field | Value | Schema match? |
|-------|-------|---------------|
| `email` | `customerEmail` | ✅ |
| `purchase_type` | `'ppv'` | ✅ |
| `stripe_payment_intent_id` | `paymentIntentId` | ✅ conflict key matches `idx_purchases_stripe_pi` |
| `stripe_product_id` | `null` | ✅ nullable |
| `product_name` | `targetEvent.name` | ✅ |
| `event_id` | `targetEvent.id` | ✅ |
| `amount_paid` | `session.amount_total || 0` | ✅ |
| `currency` | `session.currency || 'usd'` | ✅ |
| `expires_at` | calculated | ✅ |
| `user_id` | `session.metadata?.user_id || null` | ✅ |
| `session_version` | `1` | ✅ |

**Edge cases:**
- ⚠️ **PPV webhook does NOT send a confirmation email.** The verify-payment route sends it on `isFirstClaim`, so if the webhook fires first and the user hits the success page, verify-payment sends the email. But if the user never hits the success page (e.g., closes the tab after Stripe redirect), no email is sent. **Filed as Issue 4.**
- ✅ Event fallback logic (metadata eventId → active event) matches verify-payment.
- ⚠️ `paymentIntentId` fallback to `session.id` when `payment_intent` is null (100% discount case). This matches verify-payment's `deduplicationId` logic. But the conflict key is `stripe_payment_intent_id` — writing a session ID into a column named `payment_intent_id` is semantically odd. Not a bug, but noteworthy.
- ⚠️ `REPLAY_WINDOW_DAYS = 4` hardcoded inline. Same drift risk Dev 2 flagged (deferred to Dev 5).

**Verdict:** ⚠️ Missing PPV confirmation email

### 3c. `checkout.session.completed` — mode: `subscription`

**DB write:** `subscriptions.upsert({ ... }, { onConflict: 'stripe_subscription_id' })`

| Field | Value | Schema match? |
|-------|-------|---------------|
| `user_id` | `subscription.metadata.user_id \|\| session.metadata?.user_id` | ✅ NOT NULL |
| `stripe_customer_id` | extracted from `session.customer` | ✅ NOT NULL |
| `stripe_subscription_id` | `subscriptionId` | ✅ conflict key matches `idx_subscriptions_stripe_sub` |
| `tier` | `determineTier(subscription)` | ✅ NOT NULL |
| `status` | `subscription.status` | ✅ |
| `current_period_start` | from `getPeriodDates()` | ✅ |
| `current_period_end` | from `getPeriodDates()` | ✅ |
| `cancel_at_period_end` | `subscription.cancel_at_period_end` | ✅ |

**Edge cases:**
- ✅ If `user_id` is missing from both metadata sources, the handler breaks early with a log. No orphan row.
- ⚠️ **Subscription upsert error is not checked.** `await supabase.from('subscriptions').upsert(...)` — the result is not captured, so a DB error is silently ignored. **Filed as Issue 5.**
- ✅ Confirmation email is try/caught separately.
- ✅ `session.customer` null/object handling covers both string ID and expanded object.

**Verdict:** ⚠️ Upsert error silently ignored

### 3d. `customer.subscription.updated`

**DB write (with user_id):** `subscriptions.upsert({ ... }, { onConflict: 'stripe_subscription_id' })`  
**DB write (without user_id):** `subscriptions.update({ ... }).eq('stripe_subscription_id', ...)`

- ✅ All required fields provided in both paths.
- ✅ Fallback to update-by-stripe_subscription_id when user_id is missing is a good defensive pattern.
- ✅ `effectivelyCanceling` correctly covers both `cancel_at_period_end` and `cancel_at`.
- ⚠️ Same silent upsert error issue as 3c (upsert result not checked in the `userId` path). Part of Issue 5.
- ✅ Error IS checked in the `!userId` path (updateError handling).

**Verdict:** ⚠️ Same Issue 5 applies

### 3e. `customer.subscription.deleted`

**DB write:** `subscriptions.update({ status: 'canceled', cancel_at_period_end: false }).eq('stripe_subscription_id', ...)`

- ✅ Correctly sets status to `canceled` and clears `cancel_at_period_end`.
- ⚠️ Update error is not checked (same pattern as Issue 5).
- ✅ Email send is try/caught.

**Verdict:** ⚠️ Same Issue 5 applies

### 3f. `invoice.payment_failed`

**DB write:** `subscriptions.update({ status: 'past_due' }).eq('stripe_subscription_id', ...)`

- ✅ Correctly marks subscription as `past_due`.
- ⚠️ Update error is not checked. Part of Issue 5.
- ✅ Email send is try/caught.

**Verdict:** ⚠️ Same Issue 5 applies

### 3g. `charge.refunded`

**DB write:** `purchases.update({ expires_at: now() }).eq('stripe_payment_intent_id', ...)`

- ✅ Correctly revokes access by expiring the purchase.
- ✅ Error IS checked and logged.
- ✅ Handles the case where no matching purchase exists (logs a warning).

**Verdict:** ✅ Pass (partial refund issue tracked separately in Step 9)

---

### Issue 4: PPV purchase — no confirmation email sent from webhook

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 180–188
- **Severity:** Medium
- **Description:** When the webhook processes a PPV `checkout.session.completed`, it saves the purchase row but does not send a confirmation email. The email is only sent from the `verify-payment` route on the user's first visit to the success page. If the user closes the browser before the success page loads (e.g., slow redirect from Stripe), they receive no email confirmation of their purchase. VOD purchases in the same handler DO send a confirmation email from the webhook.
- **Suggested fix:** Add a confirmation email send after the PPV upsert, mirroring the VOD pattern. Use the email as the dedup signal — verify-payment already checks `isFirstClaim` to avoid double-sends, so this only fires if verify-payment hasn't run yet.
- **Fixed?** Yes

### Issue 5: Subscription upsert/update errors silently ignored in 4 places

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 213 (checkout subscription), 258 (subscription.updated with userId), 332 (subscription.deleted), 429 (invoice.payment_failed)
- **Severity:** Medium
- **Description:** In four places, `supabase.from('subscriptions').upsert(...)` or `.update(...)` is called without checking the returned `error`. If the DB write fails (e.g., constraint violation, connection timeout), the webhook returns 200 to Stripe (event "processed") but the database is stale. Stripe won't retry. The `subscription.updated` handler without `userId` IS correctly checking the error — inconsistent. The `charge.refunded` handler also correctly checks it.
- **Suggested fix:** Capture and log errors for all subscription writes. On critical failures, consider returning 500 so Stripe retries.
- **Fixed?** Yes

**Issues found:** 2 (Issue 4: Medium, Issue 5: Medium)

---

## Step 4: Unhandled Event Types — ⚠️ Needs Attention

**Currently handled (6 events):**
1. `checkout.session.completed` (PPV + VOD + subscription)
2. `customer.subscription.updated`
3. `customer.subscription.deleted`
4. `invoice.payment_succeeded`
5. `invoice.payment_failed`
6. `charge.refunded`

**Events evaluated for addition:**

| Event | Relevant? | Recommendation |
|-------|-----------|----------------|
| `charge.dispute.created` | **Yes — High** | A dispute/chargeback should be logged and ideally revoke access, similar to a refund. The app mentions chargebacks in the promoter dashboard (`ExampleDashboard.tsx` line 467) and STRIPE-AUDIT.md flagged disputes as a concern. Without this handler, disputed charges leave access intact even while the funds are frozen. **Filed as Issue 6.** |
| `checkout.session.expired` | Low | A checkout session that expires (user abandons Stripe Checkout) doesn't require DB action — no purchase was created. Useful for analytics only. ➖ Skip. |
| `customer.subscription.paused` / `resumed` | Low | The billing portal _can_ enable pause/resume, but the app's billing portal configuration would need to explicitly enable this. The email templates mention "paused" but only as future-tense language ("access will be paused"). If pausing is not enabled in the Stripe Dashboard billing portal settings, these events won't fire. ➖ **Flag for owner to verify.** |
| `customer.subscription.trial_will_end` | Low | The app includes `trialing` in active statuses, but STRIPE-AUDIT.md noted no trial period is configured in code. If trials are configured in the Stripe Dashboard, this event could trigger a heads-up email. ➖ **Flag for owner to verify.** |
| `invoice.payment_action_required` | Low | Fires when 3D Secure/SCA authentication is needed. Stripe handles the UX for this during checkout. Only relevant for off-session payments, which the app doesn't do (all payments are checkout-initiated). ➖ Skip. |
| `charge.dispute.closed` | Low | Fires when a dispute is resolved (won or lost). Could update the access revocation from `charge.dispute.created`. Nice to have but not critical. ➖ Skip for now. |

### Issue 6: No handler for `charge.dispute.created` — disputes leave access intact

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** N/A (missing handler)
- **Severity:** High
- **Description:** When a customer files a chargeback/dispute, Stripe sends `charge.dispute.created`. The webhook doesn't handle this event, so the customer retains full access to the content they're disputing payment for. This is both a revenue risk (user gets free access during dispute) and a dispute defense weakness (Stripe evaluates whether you took action on disputed charges). The `charge.refunded` handler sets `expires_at = now()` to revoke access — the same pattern should apply to disputes.
- **Suggested fix:** Add a `charge.dispute.created` handler that: (1) looks up the purchase by `payment_intent`, (2) sets `expires_at = now()` to revoke access, (3) logs the dispute for audit. If the dispute is later resolved in the merchant's favor, access can be manually re-granted.
- **Fixed?** Yes

**Owner action items (non-code):**
1. ✅ **DONE** — `charge.dispute.created` added to webhook endpoint in Stripe Dashboard.
2. **Billing Portal pausing:** Not currently enabled. Future enhancement — if enabled later, add `customer.subscription.paused` / `resumed` handlers.
3. **Trials:** Not configured on any Price. `trialing` in access checks is defensive and harmless. No change needed.

**Issues found:** 1 (Issue 6: High)

---

## Step 5: Error Isolation — ⚠️ Needs Attention

**Architecture:** All 6 event types live in a single `switch` inside one `try/catch` block (lines 59–494). Each webhook delivery carries a single event, so one event type can't crash another event type's processing — they're never concurrent in the same request. ✅

**However, the interaction between error handling and idempotency creates a data-loss scenario:**

1. Webhook receives event `evt_123`.
2. Dedup INSERT succeeds — `evt_123` is now in `stripe_events`.
3. Processing begins. A Stripe API call throws (e.g., `stripe.subscriptions.retrieve()` on line 200 times out).
4. The outer `catch` returns **500** to Stripe.
5. Stripe retries `evt_123`.
6. On retry, the dedup SELECT finds the existing row → returns `{ duplicate: true }` → **event is never processed**.

This means any Stripe SDK exception after the dedup INSERT permanently loses the event. The at-most-once delivery note from Step 2 covers this, but it can be improved.

**Specific throw points inside the switch (not individually try/caught):**

| Line | Call | Risk |
|------|------|------|
| 81 | `stripe.checkout.sessions.retrieve(session.id, { expand: [...] })` | VOD: fetch line items. Stripe rate limit or network error → throw. |
| 200 | `stripe.subscriptions.retrieve(subscriptionId)` | Subscription checkout: fetch full sub. Same risk. |

Supabase calls (lines 104, 179, 211, 258, etc.) return `{ error }` and don't throw — they're safe. Email sends are individually try/caught — also safe.

**Filed as Issue 7.**

### Issue 7: Stripe SDK throws after dedup INSERT cause permanent event loss

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 59–494 (outer try/catch), specifically lines 81 and 200
- **Severity:** Medium
- **Description:** The dedup record is inserted before processing begins. If a Stripe API call inside the switch throws (network error, rate limit), the outer catch returns 500. On Stripe's retry, the dedup check finds the record and skips processing. The event is permanently lost. This affects VOD checkouts (line 81: `sessions.retrieve` for line items) and subscription checkouts (line 200: `subscriptions.retrieve`).
- **Suggested fix:** Wrap the two Stripe API calls in individual try/catch blocks so a failure logs and breaks out of the case (returning 200 with partial processing) rather than throwing to the outer catch. Alternatively, delete the dedup record on failure (more complex). The individual try/catch approach is simpler and matches the email error handling pattern already in use.
- **Fixed?** Yes

**Issues found:** 1 (Issue 7: Medium)

---

## Step 6: Data Consistency (Webhook vs verify-payment) — ✅ Pass

**PPV write comparison (field-by-field):**

Both paths write the same core fields with values derived from the same Stripe Checkout Session object. Differences are intentional:

| Difference | Webhook | verify-payment | Why |
|------------|---------|----------------|-----|
| `session_claimed_at` | Not set | `new Date()` | Webhook creates the purchase row; verify-payment claims the session (cookie issuance). Only the first browser that hits the success page should get cookies. |
| `onConflict` behavior | Standard upsert (overwrites) | `ignoreDuplicates: true` (no-op if row exists) | verify-payment defers to the webhook's row if it already exists, then does a follow-up conditional UPDATE to set `session_claimed_at`. |
| `session_version` | Explicit `1` | Not set (DB default `1`) | Equivalent. |

**Race scenarios:**

1. **Webhook first, then verify-payment:** Webhook inserts the row. verify-payment's SELECT finds it, skips upsert, runs conditional UPDATE for `session_claimed_at`. ✅
2. **verify-payment first, then webhook:** verify-payment inserts with `session_claimed_at` set. Webhook upserts on conflict — **but this overwrites `session_claimed_at` to null** (webhook doesn't include it in the row). ⚠️ Wait — actually, the webhook's ppvRow doesn't include `session_claimed_at` at all. On upsert conflict, Supabase/Postgres only updates the columns present in the upsert row. Since `session_claimed_at` is not in the webhook's row, it's **not overwritten**. ✅
3. **verify-payment's SELECT misses, INSERT races with webhook:** verify-payment uses `ignoreDuplicates: true`, so its INSERT becomes a no-op. The follow-up UPDATE `.is('session_claimed_at', null)` then sets the claim. ✅ (Dev 2's fix)

**VOD write comparison (webhook vs save-session):**

Same pattern. Both upsert on `stripe_session_id`. save-session includes `session_claimed_at`; webhook doesn't. Fields otherwise match. ✅

**Verdict:** The two writers are well-coordinated. Dev 2 already patched the race condition. No new issues.

**Issues found:** 0

---

## Step 7: Subscription Lifecycle Transitions — ✅ Pass

Traced the full lifecycle through all actors: subscribe API, cancel API, reactivate API, billing portal, webhook handler, and `access.ts` reads.

### State transition map

```
[User subscribes]
  → subscribe API creates Stripe Checkout (mode: subscription)
  → Stripe fires checkout.session.completed
  → Webhook: upsert subscriptions { status: 'active', cancel_at_period_end: false }
  → access.ts: getSubscription() finds status IN ('active','trialing') → access granted ✅

[User cancels via app]
  → cancel-subscription API: stripe.subscriptions.update({ cancel_at_period_end: true })
  → Stripe fires customer.subscription.updated (cancel_at_period_end flipped)
  → Webhook: upsert { status: 'active', cancel_at_period_end: true }
  → Cancellation email sent ✅
  → access.ts: status still 'active' → access continues until period end ✅

[User cancels via billing portal]
  → Portal may use cancel_at (timestamp) instead of cancel_at_period_end
  → Webhook: effectivelyCanceling = cancel_at_period_end || !!cancelAt ✅
  → Both cancellation methods detected for email trigger ✅

[User reactivates]
  → reactivate-subscription API: clears both cancel_at_period_end and cancel_at
  → Stripe fires customer.subscription.updated
  → Webhook: effectivelyCanceling = false → upsert { cancel_at_period_end: false }
  → justCanceled = false → no cancellation email ✅

[Period ends after cancellation]
  → Stripe fires customer.subscription.deleted
  → Webhook: update { status: 'canceled', cancel_at_period_end: false }
  → access.ts: status 'canceled' NOT IN ('active','trialing') → access revoked ✅
  → Final cancellation email sent ✅

[Payment fails]
  → Stripe fires invoice.payment_failed
  → Webhook: update { status: 'past_due' }
  → access.ts: 'past_due' NOT IN ('active','trialing') → access revoked ✅
  → Payment failed email sent ✅

[Payment retried successfully after failure]
  → Stripe fires invoice.payment_succeeded + customer.subscription.updated
  → subscription.updated webhook: upsert { status: 'active', new period dates }
  → access.ts: status 'active' → access restored ✅

[Tier change (basic → premium or vice versa)]
  → Done via billing portal: Stripe fires customer.subscription.updated
  → Webhook: determineTier() reads price metadata → upsert { tier: new_tier }
  → access.ts: getSubscriptionTier() returns new tier ✅
```

### What I verified:

1. **Created → Active:** Handled by `checkout.session.completed` (subscription mode). Correctly retrieves the full subscription from Stripe to get period dates and tier from price metadata. ✅
2. **Active → Canceling:** `subscription.updated` detects both `cancel_at_period_end` and `cancel_at` cancellation methods. Maps both to `cancel_at_period_end: true` in DB. ✅
3. **Canceling → Reactivated:** Reactivate API clears both flags on Stripe, webhook receives the update and writes `cancel_at_period_end: false`. ✅
4. **Canceling → Canceled:** `subscription.deleted` correctly sets `status: canceled`. ✅
5. **Active → Past Due:** `invoice.payment_failed` sets `status: 'past_due'`. ✅
6. **Past Due → Active:** On successful retry, `subscription.updated` fires with `status: 'active'`. ✅
7. **Past Due → Canceled:** If all retries exhaust, `subscription.deleted` fires. ✅
8. **No `customer.subscription.created` handler needed:** Stripe fires both `checkout.session.completed` AND `customer.subscription.created` on new subscriptions. The checkout handler covers it. If a `subscription.created` event arrives, it falls through the switch silently (returns 200). No issue. ✅
9. **Duplicate cancellation emails:** A user cancels (gets email from `subscription.updated`), then the period ends (gets email from `subscription.deleted`). Two emails with the same subject line. Not a bug per se — the first is "scheduled to cancel" and the second is "has been canceled" — but worth noting. The email function receives `accessUntil` which differs between them, so the content is contextually different. ✅ Acceptable.
10. **Missing user_id fallback:** `subscription.updated` correctly falls back to update-by-`stripe_subscription_id` when `user_id` is missing from metadata. ✅

**Issues found:** 0

---

## Step 8: Invoice Events & Retry Handling — ✅ Pass

### `invoice.payment_succeeded`

1. **Correctly scoped to renewals:** `billing_reason !== 'subscription_cycle'` filter prevents sending a renewal email on the initial subscription payment (which gets its own confirmation email from `checkout.session.completed`). ✅
2. **Subscription ID extraction:** Uses `invoice.parent?.subscription_details` to get the subscription ID. This is the newer Stripe API pattern (v2024+). Handles both string and object forms. ✅
3. **No DB update:** This handler only sends a renewal email. It does NOT update subscription period dates or status. This is correct because Stripe fires `customer.subscription.updated` alongside `invoice.payment_succeeded` on renewal, and that handler updates the period dates via `getPeriodDates()`. ✅
4. **Email content:** Reads `tier` and `current_period_end` from the DB to populate the email. ✅
5. **Timing note:** If `invoice.payment_succeeded` arrives before `customer.subscription.updated`, the `current_period_end` in the DB is from the old period, and the renewal email shows a stale `nextRenewal` date. This is a cosmetic issue — the date will be approximately one billing period in the past. Low severity, and the fix (fetching fresh period from Stripe in the invoice handler) adds complexity for minimal benefit. ⚠️ Acceptable.
6. **Error handling:** Entire handler body is wrapped in try/catch. ✅

### `invoice.payment_failed`

1. **Status update:** Correctly sets subscription to `past_due`. This immediately revokes access since `access.ts` only allows `active` and `trialing`. ✅
2. **Subscription ID extraction:** Same `invoice.parent?.subscription_details` pattern. ✅
3. **Email content:** Includes `nextRetryDate` from `invoice.next_payment_attempt`. If Stripe has scheduled another attempt, users see when. If not (final failure), `nextRetryDate` is null and the email template handles it with generic retry language. ✅
4. **Retry handling:** Stripe's automatic retry system fires `invoice.payment_failed` on each failed attempt. Each one will hit this webhook, but idempotency is per-event (each retry is a different event ID), so the handler runs each time. It updates to `past_due` (idempotent since it's already `past_due`) and sends another email. Multiple payment-failed emails on retries is actually helpful — it reminds the user to update their card. ✅
5. **Recovery after past_due:** When a retry finally succeeds, `invoice.payment_succeeded` fires (renewal email) and `customer.subscription.updated` fires (status back to `active`, new period dates). Access is restored. ✅
6. **Update error not checked:** `supabase.from('subscriptions').update({ status: 'past_due' })` result not captured. Part of Issue 5. ⚠️ Already filed.

**Issues found:** 0 (timing note is cosmetic, update error is already Issue 5)

---

## Step 9: Refund Handling — ⚠️ Needs Attention

### What works:

1. **Full refund → access revoked:** `charge.refunded` sets `expires_at = now()`. All 4 access paths in `check-purchase` filter on `expires_at`, so access is immediately denied. ✅
2. **Payment intent extraction:** Handles both string and object forms of `charge.payment_intent`. ✅
3. **Missing PI guard:** If `payment_intent` is null (shouldn't happen for PPV/VOD charges), logs error and breaks. ✅
4. **Error handling:** DB error is checked and logged. No-match is warned. ✅
5. **VOD purchases:** VOD purchases have `stripe_payment_intent_id` as null (they use `stripe_session_id`). The refund handler queries by `stripe_payment_intent_id`, so VOD refunds won't match and will log the "no matching purchase" warning. This is actually a gap — but VOD charges DO have a payment intent (Stripe always creates one for `mode: payment`). The issue is that the webhook stores the session ID in `stripe_session_id` but the payment intent in... let me check.

Actually, looking back at the VOD webhook handler (line 95): `stripe_session_id: session.id` is set, but `stripe_payment_intent_id` is **not set** for VOD purchases. The PPV handler sets `stripe_payment_intent_id` but not `stripe_session_id`. They use different dedup keys.

So when a VOD purchase is refunded, `charge.refunded` fires with the `payment_intent` from the charge. The handler queries `purchases.stripe_payment_intent_id = paymentIntentId` — but VOD rows don't have that column populated. **The refund won't match.** Access is NOT revoked for VOD refunds.

**Filed as Issue 8.**

### Partial refund behavior:

Stripe fires `charge.refunded` for both full and partial refunds. The current handler unconditionally sets `expires_at = now()` regardless of refund amount. A $5 partial refund on a $50 PPV purchase would revoke all access.

This is actually a **reasonable default** for a streaming platform — partial refunds are typically issued as goodwill gestures when service was degraded, and the admin can manually restore access via the grant tool if needed. The alternative (checking `charge.amount_refunded === charge.amount`) adds complexity for an edge case. ✅ Acceptable as-is.

### Issue 8: VOD refunds don't revoke access

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Line(s):** 457–487
- **Severity:** High
- **Description:** The `charge.refunded` handler looks up purchases by `stripe_payment_intent_id`. VOD purchases are stored with `stripe_session_id` as their dedup key — `stripe_payment_intent_id` is null on VOD rows. When a VOD purchase is refunded, the charge carries the payment intent, but there's no matching row in the DB. The handler logs a "no matching purchase" warning and exits. The customer keeps lifetime access to the refunded VOD content.
- **Suggested fix:** When the `stripe_payment_intent_id` lookup returns no results, fall back to looking up by the charge's checkout session. Alternatively, store the `payment_intent` on VOD purchase rows during the `checkout.session.completed` handler (the session object has `payment_intent` available). The second approach is cleaner and fixes the root cause. **Both approaches applied:** VOD rows now store `stripe_payment_intent_id` from the session (new purchases), and both `charge.refunded` and `charge.dispute.created` have a fallback lookup by checkout session ID (legacy purchases). `save-session/route.ts` also updated to store the payment intent.
- **Fixed?** Yes

**Issues found:** 1 (Issue 8: High)

---

## Summary

- **Total issues found:** 8 (all fixed)
- **Critical:** 0
- **High:** 2 — Issue 6 (no dispute handler), Issue 8 (VOD refunds don't revoke access)
- **Medium:** 4 — Issue 2 (dedup error fallthrough), Issue 4 (PPV no confirmation email), Issue 5 (silent subscription errors), Issue 7 (Stripe SDK throws lose events)
- **Low:** 2 — Issue 1 (own Stripe client), Issue 3 (no RLS on stripe_events)
- **All 8 issues have been fixed.** No code changes remain.
- **Owner actions completed:** `charge.dispute.created` enabled in Stripe Dashboard, RLS applied to production `stripe_events` table, confirmed no trial/pausing configuration.

### Files Modified
- `src/app/api/webhooks/stripe/route.ts` — Issues 1, 2, 4, 5, 6, 7, 8
- `src/app/api/save-session/route.ts` — Issue 8 (store `stripe_payment_intent_id` on VOD rows)
- `supabase/schema.sql` — Issue 3 (RLS on `stripe_events`)