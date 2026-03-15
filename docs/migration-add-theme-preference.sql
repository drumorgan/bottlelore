-- Migration: Add theme_preference column to wineries
-- ============================================================================
-- The admin UI (winery profile + super admin winery editor) already saves
-- theme_preference, and public views pass it to applyTheme(). But the
-- column was never created in the original schema.
--
-- Without this column, any Supabase select that includes theme_preference
-- returns a PostgREST column-not-found error, which breaks public wine
-- and flight pages ("Wine not found").
--
-- Run this in the Supabase SQL Editor, then update the gateway queries
-- to include theme_preference in the wineries join again.
-- ============================================================================

-- Add the column (nullable, defaults to 'auto')
alter table public.wineries
  add column if not exists theme_preference text not null default 'auto'
  check (theme_preference in ('auto', 'day', 'night'));
