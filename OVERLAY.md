# Broadcast Overlay Control System — Build Plan

Match-centric live-broadcast control panel. Operator picks the active match from a sidebar; everything in the main panel re-scopes to that fight (lower thirds, tale of tape, info cards, round timer). OBS browser sources render results in <1s via Supabase Realtime.

## Architecture

```
Control Panel (/control)  ─writes─▶  Postgres (overlay state tables)
                                          │
                                          ▼
                                    Supabase Realtime
                                          │
                                          ▼
                                    OBS Browser Source(s) ─renders─▶ On Air
```

**Two key separations** baked into the design:

1. **Configuration vs live operation are different surfaces.**
   - `/admin/overlays/[event-id]` — pre-event roster + matches setup (calm, day-before work)
   - `/control` — live broadcast operation (fullscreen, no admin chrome, big buttons, kill-all panic)
   Both gated by the admin cookie, both share the shadcn dark theme.

2. **One browser source per overlay type, not one mega source.** Failure isolation — if one overlay crashes, the others stay on air. OBS can transition each independently. ~6 URLs to configure once; trade is worth it for a live broadcast.

## Schema

> **Source of truth: [`supabase/schema.sql`](supabase/schema.sql).** The actual `CREATE TABLE` definitions live there — refer to them when implementing or migrating. The summary below describes intent only.

`lower_third_state` (single-row legacy) is retired. Replaced with three tables:

- **`event_fighters`** — roster. One row per fighter on the card, with `display_name`, `record`, `weight_class`, `height`, `reach`, `age`, `stance`, `hometown`, `nationality`, `photo_url`, `photo_ascii`, `promoter_logo_url`, `sort_order`.
- **`event_matches`** — bouts on the card. Pairs two `event_fighters` rows via `fighter_left_id` / `fighter_right_id`, plus `sequence`, `label` (e.g. "Main Event"), `scheduled_rounds`, `round_seconds`, `rest_seconds`, `status`.
- **`overlay_state`** — current on-air state. PK `overlay_type` (`lower_third` | `boxer_card` | `tale_of_tape` | `round_timer` | `logo` | `promoter_logo`), `visible` boolean, `payload` jsonb. Public read enabled (OBS subscribes via Supabase Realtime); writes via service role only.

A 3-fight card = 6 rows in `event_fighters` + 3 rows in `event_matches`.

### Payload shapes per overlay type

```jsonc
// lower_third — snapshot of fighter at show time
{
  "match_id": "uuid",
  "fighter_id": "uuid",
  "display_name": "Smith",
  "record": "18-2 (12 KOs)",
  "weight_class": "Welterweight"
}

// boxer_card — single-fighter detailed card
{
  "match_id": "uuid",
  "fighter_id": "uuid",
  "fighter": { /* full snapshot from roster */ },
  "show_promoter_logo": true
}

// tale_of_tape — two-fighter side-by-side comparison
{
  "match_id": "uuid",
  "left":  { /* full snapshot */ },
  "right": { /* full snapshot */ }
}

// round_timer — see "Round timer" section below
{
  "match_id": "uuid",
  "current_round": 2,
  "total_rounds": 8,
  "round_seconds": 180,
  "rest_seconds": 60,
  "state": "fighting",                    // fighting | rest | paused | ended
  "state_started_at": "2026-05-02T19:34:21Z"
}

// logo — BoxStream watermark
{ }

// promoter_logo — current event's promoter brand
{ "url": "https://..." }
```

**Snapshot at show time, don't reference live fighter rows.** When the operator hits Show on a lower third, the control panel writes the fighter's current values directly into the payload. Editing a roster row mid-broadcast doesn't change what's on air. Operator gets predictability; data churn becomes a deliberate "Refresh" action instead of a surprise.

## Round timer — design that doesn't burn writes

Naive approach: server writes the remaining seconds every tick → 540 writes per 9-minute fight.

Right approach: server writes only on **state change** (round start, pause, resume, next round, end). The browser source receives `state_started_at` and ticks locally with `setInterval(100ms)`.

```ts
// in the round_timer browser source
useEffect(() => {
  if (state !== 'fighting' && state !== 'rest') return;
  const id = setInterval(() => {
    const elapsed = (Date.now() - new Date(state_started_at).getTime()) / 1000;
    const total = state === 'fighting' ? round_seconds : rest_seconds;
    setRemaining(Math.max(0, total - elapsed));
  }, 100);
  return () => clearInterval(id);
}, [state, state_started_at, round_seconds, rest_seconds]);
```

Server writes per match: ~10–15 (one per round transition). Realtime payload size: tiny. Drift between OBS and the operator's clock: negligible at sub-second precision.

