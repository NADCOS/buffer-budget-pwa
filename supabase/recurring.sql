-- =============================================================
--  MIGRATION: recurring transactions
--  Run in Supabase → SQL Editor. Idempotent; safe to re-run.
-- =============================================================

create table if not exists public.recurring (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric(12,2) not null default 0 check (amount >= 0),
  category     txn_category not null default 'Miscellaneous',
  description  text,
  cadence      text not null default 'monthly' check (cadence in ('weekly','biweekly','monthly')),
  day_of_month int check (day_of_month between 1 and 31),
  anchor_date  date not null default now(),
  auto_post    boolean not null default false,
  active       boolean not null default true,
  last_run     date,
  created_at   timestamptz not null default now()
);

create index if not exists idx_recurring_user on public.recurring (user_id, active);

-- Link generated transactions to their rule so re-runs don't duplicate.
alter table public.transactions add column if not exists recurring_id uuid;
create unique index if not exists uniq_txn_recurring
  on public.transactions (user_id, recurring_id, occurred_on)
  where recurring_id is not null;

alter table public.recurring enable row level security;
drop policy if exists "recurring_all_own" on public.recurring;
create policy "recurring_all_own" on public.recurring
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.recurring;
exception when duplicate_object then null;
end$$;
