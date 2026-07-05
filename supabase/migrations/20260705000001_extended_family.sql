-- =============================================================================
-- PointPals — Extended Family + Kid Sharing
-- Phase 1: grandparents/extended family + shared kids (same pool)
--
-- Adds:
--   1. Expanded roles: viewer (read-only), contributor (read + award points + memories)
--   2. kid_shares table — a kid visible in multiple households, same point pool
--   3. household_invites table — invite codes for extended family
--   4. Role-aware RLS policies
--   5. Edge function helpers for invite flow
-- =============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Expand role check on household_members
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('admin','parent','contributor','viewer'));

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Kid sharing across households
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.kid_shares (
  kid_id       uuid not null references public.kids(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (kid_id, household_id)
);

-- Fast lookup: which kids are shared into a given household
create index if not exists kid_shares_household_idx
  on public.kid_shares(household_id);

-- Prevent sharing a kid into their own primary household (redundant)
create or replace function public.check_kid_share_not_primary() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.kids where id = new.kid_id and household_id = new.household_id) then
    raise exception 'Cannot share a kid into their primary household';
  end if;
  return new;
end;
$$;

drop trigger if exists kid_shares_no_primary on public.kid_shares;
create trigger kid_shares_no_primary
  before insert on public.kid_shares
  for each row execute function public.check_kid_share_not_primary();

grant select on public.kid_shares to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Household invites
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  code          text not null unique,
  role          text not null default 'viewer'
                 check (role in ('contributor','viewer')),
  created_by    uuid not null references auth.users(id) on delete cascade,
  used_by       uuid references auth.users(id) on delete set null,
  used_at       timestamptz,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now()
);

create index if not exists household_invites_code_idx on public.household_invites(code);
create index if not exists household_invites_household_idx on public.household_invites(household_id);

grant select, insert, update on public.household_invites to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Granular role helpers
-- ═════════════════════════════════════════════════════════════════════════════

-- Check if user has a specific role (or higher) in a household
-- Hierarchy: admin > parent > contributor > viewer
create or replace function public.has_min_role(hid uuid, min_role text)
returns boolean as $$
declare
  user_role text;
  role_rank int;
  min_rank  int;
begin
  select m.role into user_role
  from public.household_members m
  where m.household_id = hid and m.user_id = auth.uid();

  if user_role is null then
    return false;
  end if;

  role_rank := case user_role
    when 'admin'       then 4
    when 'parent'      then 3
    when 'contributor' then 2
    when 'viewer'      then 1
    else 0
  end;

  min_rank := case min_role
    when 'admin'       then 4
    when 'parent'      then 3
    when 'contributor' then 2
    when 'viewer'      then 1
    else 0
  end;

  return role_rank >= min_rank;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke execute on function public.has_min_role(uuid, text) from public, anon, authenticated;

-- Check if user can see a kid (primary household member OR shared household member)
create or replace function public.can_see_kid(kid_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.kids k
    where k.id = kid_id
      and public.is_member(k.household_id)
  ) or exists (
    select 1 from public.kid_shares ks
    where ks.kid_id = kid_id
      and public.is_member(ks.household_id)
  );
$$ language sql stable security definer set search_path = public;

revoke execute on function public.can_see_kid(uuid) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. Updated RLS policies
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Kids ──
-- Select: can see a kid if you're a member of their household OR a share household
drop policy if exists kids_all on public.kids;
create policy kids_select on public.kids
  for select to authenticated
  using (public.can_see_kid(id));

-- Insert/Update/Delete: only admin/parent of the kid's primary household
create policy kids_insert on public.kids
  for insert to authenticated
  with check (public.has_min_role(household_id, 'parent'));

create policy kids_update on public.kids
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));

create policy kids_delete on public.kids
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ── Chores ──
drop policy if exists chores_all on public.chores;

create policy chores_select on public.chores
  for select to authenticated
  using (public.is_member(household_id));

create policy chores_insert on public.chores
  for insert to authenticated
  with check (public.has_min_role(household_id, 'parent'));

create policy chores_update on public.chores
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));

create policy chores_delete on public.chores
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ── Skills ──
drop policy if exists skills_all on public.skills;

create policy skills_select on public.skills
  for select to authenticated
  using (public.is_member(household_id));

create policy skills_insert on public.skills
  for insert to authenticated
  with check (public.has_min_role(household_id, 'parent'));

