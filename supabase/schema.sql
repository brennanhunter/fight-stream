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
  promoter_logo_url     text,                          -- shown on broadcast promoter logo overlay
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

  -- Refunds / disputes — set by charge.refunded / charge.dispute.created webhooks
  -- and by the admin refund tool. expires_at handles access; this powers revenue math.
  refunded_at               timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_purchases_email      ON purchases (email);
CREATE INDEX IF NOT EXISTS idx_purchases_event_id   ON purchases (event_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id    ON purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_refunded   ON purchases (refunded_at) WHERE refunded_at IS NOT NULL;
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
ALTER TABLE events    ADD COLUMN IF NOT EXISTS survey_sent_at      timestamptz;
ALTER TABLE events    ADD COLUMN IF NOT EXISTS promoter_logo_url   text;
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


-- ─────────────────────────────────────────────────────────────
-- TABLE: lower_third_state
-- Single-row state for the live lower-third broadcast overlay.
-- The display page (OBS browser source) subscribes via Realtime.
-- The control page writes via the service role through the API.
-- Added: 2026-04-25
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lower_third_state (
  id           integer     PRIMARY KEY DEFAULT 1,
  fighter_name text        NOT NULL DEFAULT '',
  record       text        NOT NULL DEFAULT '',
  weight_class text        NOT NULL DEFAULT '',
  visible      boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Enforce single row
INSERT INTO lower_third_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE lower_third_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lower_third public read" ON lower_third_state FOR SELECT USING (true);
-- Service role key used in API route handles writes; no explicit write policy needed.


-- ─────────────────────────────────────────────────────────────
-- TABLE: event_fighters
-- Pre-populated roster of fighters per event. Operators pick from
-- this table during a live broadcast instead of typing names.
-- Service role only (no user-facing RLS policies).
-- Added: 2026-04-27
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_fighters (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            text        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_name        text        NOT NULL,
  record              text,                    -- e.g. "12-3 (5 KOs)"
  weight_class        text,
  height              text,                    -- formatted by UI as 5'10" — stored as plain string
  reach               text,
  age                 integer,
  stance              text,                    -- orthodox | southpaw | switch
  hometown            text,
  nationality         text,                    -- e.g. "Mexico", "USA", "Ireland"
  photo_url           text,
  promoter_logo_url   text,                    -- per-fighter promoter override
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_fighters ADD COLUMN IF NOT EXISTS nationality text;

CREATE INDEX IF NOT EXISTS idx_event_fighters_event_id   ON event_fighters (event_id);
CREATE INDEX IF NOT EXISTS idx_event_fighters_event_sort ON event_fighters (event_id, sort_order);

ALTER TABLE event_fighters ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role (admin panel) only.


-- ─────────────────────────────────────────────────────────────
-- TABLE: overlay_state
-- Single source of truth for what each overlay type is currently
-- showing. One row per overlay type. OBS browser sources subscribe
-- to this table via Supabase Realtime.
--
-- payload examples:
--   lower_third:    { "fighter_name": "...", "record": "...", "weight_class": "..." }
--   boxer_card:     { "fighter_id": "uuid", "show_promoter_logo": true }
--   tale_of_tape:   { "left_id": "uuid", "right_id": "uuid" }
--   logo:           { } (no extra payload)
--   promoter_logo:  { "url": "..." }
--
-- The lower_third_state table above will be retired in Phase 2 of
-- the OVERLAY.md plan once the existing lower-third reads from here.
-- Added: 2026-04-27
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS overlay_state (
  overlay_type  text        PRIMARY KEY CHECK (
                              overlay_type IN ('lower_third', 'boxer_card', 'tale_of_tape', 'round_timer', 'logo', 'promoter_logo')
                            ),
  visible       boolean     NOT NULL DEFAULT false,
  payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- If the table already exists with the older CHECK constraint, widen it to
-- include round_timer. Drop+re-add is the only path for a CHECK change.
DO $$
BEGIN
  ALTER TABLE overlay_state DROP CONSTRAINT IF EXISTS overlay_state_overlay_type_check;
  ALTER TABLE overlay_state ADD CONSTRAINT overlay_state_overlay_type_check
    CHECK (overlay_type IN ('lower_third', 'boxer_card', 'tale_of_tape', 'round_timer', 'logo', 'promoter_logo'));
END $$;

-- Seed one row per overlay type so the control panel always finds them
INSERT INTO overlay_state (overlay_type) VALUES
  ('lower_third'),
  ('boxer_card'),
  ('tale_of_tape'),
  ('round_timer'),
  ('logo'),
  ('promoter_logo')
ON CONFLICT DO NOTHING;

ALTER TABLE overlay_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overlay_state public read" ON overlay_state FOR SELECT USING (true);
-- Service role key used in admin API handles writes; no explicit write policy needed.

-- Enable Supabase Realtime so OBS browser sources receive live updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE overlay_state;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- TABLE: event_vod_mapping
-- Explicit join between events.id and Stripe VOD product ids.
-- Solves the "event and VOD products are sometimes named differently"
-- problem: instead of inferring via product metadata.event_slug, the
-- admin manually links VOD products to events via the new admin UI.
--
-- One event ↔ many VOD products (full event replay + per-fight cards).
-- A VOD product can also belong to multiple events (e.g. "Best Of"
-- compilations) — the composite primary key allows this.
-- Added: 2026-05-02
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_vod_mapping (
  event_id          text        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stripe_product_id text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, stripe_product_id)
);

CREATE INDEX IF NOT EXISTS idx_event_vod_mapping_product ON event_vod_mapping (stripe_product_id);

ALTER TABLE event_vod_mapping ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role (admin panel) only.


-- ─────────────────────────────────────────────────────────────
-- TABLE: event_matches
-- Bouts on a given event card. Pairs two event_fighters rows and
-- captures round/timing config. The /control panel uses this as
-- its primary navigation: pick a match, all overlay actions scope
-- to it.
--
-- A 3-fight card = 6 event_fighters rows + 3 event_matches rows.
-- Added: 2026-05-02
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_matches (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          text        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sequence          integer     NOT NULL,                       -- 1, 2, 3 — order on card
  fighter_left_id   uuid        NOT NULL REFERENCES event_fighters(id),
  fighter_right_id  uuid        NOT NULL REFERENCES event_fighters(id),
  label             text,                                       -- "Main Event", "Title Fight", etc.
  scheduled_rounds  integer     NOT NULL DEFAULT 3,             -- 3 / 6 / 8 / 10 / 12
  round_seconds     integer     NOT NULL DEFAULT 180,           -- 3:00 default
  rest_seconds      integer     NOT NULL DEFAULT 60,            -- 1:00 default
  status            text        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_matches ADD COLUMN IF NOT EXISTS label text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_matches_event_seq ON event_matches (event_id, sequence);
CREATE INDEX IF NOT EXISTS idx_event_matches_event ON event_matches (event_id);

ALTER TABLE event_matches ENABLE ROW LEVEL SECURITY;
-- Service role (admin panel + control panel) only.
