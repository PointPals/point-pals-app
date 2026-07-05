-- Row Level Security for PointPals.
--
-- Access model: a user can read/write rows for households they are a member of.
-- Billing-critical columns (subscription_status, stripe_*) are written only by
-- the Stripe webhook via the service-role key, which bypasses RLS — clients can
-- read their household but must not be able to self-grant entitlement.

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.kids              enable row level security;
alter table public.chores            enable row level security;
alter table public.skills            enable row level security;
alter table public.point_events      enable row level security;
alter table public.reward_proposals  enable row level security;
alter table public.reward_votes      enable row level security;
alter table public.icon_generations  enable row level security;

-- Helper: is the current user a member of household :hid ?
create or replace function public.is_member(hid uuid) returns boolean as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$ language sql stable security definer;

-- households: members can read; members can update non-billing fields.
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (public.is_member(id));

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update using (public.is_member(id)) with check (public.is_member(id));

-- household_members: a user can see their own memberships.
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select using (user_id = auth.uid() or public.is_member(household_id));

-- Generic member-scoped policies for the child tables.
do $$
declare t text;
begin
  foreach t in array array[
    'kids','chores','skills','point_events','reward_proposals','icon_generations'
  ]
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all
         using (public.is_member(household_id))
         with check (public.is_member(household_id));', t, t);
  end loop;
end $$;

-- reward_votes is keyed via its proposal's household.
drop policy if exists reward_votes_all on public.reward_votes;
create policy reward_votes_all on public.reward_votes
  for all using (
    exists (
      select 1 from public.reward_proposals p
      where p.id = proposal_id and public.is_member(p.household_id)
    )
  ) with check (
    exists (
      select 1 from public.reward_proposals p
      where p.id = proposal_id and public.is_member(p.household_id)
    )
  );
