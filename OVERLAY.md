# Broadcast Overlay Control System — Build Plan

Unified control panel for all live-broadcast overlays, driven by a pre-loaded fighter roster per event. Operator picks from a dropdown and clicks; OBS browser sources render the result in <1s via Supabase Realtime.

## Goal

Replace the single-purpose `lower_third_state` model with a generalized overlay control system. From one panel, the operator can:

- Enter all fighter info up front (per event roster)
- Show/hide any overlay independently:
  - BoxStream logo
  - Promoter logo
  - Boxer info card (with promoter logo slot)
  - Tale of the tape
  - Lower thirds for walkouts
- Override roster data ad-hoc when needed (surprise guests, last-minute name changes)

## Architecture

Same proven pattern already used for the existing lower third:

```
Control Panel  ─writes─▶  Postgres (overlay state tables)
                                │
                                ▼
                          Supabase Realtime
                                │
                                ▼
                          OBS Browser Source(s) ─renders─▶ On Air
```

**Key decision: separate browser sources per overlay type, not one mega source.**

- Pros: failure isolation — if one overlay crashes, the others stay on air. OBS can transition each independently.
- Cons: 4–5 URLs to configure in OBS once.
- Trade is worth it during a live broadcast.

## Schema (proposed)

Replace `lower_third_state` (single row) with:

- **`event_fighters`** — pre-populated roster per event
  - `id`, `event_id`, `display_name`, `record`, `weight_class`, `height`, `reach`, `age`, `stance`, `hometown`, `photo_url`, `promoter_logo_url`, `created_at`
- **`overlay_state`** — one row per overlay type, current on-air state
  - `overlay_type` (PK: `'lower_third' | 'boxer_card' | 'tale_of_tape' | 'logo' | 'promoter_logo'`)
  - `visible` (bool)
  - `payload` (jsonb — overlay-specific data, e.g. fighter IDs, free-text overrides)
  - `updated_at`

Service role writes; RLS allows public read (so OBS browser sources can subscribe without auth).

## Things to plan for upfront (not discover during a broadcast)

1. **Realtime drops.** Add a 2–3s heartbeat poll fallback so a missed `visible: false` event doesn't leave a stale graphic on air. Back-port to the existing lower third while we're at it.
2. **Collision rules.** Tale of the tape is full-screen; lower third lives at the bottom. The control panel must *prevent* incompatible combos — not just let the operator stack them and hope.
3. **Always allow ad-hoc input.** Pre-entered roster handles ~90% of cases, but every overlay must accept "pick from roster OR free-text override" for surprise guests / late changes.
4. **Two operators racing** (low priority today). Optional soft lock: "X is controlling — take over?" Saves you when the truck operator and the laptop operator both hit "show".
5. **Tale of the tape is the hardest one.** Two-column animated comparison, row-by-row reveals, possibly tweened numbers. Plan ~2–3 days for this one alone. Everything else is "show/hide a styled div".
6. **Operator UX under stress.** Live broadcasts = high pressure. Control panel needs:
   - Big toggle buttons, not nested dropdowns
   - Visible "what's on air now" per overlay type
   - Keyboard shortcuts (1–9 for fighter slots, space to hide all)
   - "Kill all" panic button
   - Confirmation only for destructive actions; everything else one-click

## Phased Build (each phase ships value independently)

### Phase 1 — Roster foundation
- Create `event_fighters` table.
- Build admin "Event Setup" page: enter every fighter on the card up front (name, record, weight, photo, etc.).
- No new overlays yet — purely data prep.

### Phase 2 — Lower third refactor
- Migrate existing lower third to read from roster.
- Control: dropdown of fighters → click name → click show. Operators stop typing during walkouts.
- Add Realtime heartbeat poll fallback.

### Phase 3 — Boxer info card overlay
- New browser source. Renders fighter photo + name + record + weight class + promoter logo slot.
- Reuses Phase 1 roster.

### Phase 4 — Logo overlays (BoxStream + promoter)
- Trivial; could move earlier if we want a quick win.
- Just on/off toggles. Promoter logo URL pulled from `events.promoter_logo_url` (new column).

### Phase 5 — Tale of the tape
- Two-column animated comparison overlay. Most complex piece.
- **Pivot to consider**: store data in DB, render styled HTML (clean typography + slow row-by-row fade). Skip "fancy" until used live once. Most TV-grade overlays look great without motion graphics.

### Phase 6 — Unified control panel
- Surfaces all overlays on one screen.
- Per-overlay show/hide.
- "What's on air now" indicator per overlay.
- Kill-all panic button.
- Keyboard shortcuts.

## Rough Size

**7–10 days of focused work** for a complete v1. Each phase ships independently, so we can pause/ship at any point and still have something useful in production.

## Risks

| Risk | Mitigation |
|---|---|
| Operator UX under live-show stress | Phased rollout + dry-run every overlay against a recorded stream before each real event |
| Realtime drops | Heartbeat poll fallback (back-port to existing lower third) |
| Tale-of-the-tape animation complexity | Build simple HTML version first; only add motion graphics after using it live once |
| Two-operator races | Optional soft lock; not critical at current scale |
| Browser source crashes taking out all overlays | Separate browser source per overlay type (already in plan) |

## Open Questions (decide before starting Phase 1)

- Where do promoter logos live? Upload via admin → S3? Or just paste a URL into `events.promoter_logo_url`?
- Photo storage for fighter headshots — same answer as above.
- Do we want walk-out music cues integrated, or strictly visual overlays for v1?
- Do we need a "rehearsal mode" that toggles a flag so operators can test overlays without them appearing on air?
