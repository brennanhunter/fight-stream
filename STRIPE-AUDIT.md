# Stripe Risk Audit — BoxStreamTV

> Last updated: 2026-04-05

---

## CRITICAL (Fix immediately)

### 1. Missing statement descriptors on all charges
All three checkout routes (`src/app/api/checkout/route.ts`, `src/app/api/subscribe/route.ts`, `src/app/api/ppv-checkout/route.ts`) create Stripe sessions without a `statement_descriptor`. Customers see a cryptic charge, don't recognize it, and chargeback. This is the #1 cause of Stripe restrictions for streaming sites.

**Fix:** Add `statement_descriptor: "BOXSTREAMTV"` and `statement_descriptor_suffix` to every checkout session.

---

### 2. Conflicting refund policies (Terms vs. FAQ)
- `src/app/terms/page.tsx` says: "no refunds / final sale"
- `src/app/faq/page.tsx` says: "case-by-case basis"

Stripe reviews both pages when evaluating disputes. Contradictory policies are a red flag and weaken dispute defense.

**Fix:** Pick one policy and make both pages consistent.

---

### 3. No VOD purchase confirmation email
The webhook handles VOD purchases (`src/app/api/webhooks/stripe/route.ts` ~lines 78–115) but never sends the purchase confirmation email that exists in `src/lib/emails/purchase-confirmation.ts`. PPV sends it; VOD doesn't. Customers with no receipt are far more likely to dispute charges.

**Fix:** Call the purchase confirmation email in the VOD webhook handler branch.

---

## HIGH RISK

### 4. No pre-checkout billing frequency disclosure
Subscriptions show a price but no explicit "You will be charged $X every month, starting [DATE]" before the Stripe redirect. Stripe's card network rules require this for recurring billing. Violations generate "unauthorized recurring charge" disputes.

**Fix:** Add clear recurring charge language on `src/app/pricing/PricingCards.tsx` and the subscribe confirmation screen.

---

### 5. Ambiguous content delivery guarantees
PPV users pay upfront for live events with no stated policy on what happens if the event is cancelled, postponed, or the stream fails. "Service not received" is a top chargeback reason for streaming. Terms mention blackouts but not cancellations.

**Fix:** Add an explicit cancellation/interruption policy to `src/app/terms/page.tsx` and show it near the PPV checkout button.

---

### 6. `trialing` status in access checks without visible trial config
`src/lib/access.ts` (line 11) includes `'trialing'` as an active state, but no trial period is set in any checkout session creation. If trials are being configured on the Stripe dashboard (not in code), there is no in-app disclosure to users about trial-to-paid conversion. Surprise charges after a trial are a major dispute driver.

**Fix:** Either configure and disclose trials explicitly in code, or remove `'trialing'` from active status checks if not in use.

---

## MEDIUM RISK

### 7. Anonymous checkout with no fraud signals
`src/app/api/checkout/route.ts` and `src/app/api/ppv-checkout/route.ts` allow email-only anonymous purchases. No authentication means no ability to detect repeat fraud patterns across sessions.

**Fix:** Pass `customer_email` and available metadata (IP, user agent) to the Stripe session to improve Stripe Radar scoring.

---

### 8. Promo code race condition
`src/app/api/redeem-promo/route.ts` uses `ignoreDuplicates` to handle concurrent redemptions, but the second request returns a confusing error. A user double-clicking could abandon the redemption and attempt payment instead, creating double-charge support tickets.

---

### 9. Subscription cancellation buried in Stripe portal
`src/app/account/subscription/page.tsx` only shows a "Manage Billing" button. Customers who cannot find how to cancel will chargeback instead. Stripe explicitly looks for accessible cancellation paths during account reviews.

**Fix:** Surface a cancel subscription option directly on the account page rather than hiding it in the billing portal.

---

## What's Good
- Webhook deduplication is properly implemented (`stripe_events` table with unique event ID)
- All transactional emails exist: subscription confirmation, renewal, cancellation, payment failed
- Rate limiting on all payment routes (`src/lib/rate-limit.ts`)
- Webhook handles refunds by revoking access correctly
- Terms and Privacy pages are comprehensive and linked in footer

---

## Priority Order
If you need to sequence fixes to reduce Stripe restriction risk first:

1. **Statement descriptors** (#1) — prevents the most chargebacks
2. **VOD confirmation email** (#3) — removes a direct dispute trigger
3. **Conflicting refund policy** (#2) — strengthens dispute defense
4. **Billing frequency disclosure** (#4) — required by card network rules for recurring billing
5. **Cancellation UX** (#9) — Stripe looks for this during account reviews
