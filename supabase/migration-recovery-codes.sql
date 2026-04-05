-- ============================================================
-- Recovery codes migration
-- Run this in the Supabase SQL Editor
-- ============================================================

alter table public.purchases
  add column if not exists recovery_code text,
  add column if not exists recovery_code_expires_at timestamptz;
