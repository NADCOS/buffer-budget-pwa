-- =============================================================
--  MIGRATION: online credits + savings/bank accounts
--  Run in the Supabase SQL Editor (Dashboard → SQL → New query)
-- =============================================================

-- 1) ONLINE CREDITS (debts being paid off) --------------------
create table if not exists public.credits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null default '',
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount  numeric(14,2) not null default 0 check (paid_amount  >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2) SAVINGS / BANK ACCOUNTS ----------------------------------
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  balance    numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_credits_user  on public.credits  (user_id, created_at);
create index if not exists idx_accounts_user on public.accounts (user_id, created_at);

-- Row Level Security ------------------------------------------
alter table public.credits  enable row level security;
alter table public.accounts enable row level security;

drop policy if exists "credits_all_own" on public.credits;
create policy "credits_all_own" on public.credits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "accounts_all_own" on public.accounts;
create policy "accounts_all_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime (ignore errors if already in the publication) ------
do $$
begin
  begin
    alter publication supabase_realtime add table public.credits;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.accounts;
  exception when duplicate_object then null;
  end;
end$$;
