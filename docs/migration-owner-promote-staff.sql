-- Migration: Allow winery owners to manage roles (promote/demote)
-- This enables owners to promote staff → owner or demote owner → staff
-- without requiring super admin intervention.

-- 1. Add UPDATE policy for winery owners on winery_admins
--    Owners can update roles for other members of their winery (not themselves)
create policy "Winery owners can update staff roles"
    on public.winery_admins for update
    using (
        exists (
            select 1 from public.winery_admins wa
            where wa.winery_id = winery_admins.winery_id
              and wa.user_id = auth.uid()
              and wa.role = 'owner'
        )
        and winery_admins.user_id != auth.uid()
    )
    with check (
        exists (
            select 1 from public.winery_admins wa
            where wa.winery_id = winery_admins.winery_id
              and wa.user_id = auth.uid()
              and wa.role = 'owner'
        )
        and winery_admins.user_id != auth.uid()
    );

-- 2. Update link_user_to_winery to allow owners to assign the owner role
--    (used by the invite flow for new users)
create or replace function public.link_user_to_winery(
    target_user_id uuid,
    target_winery_id uuid,
    target_role text default 'staff'
)
returns uuid as $$
declare
    new_id uuid;
begin
    -- Only super admins and winery owners can call this
    if not public.is_super_admin() and not public.is_winery_owner(target_winery_id) then
        raise exception 'Unauthorized';
    end if;

    insert into public.winery_admins (user_id, winery_id, role)
    values (target_user_id, target_winery_id, target_role)
    returning id into new_id;

    return new_id;
end;
$$ language plpgsql security definer;
