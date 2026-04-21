-- ============================================================
-- BoxStreamTV — Master Supabase Schema
-- Source of truth. Reflects live DB as of 2026-04-12.
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
  ticket_url            text,                          -- external URL for in-person ticket purchases (shown during blackout)
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
-- Service role bypasses RLS; no explicit 'service write' policy needed.


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

  -- Boxer comp
  boxer_name                text,                    -- optional: boxer last name entered at checkout

  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_email      ON purchases (email);
CREATE INDEX IF NOT EXISTS idx_purchases_event_id   ON purchases (event_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id    ON purchases (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases (stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_stripe_pi  ON purchases (stripe_payment_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_promo_dedup ON purchases (email, event_id, amount_paid) WHERE amount_paid = 0;

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchases user read own"         ON purchases FOR SELECT USING (auth.jwt() ->> 'email' = email);
CREATE POLICY "Purchases user read own by uid"  ON purchases FOR SELECT USING (auth.uid() = user_id);


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
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions (stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Favorites user read own"       ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Favorites user add own"        ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Favorites user remove own"     ON favorites FOR DELETE USING (auth.uid() = user_id);


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
CREATE POLICY "NotifPrefs user read own"       ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "NotifPrefs user insert own"     ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "NotifPrefs user update own"     ON notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


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

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — only service role (RLS bypass) accesses this table.


-- ─────────────────────────────────────────────────────────────
-- Rate limiting (serverless-safe)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  key       text PRIMARY KEY,
  count     int  NOT NULL DEFAULT 1,
  reset_at  bigint NOT NULL  -- Unix timestamp in ms
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — only service role (RLS bypass) accesses this table.

-- ─────────────────────────────────────────────────────────────
-- COLUMN ADDITIONS (safe to re-run)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE events    ADD COLUMN IF NOT EXISTS survey_sent_at  timestamptz;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS survey_sent_at  timestamptz;


-- ─────────────────────────────────────────────────────────────
-- TABLE: feedback
-- Post-event / post-VOD survey responses.
-- Approved rows surface as testimonials on the homepage.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),

  -- Who
  email                     text        NOT NULL,
  display_name              text,                          -- shown on homepage testimonial

  -- Context
  trigger_type              text        NOT NULL CHECK (trigger_type IN ('ppv', 'vod')),
  event_id                  text        REFERENCES events(id) ON DELETE SET NULL,
  purchase_id               uuid        REFERENCES purchases(id) ON DELETE SET NULL,
  subject                   text        NOT NULL,          -- event or VOD name at time of survey

  -- Ratings (1–5)
  overall_rating            int         NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating            int         CHECK (quality_rating BETWEEN 1 AND 5),
  process_rating            int         CHECK (process_rating BETWEEN 1 AND 5),

  -- Open text
  comment                   text,                          -- testimonial copy
  what_was_missing          text,

  -- Testimonial management
  approved_for_testimonial  boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_feedback_email       ON feedback (email);
CREATE INDEX IF NOT EXISTS idx_feedback_event_id    ON feedback (event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_approved    ON feedback (approved_for_testimonial) WHERE approved_for_testimonial = true;

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
-- Only service role accesses this table; no user-facing RLS policies needed.


CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key       text,
  p_limit     int,
  p_window_ms bigint
) RETURNS jsonb AS $$
DECLARE
  v_now      bigint := (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
  v_count    int;
  v_reset_at bigint;
BEGIN
  INSERT INTO rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_now + p_window_ms)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN rate_limits.reset_at < v_now THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < v_now THEN v_now + p_window_ms
          ELSE rate_limits.reset_at
        END
  RETURNING count, reset_at INTO v_count, v_reset_at;

  IF v_count > p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after', ((v_reset_at - v_now) / 1000)::int
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql;
