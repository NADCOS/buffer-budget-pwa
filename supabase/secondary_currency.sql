-- =============================================================
--  MIGRATION: secondary display currency (e.g. view savings in PHP)
--  Run in the Supabase SQL Editor.
-- =============================================================

alter table public.profiles
  add column if not exists secondary_currency text;