When state goes `fighting → rest`, the timer auto-shows "REST 0:58" countdown. When `rest` reaches 0, control panel auto-advances to the next round (or operator clicks Next Round to control timing manually).

## Match-centric `/control` panel

```
┌─ ACTIVE EVENT: Fights at the Mansion          [KILL ALL] ─┐
│                                                            │
│ ┌──────────────┐ ┌─────────────────────────────────────┐  │
│ │ MATCHES      │ │ Match 2 — Smith vs Garcia           │  │
│ │              │ │                                     │  │
│ │ ✓ 1 Lee vs   │ │ WALKOUTS / LOWER THIRDS             │  │
│ │   Martinez   │ │ [Smith] [Garcia]   ▢ Show ✕ Hide    │  │
│ │              │ │                                     │  │
│ │ ▶ 2 Smith vs │ │ TALE OF THE TAPE                    │  │
│ │   Garcia     │ │ ▢ Show full-screen comparison       │  │
│ │              │ │                                     │  │
│ │   3 Johnson  │ │ ROUND TIMER  Round 2 of 8           │  │
│ │   vs Rodrig. │ │ ▶ Start Round  ⏸ Pause              │  │
│ │              │ │ ⏭ Next Round   ✕ Hide               │  │
│ │              │ │ Display: 2:14 remaining             │  │
│ │              │ │                                     │  │
│ │              │ │ INFO CARDS                          │  │
│ │              │ │ [Smith] [Garcia]   ▢ Show ✕ Hide    │  │
│ └──────────────┘ └─────────────────────────────────────┘  │
│                                                            │
│ GLOBAL  [BoxStream logo on/off]  [Promoter logo on/off]   │
└────────────────────────────────────────────────────────────┘
```

Switching matches in the left rail re-scopes everything in the main panel. **Active overlays don't get killed by a match switch** — operators occasionally need to backtrack mid-walkout.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `1`–`9` | Switch to match N |
| `Q` | Show left fighter's lower third |
| `W` | Show right fighter's lower third |
| `Space` | Hide whichever overlay is currently active |
| `T` | Toggle tale of the tape |
| `R` | Start round / pause round (toggle) |
| `N` | Next round |
| `Esc` | Kill all overlays |

Visible inline as hints next to each button.

## Operational behaviors

### Heartbeat poll fallback

Realtime occasionally drops the websocket. Without a fallback, a stale lower third stays on air after Hide is clicked. Browser sources poll `overlay_state` every 2.5s as a backstop — Realtime delivers in <1s when working, the poll catches dropped events. Idempotent (just compares to last-rendered state).

Back-port this to the existing `lower_third_state` browser source while we're touching it.

### Atomic claim writes

Every show/hide is `UPDATE overlay_state SET visible = ?, payload = ?, updated_at = now() WHERE overlay_type = ?`. No race conditions; last-write-wins is the desired behavior in a single-operator broadcast.

### Collision rules enforced in the control panel

- Tale of the tape is full-screen — when shown, lower third + boxer card are auto-hidden.
- Round timer is corner-positioned; coexists with everything.
- Logo + promoter logo are corner-positioned and always on (operator toggles for stylistic moments).

The control panel state machine refuses incompatible combos rather than letting them stack visually. Each rule lives in one place; OBS doesn't have to know.

### Ad-hoc input always available

Every show button has an "Edit before showing" affordance — operator can override name, record, weight class on the fly without editing the roster. Used for surprise guests, last-minute name corrections, ring announcer cameos. Snapshot model means these tweaks don't pollute the saved roster.

### Match auto-advance

When `round_timer.state === 'ended'` is written for the final round, control panel offers a one-click "Mark Match Complete" → sets `event_matches.status = 'completed'` and auto-suggests Match N+1 in the left rail.

## Build plan — full scope, no carve-out

We're shipping the complete system, not a sliver. Each step lands as its own PR but the goal is the whole experience working end-to-end before the first event uses it.

### 1. Schema migrations
- `event_fighters`, `event_matches`, `overlay_state` tables
- Realtime publication for `overlay_state`
- (Keep `lower_third_state` alive temporarily; retire after step 4)

### 2. Admin Event Setup page (`/admin/overlays/[event-id]`)
Lives inside the admin shell.
- Roster builder — add/edit fighters (all fields, photo upload to Supabase Storage, promoter logo)
- Match builder — pair fighters into matches, set `scheduled_rounds` / `round_seconds` / `rest_seconds`
- Sidebar entry under "Engagement → Overlays"

### 3. Browser source pages (`/overlays/...`)
Public read, no auth needed. Each subscribes to its slice of `overlay_state` + heartbeat poll fallback:
- `/overlays/lower-third` — refactored to read from new `overlay_state.lower_third`
- `/overlays/boxer-card`
- `/overlays/tale-of-the-tape`
- `/overlays/round-timer` — local ticker
- `/overlays/logo`
- `/overlays/promoter-logo`

