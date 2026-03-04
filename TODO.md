# TODO

## Refactor PPV flow to be dynamic (like VoD)

The VoD pipeline is fully dynamic — add a Stripe product with `s3_key` metadata and it works automatically. The PPV pipeline needs the same treatment. Currently every value is hardcoded to the "Havoc at Hilton 2025" event.

### What needs to change

- **`/api/create-payment-intent`** — Price ($4.99), event name, and event ID are hardcoded. Should read from a Stripe product or config so new events don't require code changes.
- **`/api/verify-payment`** — Creates a session with hardcoded `eventId` and `eventName`. Should pull these from the Stripe PaymentIntent metadata instead.
- **`/lib/session.ts`** — `getEventExpirationDate()` returns a hardcoded Nov 2025 date. `createHavocAtHiltonSession()` is a single-event helper. These need to be driven by event data.
- **`/api/generate-token`** — Gates access behind `hasEventAccess('havoc-hilton-2025')`. Needs to accept a dynamic event ID.
- **`PaymentModal.tsx`** — Displays hardcoded "$4.99" and "TBA" event info. Should render actual event details.
- **IVS player overlay** — Purchase CTA is commented out. Needs to be re-enabled and wired to the dynamic flow.

### Goal

Drive PPV event details (price, name, date, IVS channel, expiration) from Stripe product metadata or a similar config, so launching a new PPV event requires zero code changes.
