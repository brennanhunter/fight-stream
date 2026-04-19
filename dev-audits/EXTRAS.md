#Check my schema.sql for any useless entries

# Subscription Pausing (Future Enhancement)

If you decide to enable pause/resume in the Stripe Billing Portal:

1. **Stripe Dashboard:** Enable "Pause subscriptions" in Billing Portal settings.
2. **Webhook events:** Add `customer.subscription.paused` and `customer.subscription.resumed` to the webhook endpoint in Stripe Dashboard.
3. **Webhook handler:** Add `customer.subscription.paused` and `customer.subscription.resumed` cases in `src/app/api/webhooks/stripe/route.ts`. The `paused` handler should update the subscription row's `status` to `'paused'` and revoke access. The `resumed` handler should restore `status` to `'active'` and re-grant access.
4. **Access check:** `src/lib/access.ts` already includes `'trialing'` in active statuses — add `'paused'` to the **denied** list (or just ensure it's not in the allowed list, which is already the case).
5. **Email templates:** The existing subscription emails already reference "paused" language. Consider adding a dedicated `subscription-paused.tsx` and `subscription-resumed.tsx` email if you want explicit pause/resume notifications.
6. **UI:** Add a visual indicator on the account subscription page when status is `'paused'`, explaining when access will resume.

expires_at was removed from my supabase because we changed it to just be 48 hours after event_date I think, but we still use it in a lot of code. Just look into it and explain to me.

Look into geolocation stuff.

