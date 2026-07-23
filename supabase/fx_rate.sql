-- =============================================================
--  MIGRATION: optional manual FX rate (pin an exact daily rate)
--  Run in the Supabase SQL Editor.
-- =============================================================

alter table public.profiles
  add column if not exists fx_rate numeric(16,6);
