# Admin Panel Rework — Build Plan

## The problem

Today's `/admin` is a single 600+ line page with everything stacked vertically:

- Header / logout
- Active event status card
- Stats grid (3 cards)
- Boxer comp leaderboard
- Event payouts table (now 8 columns wide)
- Announce form
- Grant access form
- Send VOD recovery form
- Feedback table
- Customer search
- Recent purchases table

There's no navigation, no grouping, no way to drill into a single event, and no way to filter or sort tables. As features keep landing (VOD recovery, refunds, refund backfill, VOD column, soon overlay control + VOD mapping), the page is becoming unfindable. The user's exact symptom: "I can't even find the VOD purchases on it now."

## Goal

Restructure into a multi-page panel with proper information architecture, shadcn primitives, and modern Next.js App Router patterns (Server Components by default, Server Actions for mutations, Suspense streaming for slow data, route-segment caching).

## Reference projects

The stack and patterns below aren't invented — they mirror what the Vercel-team-recommended SaaS starter and other Vercel-adjacent open-source admin panels use today.

- **next-forge** (`npx next-forge init`) — Vercel's officially-recommended SaaS starter, by Hayden Bleasel. **This is the canonical reference for our rework.** Clone it locally and study `apps/app` — the file layout, Server Action patterns, DataTable usage, and Sheet-based forms are exactly the shape we want.
- **Vercel Platforms Starter Kit** (`vercel/platforms`) — multi-tenant SaaS pattern, same stack.
- **AI Chatbot** (`vercel/ai-chatbot`) — shadcn + Server Actions.
- **Cal.com** and **Dub.co** dashboards — both shadcn + sidebar; useful for cross-checking sidebar IA decisions.

**Alternative we're not picking**: Geist (Vercel's own internal design system, `geist-ui.dev`). It's what `vercel.com` itself runs on, but it's a smaller ecosystem, less customizable, and Vercel's own newer products and templates have moved to shadcn. Sticking with shadcn — same thing the official starter uses.

## Tech choices

Match next-forge's stack exactly so we benefit from a battle-tested pattern:

