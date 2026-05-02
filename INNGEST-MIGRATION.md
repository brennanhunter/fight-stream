# Migrate Off Inngest — Build Plan

Replace Inngest with Vercel Cron Jobs + Postgres-driven polling. Eliminates one paid vendor, uses infrastructure already covered by the Vercel + Resend bill, and gives the survey emails better reliability than the current narrow-window cron.

## Why migrate

Inngest's free tier (~50K function runs/month, subject to change) doesn't cover sustained scale. At **5,000 VOD buys/day** the survey path alone runs ~150K times/month — comfortably into Inngest's first paid tier (~$50–75/month at current pricing).

Beyond cost, two operational reasons:

1. **The 11–13 hour PPV survey window is fragile.** A single missed cron tick (deploy, signing-key rotation, cold-start) ages an event out of the window forever and the survey never gets sent. Polling-with-atomic-claim handles this naturally.
2. **Per-email send failures are silently swallowed today.** `Promise.all(...).catch((err) => console.error(...))` — Inngest's `step.run` retries aren't actually used in our code. A poll-based replacement gives us per-email retries by re-querying the same `survey_sent_at IS NULL` set on the next tick.

## What we use Inngest for today

All registered in [`src/app/api/inngest/route.ts`](src/app/api/inngest/route.ts):

| Function | Trigger | Replacement pattern |
|---|---|---|
| `eventReminderFunction` | Cron | Vercel Cron → `/api/cron/event-reminder` |
| `eventStartingFunction` | Cron | Vercel Cron → `/api/cron/event-starting` |
| `eventAnnounceFunction` | Inngest event from admin | Direct Server Action — no scheduling needed |
| `ppvSurveyFunction` | Cron `0 * * * *` | Vercel Cron `0 * * * *` → `/api/cron/ppv-survey` |
| `vodSurveyFunction` | `survey/vod-purchased` event + `step.sleep('1h')` | Vercel Cron `*/5 * * * *` → `/api/cron/vod-survey` (polls for purchases that just crossed the 1-hour mark) |

## Replacement architecture

**Pattern**: every "send N hours after X" becomes a polling cron that finds rows whose `created_at + delay` window overlaps the last cron tick AND `<sent_at_column> IS NULL`. Atomic claim on the column prevents double-sends across overlapping runs.

```
Vercel Cron (every 5 min)
   ↓
/api/cron/vod-survey (HTTP route)
   ↓
SELECT purchases WHERE purchase_type = 'vod'
                AND purchased_at BETWEEN now() - 65min AND now() - 60min
                AND survey_sent_at IS NULL
   ↓
For each row: atomic UPDATE survey_sent_at = now() WHERE survey_sent_at IS NULL RETURNING *
   ↓
Resend email
   ↓
On failure: column stays NULL → retried on next tick (built-in retry, no `step.run` needed)
```

Same pattern for PPV survey, event reminder, event starting — only the SQL filter changes.

## Phased migration

### Phase A — PPV survey (lowest risk, biggest cost saver)

PPV survey already has the most production traffic and the narrowest existing window. Easiest win.

1. Create `/api/cron/ppv-survey/route.ts` — same SQL + Resend code as `ppvSurveyFunction`, just inside an HTTP route handler. Authenticate via Vercel cron secret (`x-vercel-cron-signature` or shared bearer in `CRON_SECRET` env).
2. **Widen the window while migrating**: change "11–13h ago" to "≥11h ago AND `survey_sent_at IS NULL`". Already-sent events skip via the atomic claim.
3. Add to `vercel.ts`:
   ```ts
   crons: [
     { path: '/api/cron/ppv-survey', schedule: '0 * * * *' },
   ]
   ```
4. Remove `ppvSurveyFunction` from `inngest/functions.ts` and from the `/api/inngest` route's `functions` array.
5. Deploy and verify the next event survey send via the admin event drilldown's Feedback tab.

### Phase B — VOD survey (delayed-execution replacement)

This is the trickier one because Inngest's `step.sleep('1h')` is doing real work today. Polling replaces it.

1. Create `/api/cron/vod-survey/route.ts`:
   ```ts
   const since = new Date(Date.now() - 65 * 60 * 1000).toISOString();
   const until = new Date(Date.now() - 60 * 60 * 1000).toISOString();

   const { data: rows } = await supabase
     .from('purchases')
     .select('id, email, product_name')
     .eq('purchase_type', 'vod')
     .gte('purchased_at', since)
     .lte('purchased_at', until)
     .is('survey_sent_at', null);
   ```
2. For each row: atomic claim `UPDATE … RETURNING id`, then send. On send failure, leave `survey_sent_at` NULL — next tick retries.
3. Add to `vercel.ts`:
   ```ts
   { path: '/api/cron/vod-survey', schedule: '*/5 * * * *' }
   ```
