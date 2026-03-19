-- ============================================================
-- Phase 2: Subscriptions ("Fight Pass") migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id text not null,
  stripe_subscription_id text unique not null,
  tier text not null check (tier in ('basic', 'premium')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast user lookups
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- Auto-update updated_at
create or replace function public.handle_subscription_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_subscription_updated
  before update on public.subscriptions
  for each row execute function public.handle_subscription_updated_at();

-- RLS policies
alter table public.subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service role (webhooks) can insert/update/delete subscriptions
-- No insert/update/delete policies for authenticated users
-- The webhook API route uses the service-role client which bypasses RLS
