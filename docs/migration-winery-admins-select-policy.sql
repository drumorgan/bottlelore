-- Migration: Fix infinite recursion on winery_admins RLS policies
--
-- Problem: Existing SELECT/UPDATE policies on winery_admins contain
-- subqueries that reference winery_admins itself, causing infinite
-- recursion during any query against the table.
--
-- Solution: Drop ALL existing policies and replace with minimal,
-- non-recursive ones. Admin operations (staff list, role change,
-- remove) are already handled by SECURITY DEFINER functions that
-- bypass RLS entirely.

-- Step 1: Drop every existing policy on winery_admins
-- (Run this even if some don't exist — "if exists" prevents errors)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
      from pg_policies
     where tablename = 'winery_admins'
       and schemaname = 'public'
  loop
    execute format('drop policy %I on public.winery_admins', pol.policyname);
  end loop;
end;
$$;

-- Step 2: Ensure RLS is enabled
alter table public.winery_admins enable row level security;

-- Step 3: Create ONE simple SELECT policy — no subqueries, no recursion
-- Each user can read their own winery_admins rows (for role detection
-- and winery context on the admin panel).
-- Super admin / owner staff-list queries go through get_winery_staff()
-- which is SECURITY DEFINER and bypasses RLS.
create policy "Users can read own winery assignments"
    on public.winery_admins for select
    using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies needed:
--   INSERT  → edge function uses service role (bypasses RLS)
--   UPDATE  → update_winery_admin_role() is SECURITY DEFINER
--   DELETE  → remove_winery_admin() is SECURITY DEFINER
