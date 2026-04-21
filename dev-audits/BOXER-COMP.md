# Boxer Comp — Implementation Plan

Lets users enter a boxer's last name at checkout. Admin dashboard shows how many buyers credited each boxer.

---

## Overview of the Data Flow

```
User clicks Buy Now
  → boxer name input (EventHero UI)
  → POST /api/ppv-checkout  { priceId, eventId, boxerName }
  → Stripe session metadata  { boxer_name: "Smith" }
  → Stripe Checkout (payment)
  → /payment-success?session_id=...
  → POST /api/verify-payment
  → INSERT purchases ... boxer_name = "Smith"
  → Admin dashboard GROUP BY boxer_name
```

---

## Step 1 — Database: Add `boxer_name` column to `purchases` 

Run in Supabase SQL Editor:

```sql
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS boxer_name text;
```
- I added to supabase

No index needed — the admin query will GROUP BY on a small dataset.

Also add this line to `supabase/schema.sql` inside the `purchases` CREATE TABLE block (after `session_claimed_at`):

```sql
  boxer_name                text,                    -- optional: boxer last name entered at checkout
```

✅ `schema.sql` updated — this file is just the local source-of-truth that mirrors the live DB. No action needed; it's been updated to match.
---

## Step 2 — Checkout UI: Add boxer name input in `EventHero.tsx`

**File:** `src/components/hero/EventHero.tsx`

### 2a — Add state for the boxer name input

Near the `checkoutError` state (around line 209):

```tsx
const [boxerName, setBoxerName] = useState('');
```

### 2b — Pass `boxerName` to the API call

In `startCheckout`, update the `fetch` body:

```tsx
body: JSON.stringify({ priceId: stripePriceId, eventId, boxerName: boxerName.trim() || undefined }),
```

### 2c — Add the input field in the JSX

Add a text input **above** the Buy Now button. Something like:

```tsx
<div className="mb-3">
  <label className="block text-xs text-gray-400 mb-1 tracking-wide uppercase">
    Which boxer are you rooting for? <span className="text-gray-600">(optional)</span>
  </label>
  <input
    type="text"
    value={boxerName}
    onChange={(e) => setBoxerName(e.target.value)}
    placeholder="Boxer last name"
    maxLength={50}
    className="w-full bg-black/60 border border-white/20 text-white text-sm px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-white/50"
  />
</div>
```

---

## Step 3 — API: Accept `boxerName` in `/api/ppv-checkout`

**File:** `src/app/api/ppv-checkout/route.ts`

### 3a — Parse `boxerName` from the request body

```ts
const { priceId, eventId: clientEventId, boxerName } = await request.json();
```

### 3b — Sanitize and add to Stripe session metadata

After the existing `metadata` object is built, add:

```ts
const sanitizedBoxerName = typeof boxerName === 'string'
  ? boxerName.trim().slice(0, 50)
  : undefined;

if (sanitizedBoxerName) {
  metadata.boxer_name = sanitizedBoxerName;
}
```

No additional validation needed — the field is optional and display-only.

---

## Step 4 — API: Save `boxer_name` in `/api/verify-payment`

**File:** `src/app/api/verify-payment/route.ts`

### 4a — Read it from Stripe metadata

After the existing metadata reads (e.g. `metadataEventId`):

```ts
const boxerName = checkoutSession.metadata?.boxer_name || null;
```

### 4b — Include in the Supabase insert

In the `supabase.from('purchases').insert(...)` call, add:

```ts
boxer_name: boxerName,
```

---

## Step 5 — Admin Dashboard: Boxer Leaderboard

**File:** `src/app/admin/page.tsx`

### 5a — Query boxer name counts

Add this query alongside the existing stats queries:

```ts
// Boxer name leaderboard — count per boxer_name for the active event
const { data: boxerCounts } = activeEvent
  ? await supabase
      .from('purchases')
      .select('boxer_name')
      .eq('event_id', activeEvent.id)
      .eq('purchase_type', 'ppv')
      .not('boxer_name', 'is', null)
  : { data: [] };

// Tally in JS (simpler than a raw SQL GROUP BY through the Supabase client)
const boxerTally = new Map<string, number>();
for (const row of boxerCounts || []) {
  if (row.boxer_name) {
    boxerTally.set(row.boxer_name, (boxerTally.get(row.boxer_name) ?? 0) + 1);
  }
}
const boxerLeaderboard = [...boxerTally.entries()]
  .sort((a, b) => b[1] - a[1]);  // descending by count
```

### 5b — Render the leaderboard

Add a section in the admin page JSX (e.g. below the Quick Stats block):

```tsx
{boxerLeaderboard.length > 0 && (
  <div className="border border-white/10 p-6 mb-6">
    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">
      Boxer Comp — {activeEvent?.name}
    </p>
    <div className="space-y-2">
      {boxerLeaderboard.map(([name, count]) => (
        <div key={name} className="flex justify-between text-sm">
          <span className="text-white capitalize">{name}</span>
          <span className="text-gray-400">{count} buyer{count !== 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## Step 6 — (Optional) Normalize casing

To prevent "smith", "Smith", and "SMITH" from counting separately, apply `.toLowerCase()` before inserting and capitalize for display only. Add to the verify-payment save:

```ts
boxer_name: boxerName ? boxerName.toLowerCase() : null,
```

And in the leaderboard render:

```tsx
<span className="text-white capitalize">{name}</span>
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/schema.sql` | Add `boxer_name text` column to purchases CREATE TABLE |
| Supabase SQL Editor | `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS boxer_name text` |
| `src/components/hero/EventHero.tsx` | Add `boxerName` state, input field, pass to checkout API |
| `src/app/api/ppv-checkout/route.ts` | Parse + sanitize `boxerName`, add to Stripe session metadata |
| `src/app/api/verify-payment/route.ts` | Read `boxer_name` from metadata, include in purchases insert |
| `src/app/admin/page.tsx` | Query boxer counts, render leaderboard section |

---

## Notes

- The field is **fully optional** — buyers who skip it are stored with `boxer_name = null` and do not appear in the leaderboard.
- Stripe session metadata values are strings with a 500-character limit; 50 chars is well within that.
- This works for PPV only. VoD checkout (`/api/checkout`) is unaffected.
- If you want to track this across all events (not just the active one), remove the `.eq('event_id', activeEvent.id)` filter and group by event as well.