### 4. Match-centric `/control` panel
Standalone route, no admin chrome. Auth via admin cookie. Layout per the diagram above.
- Match list left rail
- Per-overlay-type panels in main area, scoped to active match
- Round timer state machine (start / pause / next / end)
- Global logo toggles bottom bar
- Keyboard shortcuts
- Kill-all panic button

### 5. Tale of the tape — full polish
Static side-by-side with row-by-row fade reveal (1.5s each). Snapshot from match payload. Both fighters' photos full-bleed left/right with stats stacked center.

### 6. Boxer info card — full polish
Single-fighter detailed card. Photo + name + record + weight class + promoter logo + 3-line bio (free-text field, optional).

### 7. Cleanup
- Drop `lower_third_state` table
- Remove the legacy lower-third API route
- Document OBS setup with the 6 browser source URLs

## Things to confirm before starting

- **Photo storage**: Supabase Storage bucket (`event-fighters`)? Per fighter, one photo, public read.
- **Promoter logo storage**: Same bucket, separate prefix.
- **Bio field on info card**: free-text 3-line max, or omit for v1?
- **Music cues**: NOT in scope — strictly visual overlays. Audio tracks belong in the OBS scene, not in the overlay system.
- **Rehearsal mode**: a per-event flag that routes overlays to a `rehearsal_overlay_state` clone instead of production. Defer until we feel pain not having it.

## Risks

| Risk | Mitigation |
|---|---|
| Operator UX under live-show stress | Dry-run the full broadcast against a recorded stream before the first real event. Build muscle memory before the lights are on. |
| Realtime drops mid-show | Heartbeat poll fallback (every 2.5s) on every browser source. Back-ported to legacy lower third. |
| Round timer drift between operator and OBS | Local ticking from `state_started_at` keeps OBS within ~100ms of operator's clock. Server writes only on state changes. |
| Multi-operator races | Optional soft lock (`overlay_state.locked_by`) — not critical at single-operator scale. Stub for later. |
| Browser source crash on one overlay | Per-overlay browser sources isolate failure (architectural choice, already in design). |
| Roster edits mid-broadcast surprise on-air | Snapshot-at-show-time means edits don't propagate. Explicit "Refresh" action if operator wants to push roster updates to a currently-shown overlay. |
| Bad photo URL kills overlay render | Browser source falls back to text-only layout when image fails to load. Tested in dry-run. |

## Rough size

End-to-end build with everything wired: **~10–12 focused days**. Schema is half a day; the rest is UI + browser source pages + the control panel state machine. Heaviest single piece is the `/control` panel itself — match list + round timer state machine + keyboard shortcuts + collision enforcement.

After it's shipped, every future event needs ~45 minutes of pre-show prep (roster + matches data entry) and zero typing during the broadcast itself.

## Worked example — 3 fights, 6 boxers

**Card:**
- Match 1 (Undercard): Lee vs Martinez — 4 rounds
- Match 2 (Co-feature): Smith vs Garcia — 6 rounds
- Match 3 (Main event): Johnson vs Rodriguez — 8 rounds

**Pre-event** (~45 min, day before):
1. `/admin/overlays/fights-at-mansion` — Add Fighter × 6, fill name/record/weight/photo/etc.
2. Add Match × 3, pairing fighters and setting `scheduled_rounds` per match.
3. Save.

**Live operation** for Match 2 — Smith vs Garcia:

| Time | Action | Effect |
|---|---|---|
| `T-3:00` | Click "Match 2" in left rail | Panel re-scopes to Smith/Garcia |
| `T-3:00` | Smith → **Lower Third: Show** | Smith's pill on screen |
| `T-2:30` | **Hide** | Off |
| `T-1:30` | Garcia → **Lower Third: Show** | Garcia's pill |
| `T-1:00` | **Hide** | Off |
| `T-0:30` | **Tale of the Tape: Show** | Full-screen comparison |
| `T-0:05` | **Tale: Hide** | Off |
| `T+0:00` | **Round Timer: Start Round** | Timer overlay visible, 3:00 ticking |
| `T+3:00` | (auto) round ends, state → rest | Timer flips to "REST 1:00" |
| `T+4:00` | (auto) state → fighting, round 2 | Timer resets to 3:00, ticking |
| ... | repeats for 6 rounds | |
| End | **Mark Match Complete** | Match 2 status → completed; left rail suggests Match 3 |

15–20 single-click actions per match. ~50 across the full 3-fight card. Every action is a sub-1s database write that flows through Realtime to OBS browser sources. Operator never types a fighter name during the live broadcast.
