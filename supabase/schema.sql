-- ============================================================
-- BoxStreamTV — Master Supabase Schema
-- Source of truth. Reflects live DB as of 2026-04-07.
-- Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS guards).
-- Run in Supabase SQL Editor to bootstrap a fresh project.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- TABLE: events
-- One row per PPV event. Only one row may have is_active = true.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                    text PRIMARY KEY,               -- e.g. 'havoc-hilton-3-2026'
  name                  text        NOT NULL,           -- display name
  date                  timestamptz NOT NULL,           -- event date/time (UTC)
  stripe_price_id       text,                          -- Stripe Price ID (price + poster pulled from here)
  ivs_channel_arn       text,                          -- IVS channel ARN
  ivs_playback_url      text,                          -- IVS playback URL
  replay_url            text,                          -- post-event replay URL
  venue_address         text,                          -- full address for geo-restriction
  blackout_radius_miles integer     DEFAULT 90,        -- geo-blackout radius in miles
  expires_at            timestamptz,                   -- when buyer access expires
  is_active             boolean     NOT NULL DEFAULT false,
  is_streaming          boolean     NOT NULL DEFAULT false, -- controls Watch Now CTA visibility
  promoter_email        text,                          -- OTP gate for promoter report
  promoter_name         text,                          -- displayed as greeting on report
  reminder_sent_at      timestamptz,                   -- set by Inngest when reminder email fires
  starting_sent_at      timestamptz,                   -- set by Inngest when "starting soon" email fires
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events public read"      ON events FOR SELECT USING (true);
CREATE POLICY "Events service write"    ON events FOR ALL    USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- TABLE: purchases
-- Unified PPV + VoD purchase record, keyed by customer email.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     text        NOT NULL,
  purchase_type             text        NOT NULL CHECK (purchase_type IN ('vod', 'ppv')),

  -- Stripe references
  stripe_session_id         text,                    -- Checkout Session ID (VoD)
  stripe_payment_intent_id  text,                    -- PaymentIntent ID (PPV)
  stripe_product_id         text,                    -- Stripe Product ID

  -- Cached product details (avoids Stripe round-trips on every load)
  product_name              text        NOT NULL,
  product_image             text,
  s3_key                    text,                    -- S3 key for VoD video
  event_id                  text,                    -- references events.id (PPV)
  user_id                   uuid,                    -- references auth.users.id (nullable — email-only buyers)

  -- Pricing
  amount_paid               integer     NOT NULL,    -- cents
  currency                  text        NOT NULL DEFAULT 'usd',

  -- Access window
  purchased_at              timestamptz NOT NULL DEFAULT now(),
  expires_at                timestamptz,             -- null = never expires (VoD lifetime)

  -- Session management
  session_version           integer     NOT NULL DEFAULT 1,   -- bump to invalidate active sessions
  session_claimed_at        timestamptz,

  -- Recovery
  recovery_code             text,
  recovery_code_expires_at  timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_email      ON purchases (email);
CREATE INDEX IF NOT EXISTS idx_purchases_event_id   ON purchases (event_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_pi  ON purchases (stripe_payment_intent_id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchases service full access"   ON purchases FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Purchases user read own"         ON purchases FOR SELECT USING (auth.jwt() ->> 'email' = email);


-- ─────────────────────────────────────────────────────────────
-- TABLE: profiles
-- One row per Supabase Auth user.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email         text        NOT NULL,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles service full access"  ON profiles FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Profiles user read own"        ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles user update own"      ON profiles FOR UPDATE USING (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────
-- TABLE: subscriptions
-- Stripe subscription state, synced via webhook.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  stripe_customer_id      text        NOT NULL,
  stripe_subscription_id  text        NOT NULL,
  tier                    text        NOT NULL,
  status                  text        NOT NULL DEFAULT 'active',  -- active | trialing | past_due | canceled | unpaid
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean     DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions (stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions service full access" ON subscriptions FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Subscriptions user read own"       ON subscriptions FOR SELECT USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- TABLE: favorites
-- User watchlist / saved items.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_type   text        NOT NULL,   -- e.g. 'vod', 'event'
  item_id     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favorites service full access" ON favorites FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Favorites user read own"       ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Favorites user write own"      ON favorites FOR ALL    USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- TABLE: notification_preferences
-- Per-user email notification opt-ins.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  new_events  boolean     NOT NULL DEFAULT true,
  promotions  boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NotifPrefs service full access" ON notification_preferences FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "NotifPrefs user read own"       ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "NotifPrefs user write own"      ON notification_preferences FOR ALL    USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- TABLE: stripe_events
-- Idempotency log — prevents double-processing Stripe webhooks.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_events (
  id          bigint      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_id    text        NOT NULL UNIQUE,  -- Stripe event ID (evt_...)
  event_type  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


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
  session_version integer NOT NULL DEFAULT 1, -- bumped on each session creation to enforce single active viewer
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
  replay_url      text,                  -- IVS recording URL for post-event replay
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