- **shadcn/ui** for primitives. Specifically we'll use: `Sidebar`, `Card`, `Tabs`, `Table` + TanStack DataTable, `Dialog` / `Sheet`, `Form` (react-hook-form + zod), `Button`, `Badge`, `Input`, `Label`, `DropdownMenu`, `Skeleton`, `Separator`, `Command` (cmdk).
- **Sonner** for toast notifications (Emil Kowalski's library, also the next-forge default).
- **Server Components** for everything that doesn't need client state. Client components only for forms, dropdowns, dialogs.
- **Server Actions** instead of `/api/admin/*` routes for mutations. Less boilerplate, automatic `revalidatePath` / `revalidateTag` integration, native pending state via `useActionState`. Existing routes can be deleted as they're replaced.
- **`<Suspense>` streaming** so the shell paints instantly and stats stream in. The current `force-dynamic` everywhere blocks the whole render.
- **Route-segment caching** with tags (`{ next: { tags: ['admin:purchases'] } }`) and `revalidateTag()` after mutations, rather than blanket `force-dynamic`.
- **Auth gate at the layout level** (`/admin/layout.tsx`) — one cookie check protects the entire subtree. Today every page does its own.
- **`⌘K` Command palette** (cmdk) — jump to any event, customer search, common actions. High-leverage for an admin tool. (Optional Phase 9.)

## Information architecture

```
src/app/admin/
├── layout.tsx                  # auth gate + sidebar shell
├── page.tsx                    # redirect → /admin/dashboard
│
├── dashboard/
│   └── page.tsx                # KPIs (today, refunds, subs), active event card,
│                               # quick actions, recent activity
│
├── events/
│   ├── page.tsx                # events table — sortable, filterable
│   │                           # per-event row: PPV count, PPV revenue,
│   │                           # VOD count, tier, promoter cut, our cut
│   └── [id]/
│       └── page.tsx            # per-event drilldown — tabs for:
│                               #   • Overview (status, dates, IVS)
│                               #   • Payouts (PPV + VOD breakdown)
│                               #   • VOD Mappings (link products to event)
│                               #   • Boxer Comp leaderboard
│                               #   • Feedback for this event
│                               #   • Promoter Report link
│
├── purchases/
│   └── page.tsx                # DataTable: email, product, type, amount,
│                               # date, expires, status (refunded badge), actions.
│                               # Per-row dropdown: refund, send recovery, view customer.
│                               # Top-of-page bulk actions: refund backfill, grant access.
│
├── subscribers/
│   └── page.tsx                # active / past_due / canceled list with churn stats
│
├── feedback/
│   └── page.tsx                # DataTable: ratings, comments, testimonial approval
│
├── marketing/
│   └── page.tsx                # announce event, manage promotions, send broadcast
│
└── settings/
    └── page.tsx                # stream toggle, refund backfill, infra checks
```

## Sidebar layout

Persistent left sidebar using shadcn's `Sidebar` primitive (collapsible groups, keyboard-navigable, mobile-responsive sheet on small screens). Pattern matches Cal.com and Dub.co. Sidebar lives in `/admin/layout.tsx` so it persists across navigations without re-rendering.

Sidebar sections (collapsible groups):

- **Overview** — Dashboard
- **Revenue** — Events, Purchases, Subscribers
- **Engagement** — Feedback, Marketing
- **System** — Settings

Footer of sidebar: signed-in admin email + logout button. Top of sidebar: BoxStreamTV wordmark + version stamp.

## Pages — what each one does

### Dashboard

Three KPI cards across the top: today's purchases, active subscribers, refunds (30d). Below that, the active event card with stream toggle. Below that, a "Recent Activity" feed (last 10 purchases, refunds, signups) — replaces the bottom-of-page recent purchases table on the current monolith.

### Events index

DataTable with sort/filter. Columns: name, date, PPV sales, PPV revenue, VOD sales, VOD revenue, tier, promoter cut, our cut, report link. Click a row → drilldown.

### Event drilldown — `/admin/events/[id]`

Tabs across the top:

- **Overview**: status, dates, IVS, stream toggle. (Mobile of current Active Event card.)
- **Payouts**: PPV breakdown + VOD breakdown side-by-side. Total revenue. Tier math.
- **VOD Mappings**: list every Stripe VOD product as a checkbox. Tick which belong to this event. Solves the naming-mismatch problem from `event_vod_mapping` (see VOD column refactor below). Server Action saves on submit.
- **Boxer Comp**: leaderboard.
- **Feedback**: filter feedback rows for this event_id only.
- **Promoter Report**: copy / open report link.

### Purchases

DataTable with the works: email search, product filter, type filter, status filter (refunded/active/expired), date range. Per-row dropdown menu: refund (confirm in Dialog), send recovery link, copy email, view in Stripe. Top-right action menu: refund backfill, grant access, send recovery to arbitrary email — each opens in a Sheet.

### Subscribers

Counts at top (active, trialing, past_due, canceled). Table with email, tier, status, current_period_end, cancel_at_period_end. Per-row dropdown: view in Stripe, cancel manually.

### Feedback

DataTable: date, email, event/VOD, type, ratings, comment, testimonial approval toggle. Filter by approved / unapproved.

### Marketing

Announce form (existing). New broadcast email composer. Past announcements list with sent counts.

### Settings

Stream toggle. Refund backfill button. IVS health check. Maybe Stripe webhook test endpoint.

## Mutations: Server Actions, not API routes

Each form / button calls a co-located Server Action:

```
src/app/admin/purchases/actions.ts
  - refundPurchase(purchaseId)
  - sendRecoveryLink(email)
  - grantAccess({ email, productName, ... })
  - backfillRefunds({ hours })

src/app/admin/events/[id]/actions.ts
  - linkVodProduct(eventId, stripeProductId)
  - unlinkVodProduct(eventId, stripeProductId)
  - toggleStream(eventId)
  - announceEvent({ eventId, subject, body })

src/app/admin/feedback/actions.ts
  - approveTestimonial(feedbackId, approved)
```

Each action ends with `revalidatePath` or `revalidateTag` so the affected page re-renders. Existing `/api/admin/*` routes get deleted as actions replace them.

## Streaming + suspense

Shell paints instantly. Heavy data (recent purchases, event payouts, feedback) loads inside `<Suspense fallback={<TableSkeleton />}>` so the user sees structure immediately.

## Migration strategy

**Don't big-bang it.** Old `/admin/page.tsx` keeps working. Migrate page by page:

1. **Phase 1 — Foundation**: install shadcn primitives (`npx shadcn@latest init`, then add the components listed above). Build `layout.tsx` with the sidebar. Create empty placeholder pages. Old `/admin` keeps living at `/admin/legacy` for the duration.
2. **Phase 2 — Dashboard**: KPIs + active event status. New page replaces the top of the legacy page.
3. **Phase 3 — Events + drilldown**: events index with sortable DataTable, drilldown with tabs. Build the VOD Mappings tab here — pairs naturally with the schema work in `OVERLAY.md`-adjacent territory (creates `event_vod_mapping` table, auto-seeds from current slug match).
4. **Phase 4 — Purchases**: DataTable with all the actions. Refund + recovery + grant access converted to Server Actions inside Sheets/Dialogs.
5. **Phase 5 — Subscribers**: new page (didn't exist on legacy).
6. **Phase 6 — Feedback**: DataTable for testimonial approval.
7. **Phase 7 — Marketing**: announce + broadcast.
8. **Phase 8 — Settings**: stream toggle, refund backfill, infra health.
9. **Phase 9 — Polish**: ⌘K command palette, keyboard shortcuts, accessibility audit, dark mode tuning.
10. **Phase 10 — Cleanup**: delete `/admin/legacy`, delete replaced API routes (`/api/admin/refund`, `/api/admin/grant`, etc.), delete `Admin*Form.tsx` client components that became Server Actions.

Each phase ships independently. After each phase, that section is on the new structure and the rest still works.

## Things to confirm before starting

- **shadcn + Tailwind version**: install the latest. shadcn's installer (`npx shadcn@latest init`) handles the Tailwind config rewrite automatically. Verify the project's existing Tailwind v3 → v4 path before running on this repo (shadcn's current default is v4-ready; if our codebase is still v3, pin to a v3-compatible install or migrate Tailwind first).
- **TanStack Table for DataTables**: canonical shadcn pattern (`npx shadcn@latest add table`, then build a `DataTable` wrapper from the docs). Adds the `@tanstack/react-table` dep. Worth it for sort/filter/pagination on every table.
- **react-hook-form + zod**: required by shadcn's `Form` component. ~10 KB gzipped. Type-safe forms with validation. Standard.
- **Auth at the layout level**: today every page calls `verifyAdminCookie`. Layout-level gate redirects unauthenticated requests once at the top. Trade-off: layouts don't see the nested URL — fine for our case (single cookie → redirect to `/admin/login`).
- **Don't fight the next-forge file layout**: when in doubt, mirror its structure. Their `apps/app/(authenticated)/[route]/page.tsx` + co-located `actions.ts` + Server-Action-driven forms is the reference. Saves us from re-deriving conventions.

## Rough size

- Foundation + sidebar: 1 day
- Each page migration: 0.5–1 day
- VOD mappings UI (Phase 3 sub-task): 0.5 day
- Polish phase: 1 day

**Total: ~6–8 days of focused work** for the full migration. After Phase 3 you already have the VOD mappings problem solved and the events drilldown in production — the rest is pace-able.

## Risk

| Risk | Mitigation |
|---|---|
| Breaking existing admin flows mid-migration | Keep `/admin/legacy` route alive with the current page until Phase 10. Each phase only adds new pages; nothing deletes the old until the very end. |
| shadcn / Tailwind v4 conflicts with current theme | One-time check before Phase 1. Current admin styling is bespoke (ad-hoc `border-white/10` etc.) — moving to shadcn tokens is a deliberate visual refresh. |
| Server Actions vs API routes — different error surfaces | Standardize on `useActionState` + Sonner toasts for all mutations. Document the pattern in Phase 1. |
| ⌘K command palette is overengineered for our scale | Drop Phase 9 if not valuable. Everything else stands alone. |
| Reinventing patterns next-forge already solved | Default to copying their conventions. When in doubt, look there first. |

## Bonus: things this rework unlocks

- **Per-event drilldown** — finally a place where everything about an event lives in one spot (PPV, VOD, boxer comp, feedback, report link, IVS settings). Currently this data is sprinkled across the monolith.
- **VOD ↔ Event mappings UI** — the right home for the `event_vod_mapping` table from the prior conversation. Naturally lives in the Event drilldown's "VOD Mappings" tab.
- **Searchable purchases** — DataTable filtering means support cases ("can you check this email") become 5 seconds instead of scrolling.
- **Subscriber visibility** — currently you can see a subscriber count but not the list. Phase 5 makes that visible.
- **Foundation for the Overlay control panel** — the same shadcn shell + sidebar can host `/admin/overlays` later (phase 6 of `OVERLAY.md`). Single design language across all internal tools.
