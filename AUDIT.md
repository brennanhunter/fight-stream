# UX Audit — BoxStreamTV

_Audited: 2026-04-12_

---

## App Overview

Next.js 15 + React 19 sports streaming platform (boxing PPV and VOD). Core pages: `/` (home), `/live` (stream), `/vod` (library), `/watch` (replay), `/pricing`, `/login`, `/signup`, `/forgot-password`, `/account`, `/recover-access`, `/contact`, `/faq`, legal pages. Stack: Tailwind, shadcn/ui, Framer Motion, Amazon IVS, Vidstack, Stripe, Supabase.

---

## Summary Scorecard

| Dimension | Score | Key Issue |
|---|---|---|
| Navigation & IA | 7/10 | Missing skip links, no breadcrumbs |
| Visual Hierarchy | 7.5/10 | Mixed button styles |
| Loading States | 6/10 | No timeout handling, silent failures |
| Empty States | 7/10 | Blackout state lacks context |
| Mobile Responsiveness | 7.5/10 | Text sizing + modal sizing |
| Accessibility (WCAG AA) | 5.5/10 | Contrast, missing aria-labels, no focus rings |
| Form UX | 6/10 | No real-time validation |
| Copy & Microcopy | 6.5/10 | Generic errors, inconsistent terminology |
| Consistency | 6.5/10 | Typography, spacing, component patterns |
| User Flows | 6/10 | Missing confirmation screens, order summaries |

---

## Top 10 Priority Fixes

1. **Accessibility** — Add `aria-label` + visible focus rings to all interactive elements (buttons, inputs, toggles, modals) - fixed
2. **Accessibility** — Fix contrast ratios on placeholder text and secondary colors (WCAG AA)
3. **Robustness** — Implement 15-second API call timeouts + retry UI instead of infinite spinners
4. **Consistency** — Standardize button padding (`py-2.5` sm / `py-3` md / `py-4` lg)
5. **Form UX** — Add real-time inline validation with error borders/icons (not just on submit)
6. **VOD Scannability** — Add visual ownership badges ("✓ Purchased", gold border) in the VOD grid
7. **Blackout UX** — Show specific distance from venue, blackout end time, and in-person attendance info
8. **Transaction Safety** — Add confirmation screen before PPV/VOD purchase (price, expiry, event name)
9. **Mobile** — Fix video player controls: volume slider sizing, button spacing on phones < 375px
10. **Watchlist** — Sync watchlist state across browser tabs via localStorage events

---

## Critical Bugs

| Priority | Issue | File | Details |
|---|---|---|---|
| CRITICAL | Silent playback failure on token expiry | `LivePlayer` | After 12h, token refresh fails silently. Stream drops with no user-facing error |
| CRITICAL | IVS script load failure shows blank video | `LivePlayer:140-145` | If CDN blocks script, user sees black screen. Error logged to console only |
| HIGH | ~~VOD expired link indistinguishable from network error~~ | `VodPlayer:76-86` | already fixed |
| HIGH | Blackout restriction message too vague | `page.tsx (home):146-157` | No distance, no end time, no in-person option. Just "check back after broadcast window ends" |
| MEDIUM | ~~API calls have no timeout~~ | Multiple endpoints | fixed — 15s timeout + retry UI on generate-token |
| MEDIUM | ~~Form validation on submit only~~ | Contact form | fixed — real-time onBlur validation with inline errors |

---

## Navigation & Information Architecture

- ~~No skip-to-content link — keyboard users must tab through entire header~~ - fixed
- Redundant "All Events" buttons on VOD detail page (top and bottom)
- No breadcrumbs on `/watch` or `/live` — users lose context
- Header/footer hidden on report pages with no context indicator

## Visual Hierarchy & Layout

- Button styles inconsistent: white-bg, border-only, and transparent-with-border used interchangeably with no clear hierarchy
- `VodContent` poster image capped at `max-h-[400px]` while grid cards are full height — inconsistent proportions (`VodContent:203-210`)
- Triple-layered border/shadow/glow on VOD cards is visually noisy with 6+ items in grid
- ~~Display names and emails missing `truncate` in `UserMenu` — long names wrap~~ - already fixed

## Loading States & Feedback

- ~~No timeout for `/api/generate-token` — hangs forever with spinner (`LivePlayer`)~~ - fixed (15s AbortController + retry UI)
- ~~IVS player load failure is silent — `onError` logs to console, user sees blank video (`LivePlayer:144`)~~ - fixed
- ~~"Redirecting to checkout…" is too generic — doesn't communicate Stripe is involved (`VodBuyButton:54`)~~ - fixed
- ~~VOD player only handles `code === 2` for network errors; codes 3 (decode) and 4 (unsupported) are misclassified (`VodPlayer:50-65`)~~ - fixed
- ~~"Playback link expired" shows a Refresh button but copy doesn't explain it regenerates a new signed URL~~ - fixed
- 5-second stream start polling has no UX indicator of check frequency

## Empty States

- ~~"Event has ended" + no `replayUrl` → still shows "Waiting for stream to begin…" spinner. Should say "Event has ended. Replay not yet available."~~ - fixed
- ~~"No upcoming events" in Account is plain text, not styled as an empty state with CTA~~ - fixed
- Blackout restriction state needs: distance, end time, in-person attendance note

## Mobile Responsiveness

