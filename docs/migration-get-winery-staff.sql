-- Migration: get_winery_staff()
-- Returns staff list for a winery, joining winery_admins with auth.users
-- to expose email. Uses security definer to access auth.users.
-- Only callable by super admins and owners of the target winery.

create or replace function public.get_winery_staff(target_winery_id uuid)
returns table(
    admin_id uuid,
    user_id uuid,
    email text,
    role text,
    created_at timestamptz
) as $$
begin
    -- Authorization: super admin or owner of this winery
    if not public.is_super_admin() and not public.is_winery_owner(target_winery_id) then
        raise exception 'Unauthorized';
    end if;

    return query
        select
            wa.id as admin_id,
            wa.user_id,
            u.email::text,
            wa.role,
            wa.created_at
        from public.winery_admins wa
        join auth.users u on u.id = wa.user_id
        where wa.winery_id = target_winery_id
        order by wa.created_at;
end;
$$ language plpgsql security definer stable;
