# Audit: Subscriptions & Billing

**Auditor:** Dev 4
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

Subscription purchase, management, cancellation, reactivation, and billing portal.

### Files reviewed

| Type | Files |
|------|-------|
| API | `src/app/api/subscribe/route.ts`, `src/app/api/cancel-subscription/route.ts`, `src/app/api/reactivate-subscription/route.ts`, `src/app/api/billing-portal/route.ts` |
| Pages | `src/app/pricing/page.tsx`, `src/app/pricing/PricingCards.tsx`, `src/app/account/subscription/page.tsx` |
| Lib | `src/lib/access.ts` (subscription tier logic), `src/lib/stripe.ts` (shared client) |
| Cross-checks | `src/app/api/webhooks/stripe/route.ts` (subscription lifecycle events), `supabase/schema.sql` (subscriptions table), `src/app/account/page.tsx` (account overview) |

---

## Audit Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Can an unauthenticated user hit subscribe/cancel/reactivate? Are all routes gated on `getUser()`? | ✅ Pass | All 4 API routes call `createAuthServerClient()` → `getUser()` and return 401 if no user. |
| 2 | Stripe customer creation — are duplicate Stripe customers prevented? | ⚠️ Needs attention | Only checks local `subscriptions` table for stored `stripe_customer_id`. If user abandoned a prior checkout (no webhook row written), the customer ID is lost and a new one is created. See Issue 5. |
| 3 | Cancel flow — `cancel_at_period_end` vs `cancel_at` — are both cases handled? | ⚠️ Needs attention | Cancel route uses `cancel_at_period_end: true` (correct). But status filter excludes `past_due`, creating a broken UX. See Issue 2. Webhook correctly normalizes both `cancel_at` and `cancel_at_period_end` into unified `cancel_at_period_end: true` in the DB. |
| 4 | Reactivation — does it correctly clear cancellation on Stripe's side? | ✅ Pass | Retrieves live subscription from Stripe, checks both `cancel_at_period_end` and `cancel_at`, clears both. Works for both cancellation mechanisms. |
| 5 | Billing portal — is the return URL safe from open redirect? | ✅ Pass | Hardcoded from `NEXT_PUBLIC_BASE_URL` env var — no user input. |
| 6 | Subscription tier resolution — `getSubscriptionTier()` correctness and caching | ✅ Pass | Simple DB query for `active`/`trialing` status, returns tier. No caching needed. `past_due` intentionally excluded (confirmed by Dev 3: access revoked immediately on payment failure, restored when retry succeeds via `customer.subscription.updated`). |
| 7 | Pricing page — are prices fetched server-side or hardcoded? Can they drift from Stripe? | ✅ Pass | `getStripePrices()` calls `stripe.prices.retrieve()` server-side. Fallback display strings (`$9.99`/`$19.99`) only used if API call fails — cosmetic only, actual checkout amount always resolved by Stripe. |

---

## Issues Found

### Issue 1: Subscribe `priceId` not validated against allowlist

- **File:** `src/app/api/subscribe/route.ts`
- **Line(s):** 23–27, 79
- **Severity:** Medium
- **Description:** The `priceId` is taken from the request body and passed directly to `stripe.checkout.sessions.create` with no validation. The price IDs are in `NEXT_PUBLIC_` env vars (exposed in the client bundle). Unlike the PPV checkout route (which validates `priceId` against `event.stripe_price_id` from the DB), this route accepts any Stripe recurring price ID. An attacker could substitute a different recurring price from the same Stripe account (e.g., an old test price at $0.01 or a different product entirely). Stripe enforces `mode: 'subscription'` so one-time prices would be rejected, but any recurring price would succeed.
- **Suggested fix:** Validate `priceId` against an allowlist of `[process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID, process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID]` before creating the checkout session.
- **Fixed?** Yes — Added `ALLOWED_PRICE_IDS` allowlist built from env vars. Combined with the null check: `if (!priceId || !ALLOWED_PRICE_IDS.includes(priceId))` returns 400.

### Issue 2: `cancel-subscription` excludes `past_due` status