create policy skills_update on public.skills
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));

create policy skills_delete on public.skills
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ── Point Events ──
-- Contributors and above can award points; everyone can see them
drop policy if exists point_events_all on public.point_events;

create policy point_events_select on public.point_events
  for select to authenticated
  using (public.is_member(household_id));

create policy point_events_insert on public.point_events
  for insert to authenticated
  with check (public.has_min_role(household_id, 'contributor'));

-- No update/delete on point_events (immutable ledger)

-- ── Reward Proposals ──
drop policy if exists reward_proposals_all on public.reward_proposals;

create policy reward_proposals_select on public.reward_proposals
  for select to authenticated
  using (public.is_member(household_id));

create policy reward_proposals_insert on public.reward_proposals
  for insert to authenticated
  with check (public.has_min_role(household_id, 'parent'));

create policy reward_proposals_update on public.reward_proposals
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));

create policy reward_proposals_delete on public.reward_proposals
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ── Reward Votes ──
-- All household members (incl. viewers) can see votes; kids vote via parent/contributor
drop policy if exists reward_votes_all on public.reward_votes;

create policy reward_votes_select on public.reward_votes
  for select to authenticated using (
    exists (
      select 1 from public.reward_proposals p
      where p.id = proposal_id and public.is_member(p.household_id)
    )
  );

create policy reward_votes_insert on public.reward_votes
  for insert to authenticated with check (
    exists (
      select 1 from public.reward_proposals p
      where p.id = proposal_id and public.has_min_role(p.household_id, 'parent')
    )
  );

-- ── Memories ──
drop policy if exists memories_all on public.memories;

create policy memories_select on public.memories
  for select to authenticated
  using (public.is_member(household_id));

create policy memories_insert on public.memories
  for insert to authenticated
  with check (public.has_min_role(household_id, 'contributor'));

create policy memories_update on public.memories
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));

create policy memories_delete on public.memories
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ── Icon Generations ──
drop policy if exists icon_generations_all on public.icon_generations;

create policy icon_generations_select on public.icon_generations
  for select to authenticated
  using (public.is_member(household_id));

create policy icon_generations_insert on public.icon_generations
  for insert to authenticated
  with check (public.has_min_role(household_id, 'parent'));

-- ── Household Invites ──
create policy invites_select on public.household_invites
  for select to authenticated
  using (household_id in (
    select household_id from public.household_members where user_id = auth.uid()
  ));

create policy invites_insert on public.household_invites
  for insert to authenticated
  with check (public.has_min_role(household_id, 'admin'));

create policy invites_update on public.household_invites
  for update to authenticated
  using (public.has_min_role(household_id, 'admin'))
  with check (public.has_min_role(household_id, 'admin'));

-- ── Kid Shares ──
create policy kid_shares_select on public.kid_shares
  for select to authenticated
  using (public.is_member(household_id));

create policy kid_shares_insert on public.kid_shares
  for insert to authenticated
  with check (public.has_min_role(household_id, 'admin'));

create policy kid_shares_delete on public.kid_shares
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. Invite helper functions (for edge functions)
-- ═════════════════════════════════════════════════════════════════════════════

-- Generate a unique invite code
create or replace function public.generate_invite_code()
returns text as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$ language sql;

-- Accept an invite: adds the calling user as a member of the household
create or replace function public.accept_invite(invite_code text)
returns jsonb as $$
declare
  inv public.household_invites;
begin
  -- Find the invite
  select * into inv
  from public.household_invites
  where code = upper(trim(invite_code))
    and used_by is null
    and expires_at > now()
  for update;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or expired invite code');
  end if;

  -- Prevent duplicate membership
  if exists (select 1 from public.household_members
              where household_id = inv.household_id and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'You are already a member of this household');
  end if;

  -- Add the caller as a member with the invite's role
  insert into public.household_members(household_id, user_id, role)
  values (inv.household_id, auth.uid(), inv.role);

  -- Mark invite used
  update public.household_invites
  set used_by = auth.uid(), used_at = now()
  where id = inv.id;

  return jsonb_build_object('ok', true, 'household_id', inv.household_id);
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. Update household members select policy to be role-agnostic
--    (already allows select if user_id = auth.uid() or member)
--    No change needed — but add explicit update policy for member management
-- ═════════════════════════════════════════════════════════════════════════════

-- Members can UPDATE their own row (e.g. leave the household)
create policy members_update on public.household_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
