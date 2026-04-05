-- ============================================================
-- BoxStreamTV — Full schema migration
-- Safe to run at any time — adds missing columns only
-- ============================================================

-- EVENTS
alter table public.events
  add column if not exists is_active              boolean       default false,
  add column if not exists date                   timestamptz,
  add column if not exists expires_at             timestamptz,
  add column if not exists ivs_channel_arn        text,
  add column if not exists ivs_playback_url       text,
  add column if not exists venue_address          text,
  add column if not exists blackout_radius_miles  int,
  add column if not exists replay_url             text,
  add column if not exists reminder_sent_at       timestamptz,
  add column if not exists starting_sent_at       timestamptz;

-- PURCHASES
alter table public.purchases
  add column if not exists email                     text,
  add column if not exists user_id                   uuid references auth.users(id),
  add column if not exists purchase_type             text,
  add column if not exists event_id                  uuid references public.events(id),
  add column if not exists stripe_payment_intent_id  text unique,
  add column if not exists stripe_session_id         text unique,
  add column if not exists stripe_product_id         text,
  add column if not exists product_name              text,
  add column if not exists product_image             text,
  add column if not exists s3_key                    text,
  add column if not exists amount_paid               integer,
  add column if not exists currency                  text,
  add column if not exists expires_at                timestamptz,
  add column if not exists session_version           integer default 1,
  add column if not exists session_claimed_at        timestamptz,
  add column if not exists recovery_code             text,
  add column if not exists recovery_code_expires_at  timestamptz;

-- SUBSCRIPTIONS
alter table public.subscriptions
  add column if not exists user_id                 uuid references auth.users(id),
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text unique,
  add column if not exists tier                    text,
  add column if not exists status                  text,
  add column if not exists current_period_start    timestamptz,
  add column if not exists current_period_end      timestamptz,
  add column if not exists cancel_at_period_end    boolean default false;

-- PROFILES
alter table public.profiles
  add column if not exists display_name  text;

-- NOTIFICATION_PREFERENCES
alter table public.notification_preferences
  add column if not exists user_id     uuid unique references auth.users(id),
  add column if not exists new_events  boolean default true,
  add column if not exists promotions  boolean default true;

-- FAVORITES
alter table public.favorites
  add column if not exists user_id     uuid references auth.users(id),
  add column if not exists item_type   text,
  add column if not exists item_id     text,
  add column if not exists created_at  timestamptz default now();