- ~~Event name in VOD grid uses `text-lg` on all screen sizes — needs `text-base sm:text-lg`~~ - fixed
- ~~"Continue to Checkout" button text overflows on < 320px screens (`FightPassPrompt:111`)~~ - fixed
- ~~Recover Access 6-digit inputs (`w-11 h-14`) are cramped on small phones — needs `sm:w-12 sm:h-16` (`RecoverAccess:210-224`)~~ - fixed
- ~~Form labels using `text-[10px]` universally — needs `text-xs sm:text-[10px]`~~ - fixed
- ~~`FightPassPrompt` modal uses `max-w-md` — leaves tiny margins on iPhone SE, needs `max-w-[calc(100vw-24px)]` on mobile~~ - fixed
- ~~Player controls (play/pause/volume) squeeze together on phones < 375px (`LivePlayer:550-596`)~~ - fixed

## Accessibility (WCAG 2.1 AA)

- ~~`placeholder-gray-600` on `white/5` background likely fails 4.5:1 contrast — Contact form, Recover Access inputs~~ - fixed (gray-500)
- ~~Recover Access 6-digit inputs have no `<label>` or `aria-label` (`RecoverAccess:210-224`)~~ - already fixed
- ~~16 missing `aria-label` attributes across 9 files (video players, expand/collapse FAQs, modal backdrops, VOD watchlist button)~~ - fixed
- ~~Expiry countdown uses color only to indicate urgency (`text-red-400`, `text-amber-400`, `text-gray-500`) — no icon or text prefix for colorblind users~~ - fixed
- ~~No `role="dialog"` or `aria-modal="true"` on `FightPassPrompt` modal (`FightPassPrompt:51`)~~ - already fixed
- IVS/Vidstack player volume `<input type="range">` missing `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- ~~Disabling both pricing buttons when one plan is loading is confusing — only the clicked button should show loading state (`PricingCards:145`)~~ - fixed

## Form UX

- ~~Contact form: no inline validation — errors only on submit~~ - fixed (onBlur validation + error borders)
- ~~Password minimum length (`minLength={6}`) not shown to users anywhere~~ - fixed
- Recover Access email step doesn't confirm which email the code was sent to
- ~~Resend code button shows countdown but no "Sent!" confirmation on success~~ - fixed
- ~~Recover Access success auto-redirects in 3 seconds — user can't read the message; should be 4-5s (`RecoverAccess:29`)~~ - fixed (5s)

## Copy & Microcopy

- ~~Terminology inconsistent: "Fight Pass", "subscription", "membership", "tier", "plan" — pick one set~~ - fixed ("Fight Pass" in UI, "subscription" only in legal/billing emails)
- ~~"Enter the email you used at checkout" implies purchase required; free accounts exist — should say "associated with your purchase or account"~~ - fixed
- ~~Recover Access code field doesn't say "6 digits" — should be "6-digit code expires in 15 minutes"~~ - already shows "6-digit code" + "expires in 15 minutes" on code step
- ~~Pricing card descriptions vague: "The full experience" doesn't explain what's included at a glance~~ - fixed
- ~~`hunter@boxstreamtv.com` hardcoded in 5+ places — should be one `/contact` link~~ - fixed
- ~~Inconsistent capitalization: "Sign In" vs "Sign in" vs "sign in"~~ - fixed

## Consistency

- Button padding: `py-2`, `py-2.5`, `py-3`, `py-4` used without clear size convention
- Font sizes: `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm` used interchangeably — no documented scale
- Border radius: most elements are sharp-cornered but VOD cards and modals have slight rounding — pick one
- ~~Error message styling differs per page: `text-red-300` (Contact) vs `text-red-400` (Login) vs same bg/border but different opacity values~~ - fixed
- VOD grid uses `gap-6 sm:gap-8`, EventCarousel uses `gap-6` — should align to one responsive gap pattern

## User Flows

### Sign-In
- ~~Google OAuth "or" divider looks like a separator, not a prompt — should say "Or sign in with Google"~~ - fixed ("Or continue with")
- ~~`?redirect` param accepts any path starting with `/` — doesn't prevent open redirect via `//__proto__` style paths~~ - fixed
- ~~"Sign up" link at bottom of login page is easy to miss — should have equal visual weight to Sign In CTA~~ - fixed (full-width bordered button on both login/signup)

### PPV Purchase
- ~~`markFightPassPromptSeen()` fires when user clicks "Continue to Checkout" (`LivePlayer:461`) — if they cancel Stripe, the prompt never shows again. Should clear after 24h or on page reload~~ - fixed (24h expiry)
- No order summary before Stripe redirect — user doesn't see event name, price, or 48h expiry window before committing
- Stripe error handling shows generic "Something went wrong" — should handle specific error types

### VOD Purchase
- ~~VOD grid has no visual indicator for already-purchased items vs available vs coming soon — needs a badge system~~ - fixed (green "✓ Purchased" badge on owned cards)
- `VodBuyButton` redirects to Stripe with no confirmation modal
- Purchase expiry countdown is only on the individual product card — not visible in the grid

### Recover Access
- Flow doesn't clarify if a guest buyer is creating an account or staying guest — should explain "You'll stay logged in this browser"
- No countdown timer visible as the 15-minute code window nears expiry

---

## Code-Level Notes

- Too many custom Tailwind sizes (`text-[10px]`, `w-11`, `h-14`) — should standardize in `tailwind.config`
- No shared `<FormInput>`, `<FormError>`, `<FormLabel>` components — form patterns are reimplemented per page
- Inline loading spinners should use Suspense boundaries + `loading.tsx` files instead of component-level state
- `LivePlayer` is 620+ lines — extract controls, error states, and initialization into sub-components
- `AnimatePresence` not used consistently on modal open/close animations
