-- ============================================================
-- Event email tracking columns
-- Run this in the Supabase SQL Editor
-- ============================================================

alter table public.events
  add column if not exists reminder_sent_at timestamptz,   -- 24h reminder email sent
  add column if not exists starting_sent_at timestamptz;   -- "starting now" email sent
