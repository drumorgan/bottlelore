-- Migration: update_winery_admin_role()
-- Secure version with fixed search_path and explicit privileges.
-- Changes a staff member's role. Bypasses RLS with its own auth checks.
-- Only callable by super admins and owners of the target winery.
-- Prevents changing your own role.

create or replace function public.update_winery_admin_role(target_admin_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_record record;
begin
  if new_role not in ('owner', 'staff') then
    raise exception 'Invalid role: must be owner or staff';
  end if;
  select id, user_id, winery_id, role
    into target_record
    from public.winery_admins
   where id = target_admin_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
  if target_record.user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if not public.is_super_admin()
     and not public.is_winery_owner(target_record.winery_id) then
    raise exception 'Unauthorized — you must be a super admin or winery owner';
  end if;
  update public.winery_admins
     set role = new_role
   where id = target_admin_id;
end;
$$;

-- Lock down execution privileges
revoke all on function public.update_winery_admin_role(uuid, text) from public;
grant execute on function public.update_winery_admin_role(uuid, text) to authenticated;
