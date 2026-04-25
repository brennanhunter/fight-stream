# Lower-Third Overlay — Build Plan

## Architecture Summary

OBS Browser Source captures a URL in its own isolated Chromium instance.
State is shared through **Supabase** — control page writes, display page listens via Realtime.

---

## Pages

| Route | Purpose |
|-------|---------|
| `/overlays/lower-third` | **Display** — what OBS captures. Transparent bg, no header/footer. |
| `/overlays/lower-third/control` | **Control panel** — you use this during the show to push fighter info and toggle visibility. |

---

## Steps

### Step 1 — Overlays layout (bypass header/footer)
- [ ] Create `src/app/overlays/layout.tsx`
- Renders only `{children}`, no Header, no Footer
- Sets `background: transparent` on `<html>` and `<body>`

### Step 2 — Supabase table
- [ ] Add `lower_third_state` table in Supabase SQL Editor
- One row holds the current state (fighter name, record, weight class, visible flag)
- Enable Row Level Security: public read, service role write

```sql
CREATE TABLE IF NOT EXISTS lower_third_state (
  id           integer PRIMARY KEY DEFAULT 1,
  fighter_name text    NOT NULL DEFAULT '',
  record       text    NOT NULL DEFAULT '',
  weight_class text    NOT NULL DEFAULT '',
  visible      boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Only ever one row
INSERT INTO lower_third_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE lower_third_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON lower_third_state FOR SELECT USING (true);
-- Service role handles writes (no explicit policy needed)
```

### Step 3 — API route (read/write state)
- [ ] Create `src/app/api/overlay/lower-third/route.ts`
- `GET` — returns current state row
- `POST` — updates the single state row (uses service role key)
- No auth needed (internal production tool, obscure URL)

### Step 4 — Display page (OBS source)
- [ ] Build `src/app/overlays/lower-third/page.tsx`
- Transparent 1920×1080 canvas
- Subscribes to Supabase Realtime on `lower_third_state`
- Animates in/out based on `visible` flag
- **Design:** Black & white, glow effects, BoxStreamThumbnail.png logo
- **Fields shown:** Fighter name (large), record, weight class

### Step 5 — Control panel
- [ ] Build `src/app/overlays/lower-third/control/page.tsx`
- Form: fighter name, record, weight class
- Show / Hide toggle button
- Live preview of what the overlay looks like
- Pushes to `/api/overlay/lower-third` on every change

---

## OBS Setup (after build)

1. In OBS → Add Source → Browser Source
2. URL: `https://boxstreamtv.com/overlays/lower-third`
3. Width: `1920`, Height: `1080`
4. Check **"Shutdown source when not visible"** = OFF
5. Check **"Refresh browser when scene becomes active"** = optional
6. Background color: fully transparent (OBS handles this automatically for browser sources)

---

## Current Status

- [x] Plan documented
- [x] Step 1 — Overlays layout
- [x] Step 2 — Supabase table
- [x] Step 3 — API route
- [x] Step 4 — Display page
- [x] Step 5 — Control panel
