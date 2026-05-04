# ASCII Photo Conversion — Build Plan

Convert fighter headshots into ASCII-art representations to match the existing brutalist/monospace aesthetic of the lower third overlay (which already uses random ASCII glyph blocks as decorative texture). Lets us reveal-from-ASCII for tale-of-the-tape entrances, render full-ASCII portraits for a future walkout overlay, and generally lean into a recognizable visual signature across the broadcast.

## Why this fits

The lower third already has `randomAsciiBlock()` decorating its corners. Fighter photos rendered as ASCII would extend that vocabulary into the actual portrait content — same vibe, applied where it has informational meaning (you can tell *who* it is, not just decoration). It's a strong differentiator visually and works in the same monospace + dark + bold typography frame we've already built.

## How it works (algorithm-agnostic)

Same pipeline regardless of which library or DIY:

1. **Load image** into a canvas (or a Node `Buffer` server-side via `sharp`).
2. **Downsample** to a low-res grid (e.g. 80 × 120 cells for a portrait).
3. **For each cell**: average the brightness of the pixels in that region (`0.299*R + 0.587*G + 0.114*B`).
4. **Map brightness → character** via a ramp from sparse to dense.
5. **Render** the resulting grid as a string in a `<pre>` with monospace font, `line-height: 1`, `letter-spacing: 0`.

Optional refinements:
- **Color**: per-character color sampled from the source pixel (looks noisy at small sizes; recommend monochrome with a single accent).
- **Edge detection**: layer a Sobel or Canny pass on top so contours map to specific edge characters (`/\\|-+`). More work, looks crisper.

## Three implementation paths, ranked by polish

### A. Plain canvas + ASCII text — DIY (~80 lines, recommended)

