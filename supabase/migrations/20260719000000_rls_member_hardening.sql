-- =============================================================================
-- RLS hardening — close two tenant-isolation gaps on public.household_members
-- =============================================================================
-- Audit findings:
--
-- 1. CRITICAL — cross-tenant membership insert.
--    members_insert used
--        WITH CHECK (user_id = auth.uid() OR public.is_member(household_id))
--    The `user_id = auth.uid()` branch let ANY authenticated user insert a
--    membership row for THEMSELVES into ANY household_id (with any role,
--    including 'admin'), bypassing accept_invite()'s code validation. Because
--    household_ids are not secrets (they appear as storage folder paths in the
--    `memories` bucket, in URLs, support tickets, etc.), a leaked id was enough
--    to join another family and read/write all their data.
--    Every legitimate insert path is SECURITY DEFINER and bypasses RLS
--    (accept_invite() RPC, households_add_creator trigger), and no client code
--    inserts into household_members directly — so the self-insert branch is
--    pure attack surface. Restrict INSERT to existing members of the household.
--
-- 2. MEDIUM — role self-escalation.
--    members_update allows self-update (user_id = auth.uid()), which let a
--    non-admin member set their OWN role to 'admin' with a direct UPDATE,
--    bypassing the admin-only promote_household_member() RPC. A BEFORE UPDATE
--    trigger now freezes `role` for any caller that is neither the service role
--    nor an admin of the row's household (mirrors households_billing_guard).
--    Self-service updates of other columns (e.g. display_name) still work.
-- =============================================================================

-- 1. Tighten members_insert -----------------------------------------------------
drop policy if exists members_insert on public.household_members;
create policy members_insert on public.household_members
  for insert to authenticated
  with check (public.is_member(household_id));

-- 2. Guard role changes ---------------------------------------------------------
create or replace function public.guard_household_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') <> 'service_role'
       and not public.has_min_role(old.household_id, 'admin') then
      -- Not the webhook and not an admin of this household → freeze the role.
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_household_member_role() from public, anon, authenticated;

drop trigger if exists household_member_role_guard on public.household_members;
create trigger household_member_role_guard
  before update on public.household_members
  for each row execute function public.guard_household_member_role();