- **File:** `src/app/api/cancel-subscription/route.ts`
- **Line(s):** 28
- **Severity:** Medium
- **Description:** The status filter is `['active', 'trialing']` but the subscription management page (`account/subscription/page.tsx` line 52) shows subscriptions with `['active', 'trialing', 'past_due']`. A `past_due` subscription is shown with a Cancel button, but clicking it returns "No active subscription found" (404). The user is stuck — they can't cancel a subscription with failing payments through our UI. They'd need to use the Stripe billing portal instead, but the UX is broken and confusing.
- **Suggested fix:** Add `'past_due'` to the status filter: `.in('status', ['active', 'trialing', 'past_due'])`.
- **Fixed?** Yes

### Issue 3: `reactivate-subscription` excludes `past_due` status

- **File:** `src/app/api/reactivate-subscription/route.ts`
- **Line(s):** 28
- **Severity:** Medium
- **Description:** Same filter gap as Issue 2. If a `past_due` subscription also has `cancel_at_period_end: true` (e.g., user canceled, then payment failed on next cycle), the user sees the Reactivate button but gets a 404. Edge case but still a broken path.
- **Suggested fix:** Add `'past_due'` to the status filter: `.in('status', ['active', 'trialing', 'past_due'])`.
- **Fixed?** Yes

### Issue 4: All 4 API routes + pricing page use unsafe `new Stripe()` instead of shared client

- **File:** `src/app/api/subscribe/route.ts`, `src/app/api/cancel-subscription/route.ts`, `src/app/api/reactivate-subscription/route.ts`, `src/app/api/billing-portal/route.ts`, `src/app/pricing/page.tsx`
- **Line(s):** Line 8 (subscribe), Line 7 (cancel), Line 7 (reactivate), Line 7 (billing-portal), Line 8 (pricing)
- **Severity:** Low
- **Description:** All files create `new Stripe(process.env.STRIPE_SECRET_KEY!)` with a non-null assertion. If the env var is missing, this throws a cryptic runtime error at module load time. The webhook handler (fixed by Dev 3) and ppv-checkout (fixed by Dev 2) already use the shared null-safe `stripeServer` from `src/lib/stripe.ts`. These files should follow the same pattern.
- **Suggested fix:** Import `stripeServer` from `@/lib/stripe`, add null guard returning 500 early. Replace all `stripe.` calls with `stripeServer.`. For the pricing page (server component), add null guard returning fallback prices.
- **Fixed?** Yes — All 5 files now import `stripeServer`. API routes have early null guard returning 500. Pricing page conditionally calls Stripe if `stripeServer` is available, falls back to default display values.

### Issue 5: Stripe customers can be orphaned and duplicated on abandoned checkouts

- **File:** `src/app/api/subscribe/route.ts`
- **Line(s):** 49–66
- **Severity:** Low
- **Description:** The route checks the local `subscriptions` table for a stored `stripe_customer_id`. If the user previously started a checkout but abandoned it (browser closed before payment), the Stripe customer was created but no subscription row was written by the webhook. The `stripe_customer_id` is lost, so the next attempt creates a new Stripe customer. Over time this creates orphaned customer objects in Stripe. Not a security issue, but a data hygiene issue.
- **Suggested fix:** Before creating a new customer, call `stripe.customers.list({ email: user.email, limit: 1 })` to find an existing customer. This covers both abandoned-checkout and cross-device scenarios.
- **Fixed?** Yes — Added `stripeServer.customers.list({ email, limit: 1 })` lookup before creating a new customer.

### Issue 6: Subscribe error handler leaks Stripe internals to client

- **File:** `src/app/api/subscribe/route.ts`
- **Line(s):** 91
- **Severity:** Low
- **Description:** The catch block returns `error instanceof Error ? error.message : 'Subscription checkout failed'`. Stripe SDK errors include detailed messages (API rate limits, key issues, amounts, etc.) that should not be exposed to the client. The other 3 routes in scope use generic error messages.
- **Suggested fix:** Return a generic error: `{ error: 'Subscription checkout failed' }`. Log the original error server-side only (already done via `console.error`).
- **Fixed?** Yes

### Issue 7: Reactivate route has unnecessary type assertions and fragile `cancel_at` clearing

