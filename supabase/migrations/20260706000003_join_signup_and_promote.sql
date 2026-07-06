-- ═════════════════════════════════════════════════════════════════════════════
-- Migration 20260706000003 — Join sign-up + member promotion
-- ═════════════════════════════════════════════════════════════════════════════
--
-- 1. Adds a promote_household_member RPC so admins can upgrade members' roles
--    from settings. Only admins in the same household can call it, and a sole
--    admin cannot be demoted.
-- 2. Drops the restrictive members_update policy and replaces it with:
--    - Self-update (leave household / change own name)
--    - Admin-update (promote/demote other members)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Promote/demote a household member ──
-- Only the same-household admin can call this. The last admin cannot be demoted.
create or replace function public.promote_household_member(
  target_user_id uuid,
  new_role text
)
returns jsonb as $$
declare
  caller_role text;
  target_hid uuid;
  admin_count int;
begin
  -- Find the target's household
  select household_id into target_hid
  from public.household_members
  where user_id = target_user_id
  limit 1;

  if target_hid is null then
    return jsonb_build_object('ok', false, 'error', 'Target user is not a household member');
  end if;

  -- Check caller is an admin of the same household
  select role into caller_role
  from public.household_members
  where household_id = target_hid and user_id = auth.uid();

  if caller_role is null then
    return jsonb_build_object('ok', false, 'error', 'You are not a member of this household');
  end if;

  if caller_role != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Only admins can change member roles');
  end if;

  -- Validate the target role
  if new_role not in ('admin', 'parent', 'contributor', 'viewer') then
    return jsonb_build_object('ok', false, 'error', 'Invalid role — must be admin, parent, contributor, or viewer');
  end if;

  -- If demoting someone away from admin, ensure there's at least one other admin
  if new_role != 'admin' then
    select count(*) into admin_count
    from public.household_members
    where household_id = target_hid and role = 'admin';

    if admin_count <= 1 and exists (
      select 1 from public.household_members
      where household_id = target_hid and user_id = target_user_id and role = 'admin'
    ) then
      return jsonb_build_object('ok', false, 'error', 'Cannot demote the last admin of this household');
    end if;
  end if;

  -- Update the role
  update public.household_members
  set role = new_role
  where user_id = target_user_id and household_id = target_hid;

  return jsonb_build_object('ok', true);
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.promote_household_member(uuid, text) from public, anon;
grant execute on function public.promote_household_member(uuid, text) to authenticated;

-- ── Replace members_update policy to allow admin mutations ──
-- The previous policy only allowed self-update. The new one lets admins
-- update any member in their household (for role changes) and still allows
-- self-update (e.g. leaving the household).
drop policy if exists members_update on public.household_members;

create policy members_update on public.household_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.has_min_role(
      (select household_id from public.household_members where user_id = auth.uid() limit 1),
      'admin'
    )
  )
  with check (
    user_id = auth.uid()
    or public.has_min_role(
      (select household_id from public.household_members where user_id = auth.uid() limit 1),
      'admin'
    )
  );
