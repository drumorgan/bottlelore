-- Migration: remove_winery_admin()
-- Secure version with fixed search_path and explicit privileges.
-- Removes a staff member from a winery. Bypasses RLS with its own auth checks.
-- Only callable by super admins and owners of the target winery.
-- Prevents removing yourself.

create or replace function public.remove_winery_admin(target_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_record record;
begin
  select id, user_id, winery_id, role
    into target_record
    from public.winery_admins
   where id = target_admin_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
  if target_record.user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;
  if not public.is_super_admin()
     and not public.is_winery_owner(target_record.winery_id) then
    raise exception 'Unauthorized — you must be a super admin or winery owner';
  end if;
  delete from public.winery_admins
   where id = target_admin_id;
end;
$$;

-- Lock down execution privileges
revoke all on function public.remove_winery_admin(uuid) from public;
grant execute on function public.remove_winery_admin(uuid) to authenticated;
