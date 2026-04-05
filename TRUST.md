# BoxStreamTV — Trust & Support Reduction Plan

## Status Key
- ✅ Done
- ⬜ Not started

---

## Reduce Support Volume

| # | Item | Description | Status |
|---|------|-------------|--------|
| 1 | FAQ / Help page | Answers "where do I watch?", "what if I can't access?", "can I get a refund?", "does it work on mobile?", "what if the stream goes down?" before users ever email | ✅ |
| 2 | Pre-stream countdown on home page | Instead of an error when the stream hasn't started, show a live countdown. Eliminates "is it working?" panics | ✅ |
| 3 | Better 404 and 500 pages | On-brand, with helpful links back to safety instead of a blank Next.js error | ✅ |

---

## Build Trust

| # | Item | Description | Status |
|---|------|-------------|--------|
| 4 | Visible support contact everywhere | Not just in emails — on the watch page, purchase confirmation page, and account page. People trust platforms they know they can reach | ⬜ |
| 5 | "Access expires" notice on watch page | Show users exactly when their access ends so there are no surprises | ⬜ |

---

## Reduce Your Workload When Issues Happen

| # | Item | Description | Status |
|---|------|-------------|--------|
| 6 | Admin panel | Password-protected `/admin` page to look up a purchase by email, manually grant access, and see recent purchases. Avoids going into Supabase directly for every issue | ⬜ |

---

## Notes

- FAQ page should link to the recover access flow (`/recover-access`) as the first answer to access issues
- Countdown on watch page should auto-refresh when the event starts — no page reload needed
- Admin panel should be behind a strong secret (env var check), never linked publicly
- Support email is `hunter@boxstreamtv.com` — set response expectation on contact/FAQ page
