-- =============================================================
--  MIGRATION: monthly savings contributions (growth history)
--  Run in the Supabase SQL Editor after credits_savings.sql
-- =============================================================

create table if not exists public.savings_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      date not null default date_trunc('month', now())::date,
  amount     numeric(14,2) not null default 0,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_savings_entries_user
  on public.savings_entries (user_id, month);

alter table public.savings_entries enable row level security;

drop policy if exists "savings_entries_all_own" on public.savings_entries;
create policy "savings_entries_all_own" on public.savings_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.savings_entries;
  exception when duplicate_object then null;
  end;
end$$;
