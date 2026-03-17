-- Migration: Allow users to read their own winery_admins rows
-- Without this, RLS blocks getAdminWineries() and staff users see
-- "You are not assigned to any winery" even when they are.

-- Users can see their own winery assignments (needed for role detection
-- and the admin panel winery context)
create policy "Users can read own winery assignments"
    on public.winery_admins for select
    using (user_id = auth.uid());
