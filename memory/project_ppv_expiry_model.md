---
name: PPV access expiry model
description: How PPV purchase expiry works — derived from event.date
type: project
---

All PPV access windows are derived from `event.date`:

- **Purchase deadline:** `event.date + 2 days` — after this, `ppv-checkout` blocks new purchases.
- **Replay deadline:** `event.date + 4 days` — `purchase.expires_at` is set to this at purchase time.

There is no `expires_at` column on the `events` table. The `purchases.expires_at` column stores the computed deadline (`event.date + 4 days`) and is the single source of truth for individual access checks.

**Constants:** `REPLAY_WINDOW_DAYS = 4` (verify-payment, webhook, redeem-promo, recover-access, watch page), `PURCHASE_WINDOW_DAYS = 2` (ppv-checkout).

**Refunds:** The webhook sets `purchase.expires_at = now()` to immediately revoke access.

**VOD:** `purchases.expires_at` is `null` for VOD (true lifetime access).
