-- =============================================================
--  BUDGET PWA — POSTGRES SCHEMA + ROW LEVEL SECURITY
--  Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- =============================================================

-- Extensions ---------------------------------------------------
create extension if not exists "pgcrypto";

-- Enum: spending categories -----------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'txn_category') then
    create type txn_category as enum (
      'Food', 'Rent', 'Transport', 'Fun', 'Utilities', 'Miscellaneous'
    );
  end if;
end$$;

-- 1) PROFILES --------------------------------------------------
-- One row per auth user. Auto-created by a trigger on signup.
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  full_name      text,
  currency       text        not null default 'USD',
  monthly_income numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 2) BUDGETS (envelopes) --------------------------------------
-- One row per category per month. `month` is the 1st of the month.
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      txn_category not null,
  monthly_limit numeric(12,2) not null default 0 check (monthly_limit >= 0),
  is_fixed      boolean not null default false,       -- Rent/Utilities = fixed
  month         date not null default date_trunc('month', now())::date,
  created_at    timestamptz not null default now(),
  unique (user_id, category, month)
);

-- 3) TRANSACTIONS ---------------------------------------------
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  category     txn_category not null,
  description  text,
  occurred_on  date not null default now(),
  -- client-generated id used to de-dupe optimistic offline inserts
  client_uuid  uuid,
  created_at   timestamptz not null default now(),
  unique (user_id, client_uuid)
);

create index if not exists idx_txn_user_date on public.transactions (user_id, occurred_on desc);
create index if not exists idx_budget_user_month on public.budgets (user_id, month);

-- Auto-provision a profile row when a new auth user signs up ---
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
--  ROW LEVEL SECURITY — a user can ONLY touch their own rows
-- =============================================================
alter table public.profiles     enable row level security;
alter table public.budgets      enable row level security;
alter table public.transactions enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- BUDGETS
drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TRANSACTIONS
drop policy if exists "txn_all_own" on public.transactions;
create policy "txn_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
--  RPC: rolling buffer — unspent discretionary from last month
-- =============================================================
create or replace function public.rollover_buffer(target_month date)
returns numeric
language sql stable security definer set search_path = public
as $$
  with prev as (select (date_trunc('month', target_month) - interval '1 month')::date as m),
  limits as (
    select coalesce(sum(monthly_limit),0) as total_limit
    from public.budgets, prev
    where user_id = auth.uid() and is_fixed = false and month = prev.m
  ),
  spent as (
    select coalesce(sum(t.amount),0) as total_spent
    from public.transactions t, prev
    where t.user_id = auth.uid()
      and t.category not in ('Rent','Utilities')
      and date_trunc('month', t.occurred_on) = prev.m
  )
  select greatest(0, limits.total_limit - spent.total_spent) from limits, spent;
$$;