- **File:** `src/app/api/reactivate-subscription/route.ts`
- **Line(s):** 39–44
- **Severity:** Low
- **Description:** Two related issues: (a) `cancel_at` is cast as `(stripeSub as Stripe.Subscription & { cancel_at: number | null }).cancel_at` — but `cancel_at` is already defined on `Stripe.Subscription` in the installed SDK (stripe v19.3.0, confirmed in `node_modules/stripe/types/Subscriptions.d.ts:60`). The assertion is unnecessary. (b) `cancel_at: null as unknown as number` is a fragile double-cast. The Stripe SDK's `SubscriptionUpdateParams` accepts `Stripe.Emptyable<number>` (i.e., `number | ''`). The idiomatic way to clear `cancel_at` is with an empty string: `cancel_at: ''`.
- **Suggested fix:** Remove the type assertion, access `stripeSub.cancel_at` directly. Use `cancel_at: ''` instead of `null as unknown as number`.
- **Fixed?** Yes — Removed type assertion, access `stripeSub.cancel_at` directly. Clear with `cancel_at: '' as Stripe.Emptyable<number>`.

---

## What Passed

- **Authentication gating:** All 4 API routes call `getUser()` via `createAuthServerClient()` and return 401 if missing. Rate limiting enforced on all 4.
- **Billing portal return URL:** Hardcoded from `NEXT_PUBLIC_BASE_URL` — no user input, no open redirect vector.
- **Reactivation logic:** Correctly handles both `cancel_at_period_end` and `cancel_at` cancellation mechanisms. Retrieves live subscription from Stripe to check which is active.
- **Pricing page integrity:** Prices fetched server-side from Stripe API. Fallback display values are cosmetic only — actual charge amount always resolved by Stripe from the Price object.
- **Subscription tier resolution:** `getSubscriptionTier()` in `access.ts` is straightforward: queries DB for `active`/`trialing`, returns tier. `past_due` is intentionally excluded from ACTIVE_STATUSES (access revoked → user prompted to update payment method). Confirmed correct by Dev 3's webhook audit.
- **PPV discount logic:** `getPpvDiscount()` returns correct percentages (100% premium, 25% basic, 0% none). Pure derivation from tier.
- **VOD access check:** `hasVodAccess()` correctly falls through from subscription check to individual purchase check.
- **Webhook coexistence:** Subscribe route's `success_url` points to `/account/subscription?success=true`. The page polls up to 5 times (3s apart) waiting for the webhook to write the subscription row. Clean separation of concerns.
- **Cancel flow correctness:** Uses `cancel_at_period_end: true` (not immediate cancellation). User keeps access until period end. Webhook correctly normalizes both cancellation mechanisms.
- **Duplicate subscription prevention:** Subscribe route checks for existing subscription with status `['active', 'trialing', 'past_due']` before creating checkout session.
- **Idempotency:** Subscribe route generates idempotency key from `user_id:priceId:minute_window`.

---

## Summary

- **Total issues found:** 7
- **Critical:** 0
- **High:** 0
- **Medium:** 3 (priceId validation, cancel status filter, reactivate status filter)
- **Low:** 4 (shared Stripe client, orphaned customers, error message leak, type assertion cleanup)
- **Additional notes:** The `access.ts` file is shared with Dev 5. No changes needed to `access.ts` — its logic is correct. The `past_due` exclusion from `ACTIVE_STATUSES` is intentional and confirmed by Dev 3's webhook audit (access is revoked on payment failure, restored on successful retry).

---

### Coordination Notes

- **From Dev 8 (Admin Panel):** `tsc --noEmit` shows 4 errors in `.next/types/validator.ts` for your routes: `billing-portal`, `cancel-subscription`, `reactivate-subscription`, and `subscribe`. All have the same cause — `rateLimit()` can return `null`, so the route handler return type becomes `Promise<NextResponse | null>` which doesn't satisfy Next.js's `RouteHandlerConfig` constraint (`void | Response`). Fix: either change `rateLimit()` to always return a `Response` (not `null`), or add a guard like `if (!blocked) { ... }` so the return type is always `NextResponse`.
