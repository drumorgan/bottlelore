-- Migration: remove_winery_admin()
-- Security definer function to remove a staff member from a winery.
-- Bypasses RLS and does its own auth checks for reliable error messages.
-- Only callable by super admins and owners of the target winery.
-- Prevents removing yourself (use a separate leave-winery flow for that).

create or replace function public.remove_winery_admin(target_admin_id uuid)
returns void as $$
declare
    target_record record;
begin
    -- Look up the winery_admins row
    select id, user_id, winery_id, role
      into target_record
      from public.winery_admins
     where id = target_admin_id;

    if not found then
        raise exception 'Staff member not found';
    end if;

    -- Prevent self-removal
    if target_record.user_id = auth.uid() then
        raise exception 'You cannot remove yourself';
    end if;

    -- Authorization: super admin or owner of this winery
    if not public.is_super_admin()
       and not public.is_winery_owner(target_record.winery_id) then
        raise exception 'Unauthorized — you must be a super admin or winery owner';
    end if;

    delete from public.winery_admins where id = target_admin_id;
end;
$$ language plpgsql security definer;
