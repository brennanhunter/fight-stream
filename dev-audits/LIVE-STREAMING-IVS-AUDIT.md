# Audit: Live Streaming & IVS

**Auditor:** Dev 6
**Status:** Complete
**Date completed:** 2026-04-11

---

## Scope

The live event experience — token generation, IVS playback, stream status, and the live player UI.

### Files to review

| Type | Files |
|------|-------|
| API | `src/app/api/generate-token/route.ts`, `src/app/api/stream-status/route.ts` |
| Pages | `src/app/live/page.tsx`, `src/app/live/LivePlayer.tsx` |
| Public | `public/amazon-ivs-wasmworker.min.js` |

---

## Audit Checklist

For each item, mark: ✅ Pass, ❌ Fail, ⚠️ Needs attention, ➖ N/A

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | IVS token signing — is the private key handled securely? Is the token scoped correctly (channel ARN, expiry)? | ✅ | Private key from env var, ES384 with key pair ARN, scoped to channel ARN, 12h expiry, `access-control-allow-origin` set to site URL |
| 2 | Access check in generate-token — does it cover all paths (cookie session, DB purchase, subscription, premium)? | ✅ | Cookie → session_version check → DB purchase by user_id → DB purchase by email (normalizeEmail) → premium subscription. Dev 5 already fixed expires_at filter and normalizeEmail. |
| 3 | Stream status endpoint — is it public? Should it be rate-limited? | ⚠️ | Public GET, CDN caching mitigated (s-maxage=10) but no origin-level rate limit. **Fixed: added rateLimit(60/min).** |
| 4 | Player error states — what happens when the stream goes down mid-watch? | ✅ | ERROR/IDLE events set isStreamLive=false, health check catches stalls >5s, auto-reconnect poll every 5s |
| 5 | Token expiry and refresh — does the player request a new token before the old one expires? | ⚠️ | Token obtained once with 12h expiry. Reconnection poll reused stale URL. **Fixed: added token refresh when token age > 10h.** |
| 6 | WASM worker — is the IVS SDK version current? Any known vulnerabilities? | ⚠️ | Was loading v1.26.0, current is v1.33.0. **Fixed: updated to v1.33.0.** |
| 7 | Can a valid token be reused across devices or shared? | ✅ | IVS tokens are stateless bearer tokens by design. `access-control-allow-origin` restricts to site URL. No per-viewer binding available in IVS — this is an inherent platform limitation, not a bug. |

---

## Issues Found

### Issue 1: Unsafe Stripe client instantiation

- **File:** `src/app/live/page.tsx`
- **Line(s):** 20
- **Severity:** Medium
- **Description:** Used `new Stripe(process.env.STRIPE_SECRET_KEY!)` instead of shared null-safe `stripeServer` from `src/lib/stripe.ts`. Same anti-pattern already fixed in 8+ files by Devs 2, 3, 4. Non-null assertion could crash at module load time if env var is missing.
- **Suggested fix:** Import `stripeServer` from `@/lib/stripe` with null guard.
- **Fixed?** Yes

### Issue 2: No IVS token refresh on reconnection

- **File:** `src/app/live/LivePlayer.tsx`
- **Line(s):** Access check useEffect + reconnection poll useEffect
- **Severity:** Medium
- **Description:** IVS playback token obtained once on mount with 12-hour expiry. The `playbackUrl` (with embedded token) was cached in React state and reused by the offline reconnection poll. If a user opened the page early and waited hours, or if the stream dropped and restarted after many hours, the stale token would cause all reconnection attempts to fail silently.
- **Suggested fix:** Track token fetch time; refresh token before reconnection when age exceeds threshold (10h, 2h before 12h expiry).
- **Fixed?** Yes

### Issue 3: Stream-status endpoint missing rate limiting

- **File:** `src/app/api/stream-status/route.ts`
- **Line(s):** 1-12
- **Severity:** Low
- **Description:** Public GET endpoint with no authentication or rate limiting. CDN cache headers (`s-maxage=10`) mitigate at edge but don't protect origin from direct requests. Could be used for DoS.
- **Suggested fix:** Add `rateLimit(request, 'stream-status', 60)` — generous limit since many viewers poll this.
- **Fixed?** Yes

### Issue 4: IVS SDK version outdated (v1.26.0 → v1.33.0)

- **File:** `src/app/live/LivePlayer.tsx`
- **Line(s):** IVS script loading
- **Severity:** Medium
- **Description:** IVS Web Player SDK v1.26.0 was 7 minor versions behind the current v1.33.0. Outdated SDK may be missing security patches, bug fixes, and performance improvements.
- **Suggested fix:** Update script src to `https://player.live-video.net/1.33.0/amazon-ivs-player.min.js`.
- **Fixed?** Yes

---

## Summary

- **Total issues found:** 4
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 1
- **Additional notes:** Dev 5 previously fixed 3 issues in `generate-token/route.ts` (expires_at filter, normalizeEmail, shared constants). IVS tokens are inherently not user-bound — this is a platform limitation, not a code bug. The WASM worker file in `public/` should be updated to match v1.33.0 (manual step: download from IVS CDN).
