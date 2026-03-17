-- ============================================
-- BoxStreamTV — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Purchases table
--    Unified table for both VoD and PPV purchases.
--    Keyed by customer email so purchases survive cookie clears
--    and work across devices.
CREATE TABLE IF NOT EXISTS purchases (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email           text NOT NULL,
  purchase_type   text NOT NULL CHECK (purchase_type IN ('vod', 'ppv')),

  -- Stripe references
  stripe_session_id       text,          -- Checkout Session ID (VoD)
  stripe_payment_intent_id text,         -- PaymentIntent ID (PPV)
  stripe_product_id       text,          -- Stripe product ID

  -- Cached product details (avoids Stripe API calls on every page load)
  product_name    text NOT NULL,
  product_image   text,                  -- product image URL
  s3_key          text,                  -- S3 key for VoD playback
  event_id        text,                  -- PPV event identifier (e.g., 'havoc-hilton-3-2026')

  -- Pricing
  amount_paid     integer NOT NULL,      -- in cents
  currency        text NOT NULL DEFAULT 'usd',

  -- Timestamps
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,           -- PPV access expiration (null = never expires)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_purchases_email ON purchases (email);
CREATE INDEX idx_purchases_event_id ON purchases (event_id);
CREATE INDEX idx_purchases_stripe_session ON purchases (stripe_session_id);
CREATE INDEX idx_purchases_stripe_pi ON purchases (stripe_payment_intent_id);

-- 2. Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policy: service role (server-side) can do everything
-- (The anon/public key won't be used for writes — only the service role key)
CREATE POLICY "Service role full access"
  ON purchases
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: authenticated users can read their own purchases
CREATE POLICY "Users can view own purchases"
  ON purchases
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- 3. Events table
--    Stores event config. Price, poster image, and currency are
--    pulled from Stripe via stripe_price_id at runtime.
CREATE TABLE IF NOT EXISTS events (
  id              text PRIMARY KEY,      -- e.g., 'havoc-hilton-3-2026'
  name            text NOT NULL,         -- 'Havoc at the Hilton 3'
  date            timestamptz NOT NULL,  -- event date/time
  stripe_price_id text,                  -- Stripe Price ID (image + price pulled from here)
  ivs_channel_arn text,                  -- IVS channel ARN for this event
  ivs_playback_url text,                 -- IVS playback URL
  venue_address   text,                  -- full venue address for geo-restriction
  blackout_radius_miles integer,         -- geo-restriction radius in miles
  expires_at      timestamptz,           -- when access expires
  is_active       boolean NOT NULL DEFAULT false, -- is this the current live event?
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events are public-readable (everyone can see event info)
CREATE POLICY "Events are publicly readable"
  ON events
  FOR SELECT
  USING (true);

-- Only service role can insert/update events
CREATE POLICY "Service role manages events"
  ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Seed the current event
INSERT INTO events (id, name, date, expires_at, is_active)
VALUES (
  'havoc-hilton-3-2026',
  'Havoc at the Hilton 3',
  '2026-03-07T19:00:00-05:00',
  '2026-03-08T23:59:59-05:00',
  false  -- set to true when you're ready to go live
);