- Use `<canvas>` (browser) or `sharp` (server) to scale and read pixel data.
- Pure function: `imageToAscii(buffer, { cols, rows, ramp }) → string`.
- Render in a `<pre>` element with monospace font sized to fill the target.
- Pros: zero deps, full control over ramp + color treatment, fast.
- Cons: have to write it yourself (but it's short).

### B. NPM library (`aalib.js` browser, `image-to-ascii` server)

- Drop-in solutions exist. Tradeoff: less control over character ramp + color treatment, and you inherit a dependency.
- For our scale, the DIY canvas version is barely more code and gives us better visual control. Skip unless we want a quick prototype.

### C. WebGL shader (most polish, most work)

- Real-time pixel-shader-driven ASCII via font atlas texture.
- Worth it ONLY if we want a live video feed converted to ASCII (e.g. fighter's walkout video continuously rendered as ASCII while they enter the ring).
- Overkill for static photos.

## Recommended architecture — pre-compute server-side

For our scale (a handful of fighter photos, refreshed per event), generate ASCII **once** at upload time and cache it. Browser sources just fetch the pre-baked string.

### Why pre-compute

- ASCII conversion is deterministic — running it 30× for the same photo wastes work.
- Avoids the visible flash where the photo loads, then converts.
- Browser sources stay light — no canvas work, no `getImageData`, no FPS hit during a broadcast.
- Server-side `sharp` is faster and more deterministic than client `<canvas>`.

### Schema change

✅ **Shipped.** `event_fighters.photo_ascii` lives in [`supabase/schema.sql`](supabase/schema.sql). One text column per fighter, ~10 KB at 80×120.

### Wire into the upload flow

`src/app/admin/(authenticated)/overlays/[eventId]/actions.ts`:

```ts
export async function uploadBoxerPhoto(formData) {
  // ... existing upload to Supabase Storage ...
  const ascii = await imageToAscii(file.arrayBuffer(), { cols: 80, rows: 120 });
  // return { url, ascii } and let caller save both
}
```

Caller saves `photo_url` + `photo_ascii` together on the fighter row.

### Update overlay payloads

The `lower_third`, `boxer_card`, and `tale_of_tape` payloads carry `photo_ascii` alongside `photo_url`. Browser sources can render either.

```jsonc
// boxer_card payload (gains photo_ascii)
{
  "match_id": "uuid",
  "fighter_id": "uuid",
  "fighter": {
    "display_name": "...",
    "photo_url": "https://.../photo.jpg",
    "photo_ascii": "@@@##*+:...",     // NEW
    // ...rest of snapshot
  }
}
```

## Visual treatments per overlay

| Overlay | Treatment |
|---|---|
| **Lower third** | Keep existing decorative ASCII blocks. The fighter doesn't need a portrait there — just name + record. No change. |
| **Tale of the Tape** | Reveal-from-ASCII entrance: photos start as ASCII portraits, dissolve to real photos over ~800ms. Matches the scramble effect on the existing lower third. Best ROI for first ship. |
| **Boxer info card** | Optionally render the photo as ASCII for the entire duration. Looks bold; works because the card is shown briefly mid-fight. |
| **Walkout overlay** *(new overlay type)* | Full-screen ASCII portrait of the entering fighter, name overlaid in big type. Replaces the live feed for ~5 seconds during ring walks. Most distinctive use case. |

## Build phases

### 1. Core library (~half day)

- `src/lib/image-to-ascii.ts` — pure function using `sharp`. Takes a `Buffer | ArrayBuffer`, returns the ASCII string. Configurable cols/rows/ramp.
- Aspect-ratio cheat: monospace cells are roughly 1:2 (wider than tall). Sample 2× as many vertical cells as horizontal to keep faces from looking squashed.
- Default ramp: ` .:-=+*#%@` (10 levels, sparse → dense). Tunable.

### 2. Wire into upload flow (~half day)

- Modify `uploadBoxerPhoto` Server Action to also generate and persist the ASCII string when a photo is uploaded.
- Add `photo_ascii` column to schema.
- Backfill button (admin tool) — re-process every existing photo, useful after ramp tweaks.

### 3. Tale-of-the-Tape entrance variant (~half day)

- Update `showTaleOfTape` Server Action to include `photo_ascii` in the snapshot payload.
- Update `/overlays/tale-of-the-tape/page.tsx` so each photo first renders as ASCII text (in a `<pre>`) and dissolves to the real `<img>` after ~800ms.
- Use `framer-motion` for the crossfade.

### 4. Walkout overlay *(optional, separate phase)*

- New overlay type `walkout` added to `overlay_state` CHECK + seed.
- New browser source at `/overlays/walkout` — full-screen ASCII portrait + name.
- New control panel section + Server Action.
- Most impactful visual moment in the broadcast — worth its own phase.

### 5. Polish (~half day)

- Tune ramp, cell ratio, color treatment.
- Optional: small admin preview in the roster row showing the ASCII version below the photo thumbnail so operators can see how it'll look before going live.

**Total: ~2 days for phases 1–3.** Phase 4 (walkout overlay) adds another ~1 day.

## Risks

| Risk | Mitigation |
|---|---|
| Character ramp tuning | Iterate visually before locking. The ramp choice (` .:-=+*#%@` vs ` ░▒▓█` vs custom) drastically changes the look. |
| Monospace aspect ratio | Sample roughly 2× as many vertical cells as horizontal so faces don't squash. Easy fix, just a known thing to remember. |
| Color noise | Pure white-on-black is boldest. Per-character color sampling looks noisy below a certain cell density. Default to monochrome; offer accent-color variant per fighter side. |
| Backward fallback | If `photo_ascii` isn't set (older row pre-migration), browser source falls back to the regular photo. No broken state. |
| ASCII strings inflating row size | At 80×120 + newlines, ~10 KB per fighter. Postgres handles this fine. Worry only if we go above 200×300 cells. |

## Open questions

- **Cell dimensions**: 80×120? 100×150? Higher = more detail, more memory, slower render. 80×120 is the sweet spot for broadcast at 1080p.
- **Character set**: stick with ASCII (` .:-=+*#%@`)? Use Unicode block characters (` ░▒▓█`)? Custom set tuned for the boxing aesthetic?
- **Color treatment**: monochrome white-on-black, or per-side accent (red for left fighter, blue for right)?
- **Pre-baked vs runtime**: pre-bake at upload (recommended) or generate on-demand server-side per show? Pre-baked is faster but requires a column; on-demand is more flexible but slower. Going with pre-baked unless we hit a real reason not to.
- **Edge detection layer**: Sobel pass for crisper contours, or pure brightness mapping? Skip for v1; revisit if portraits look mushy.

## What this unlocks

- Distinctive visual identity across all overlays
- Reveal animations that match the lower third's existing aesthetic
- Foundation for a dedicated walkout overlay (high-impact broadcast moment)
- Stylized fallback for fighters without high-quality photos — even a mediocre source can look intentional rendered as ASCII

When we're ready to build, start with phase 1 (the core library) since every other phase depends on it.