4. Remove `survey/vod-purchased` Inngest event emission in the Stripe webhook ([route.ts:156](src/app/api/webhooks/stripe/route.ts#L156)).
5. Remove `vodSurveyFunction` from `inngest/functions.ts` and the route registration.

**Window math note**: a 5-minute cron with a 5-minute lookback window covers normal operation. If a cron tick is skipped, we widen on the next run via `purchased_at BETWEEN now() - 24h AND now() - 60min` for catch-up — a tradeoff between catch-up coverage and risk of late-sending stale survey emails. Current default: 65 minutes is fine for normal operation; widen if catch-up matters.

### Phase C — Event reminder + starting

Both are cron-based today. Same Vercel Cron treatment as Phase A. Schedule whatever cadence makes sense per function.

### Phase D — Event announce

Currently Inngest-event-triggered from the admin announce form. No delay involved — just a fan-out email send. Convert to a **Server Action** that does the send synchronously (or with `waitUntil` for fire-and-forget). No cron needed.

### Phase E — Cleanup

1. Remove `inngest`, `@inngest/*` from `package.json`.
2. Delete `/api/inngest/route.ts`.
3. Delete `src/inngest/` directory.
4. Remove `INNGEST_*` env vars from Vercel project settings.
5. Cancel Inngest subscription.

## Implementation details

### Cron auth

Vercel Cron Jobs hit your endpoint with a `User-Agent: vercel-cron/1.0` header and (on Pro plan) you can additionally validate via `x-vercel-cron-signature`. For paranoid setups, also set a shared `CRON_SECRET` env var and require `Authorization: Bearer ${CRON_SECRET}` on the route. Reference: <https://vercel.com/docs/cron-jobs>.

### Idempotency

Every cron route uses the same pattern: `SELECT … WHERE <sent_at_column> IS NULL` followed by an `UPDATE … WHERE id = ? AND <sent_at_column> IS NULL RETURNING id`. The atomic claim on the `IS NULL` predicate guarantees only one cron invocation can pick up a given row. If two crons overlap (deploy in progress, retry in flight), the second one's UPDATE returns 0 rows and skips the send.

### Retries

Implicit. If a send fails, we **don't** stamp `survey_sent_at`, so the row stays in the eligible set on the next cron tick. For permanently-failing emails (bounces, blocks), add a `survey_attempts` integer column and skip rows with `attempts >= 3` to prevent infinite retries on bad addresses.

### Observability

Vercel Cron runs show up in the Logs tab. For per-cron summary metrics (sent / skipped / failed), log a structured JSON line at the end of each invocation.

## Cost picture after migration

| Vendor | Today | After migration |
|---|---|---|
| Inngest | $50–75+/month (estimated at 5K buys/day) | $0 |
| Vercel | Existing Pro subscription | Existing Pro subscription (cron usage trivial) |
| Resend | Existing | Existing |

**Compute footprint added to Vercel**: hourly cron + 5-minute cron + occasional reminder/starting/announce = ~10K invocations/month, sub-second each. Pennies on Active CPU pricing.

## Alternative — Vercel Workflow DevKit

Vercel released **Workflow DevKit** which is essentially Inngest's value proposition (durable steps, retries, sleeps, crash recovery) native to Vercel and billed via existing compute.

If we want the durable-step DX without a separate vendor, this is the more direct port: keep the `step.run` / `step.sleep` shape, just import from Workflow DevKit instead of Inngest.

**Tradeoff**:
- Cron + polling is simpler, more proven, less abstraction. Recommended for our scale.
- Workflow DevKit gives us a future-proof option if step graphs get complex (multi-step user-onboarding flows, etc.). Currently we don't need that complexity.

**Recommendation**: ship Phase A–E (cron + polling) first. Reach for Workflow DevKit only if a future feature genuinely needs durable multi-step orchestration.

## Risks

| Risk | Mitigation |
|---|---|
| Cron lag during deploys | 5-min polling window has natural slack; one missed tick still catches purchases on the next run via the `IS NULL` predicate. |
| Bad emails retried forever | Add `survey_attempts INT NOT NULL DEFAULT 0` column, increment on send attempt, skip when `≥3`. |
| Vercel Pro cron limits | Pro includes generous cron allowances; we'd use 4–5 cron jobs total. Verify before production. |
| Race condition between `survey/vod-purchased` Inngest event and the new cron during the migration window | Land Phase B's webhook removal and the cron in the same deploy. Or: keep both temporarily — they share `survey_sent_at`, so whichever fires first wins. |
| Permanently dropped Inngest functions during cleanup | Phase E only runs after A–D have been validated for at least one full event cycle. |

## Open questions to resolve before starting

- Are we currently on the **right Inngest tier** to confirm the cost number? Pull the Inngest billing page to verify the assumed $50–75/month before committing.
- Do we want **Vercel Workflow DevKit** instead? Decision point: how complex do we expect post-purchase flows to get? If "send X N hours after Y" is the entire surface, cron + polling is the right choice.
- Add `survey_attempts` column up front, or only when we hit a bad-email retry loop?
- Should event reminder / starting emails also widen their windows during migration? They're not currently in scope but share the same fragility.

## Rough size

- Phase A (PPV survey): ~30 min
- Phase B (VOD survey): ~45 min (touches webhook)
- Phase C (event reminder + starting): ~30 min
- Phase D (announce → Server Action): ~30 min
- Phase E (cleanup): ~15 min

**Total: ~2.5 hours** of focused work. Each phase ships independently and is reversible (just re-add the Inngest function and the route handler).

## Verify before deleting Inngest

After Phase D, run for **one full event cycle** (one PPV event with surveys, plus a few VOD purchases hitting the 1-hour mark) and confirm:

1. `events.survey_sent_at` gets stamped on the right schedule.
2. `purchases.survey_sent_at` gets stamped ~1 hour after VOD purchases.
3. Resend dashboard shows the expected delivery counts.
4. No errors in Vercel cron logs.

Only then run Phase E.
