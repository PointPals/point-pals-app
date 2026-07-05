-- =============================================================================
-- PointPals — Full schema + RLS + Storage
-- Paste the whole file into the Supabase SQL Editor and run once.
-- =============================================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Households (the billing + entitlement unit)
create table if not exists public.households (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default 'My Family',
  shared_pool         integer not null default 0 check (shared_pool >= 0),
  reward_target       integer not null default 100 check (reward_target > 0),
  onboarded           boolean not null default false,
  subscription_status text not null default 'trialing'
                      check (subscription_status in ('trialing','active','past_due','canceled','free')),
  billing_model       text not null default 'subscription'
                      check (billing_model in ('subscription','one_off','freemium')),
  currency            text not null default 'NZD',
  trial_ends_at       timestamptz,
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Membership: which auth users are parents/admins of a household
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'parent' check (role in ('parent','admin')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Kids
create table if not exists public.kids (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  color        text not null default 'sky',
  avatar_key   text,
  points       integer not null default 0 check (points >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists kids_household_idx on public.kids(household_id);

-- Chores
create table if not exists public.chores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  icon         text not null,
  color        text not null default 'sky',
  points       integer not null default 1,
  recurrence   text not null default 'none' check (recurrence in ('none','daily','weekly')),
  created_at   timestamptz not null default now()
);
create index if not exists chores_household_idx on public.chores(household_id);

-- Skills (positive behaviours / needs-work behaviours)
create table if not exists public.skills (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  icon         text not null,
  color        text not null default 'sky',
  points       integer not null default 1,
  is_positive  boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists skills_household_idx on public.skills(household_id);

-- Point events (award ledger)
create table if not exists public.point_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kid_id       uuid not null references public.kids(id) on delete cascade,
  item_name    text not null,
  item_icon    text not null,
  points       integer not null,
  batch_id     text,
  created_at   timestamptz not null default now()
);
create index if not exists point_events_household_idx on public.point_events(household_id, created_at desc);
create index if not exists point_events_kid_idx on public.point_events(kid_id, created_at desc);

-- Reward proposals (kids suggest what to spend the shared pool on)
create table if not exists public.reward_proposals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  proposed_by    uuid references public.kids(id) on delete set null,
  name           text not null,
  created_at     timestamptz not null default now()
);

-- Reward votes (kids vote on proposals)
create table if not exists public.reward_votes (
  proposal_id uuid not null references public.reward_proposals(id) on delete cascade,
  kid_id      uuid not null references public.kids(id) on delete cascade,
  primary key (proposal_id, kid_id)
);

-- Icon-generations ledger (rate-limiting for AI icon generation)
create table if not exists public.icon_generations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  prompt       text,
  storage_path text,
  created_at   timestamptz not null default now()
);
create index if not exists icon_generations_household_month_idx
  on public.icon_generations(household_id, created_at);

-- Memories (photo memory wall)
-- Uses kid_ids uuid[] array to match the client-side code (memories.ts lib).
create table if not exists public.memories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  caption      text,
  kid_ids      uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists memories_household_idx
  on public.memories(household_id, created_at desc);

-- Grant table access
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- updated_at auto-update for households
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists households_touch on public.households;
create trigger households_touch
  before update on public.households
  for each row execute function public.touch_updated_at();

-- Auto-add creator as admin member when a household is created
create or replace function public.households_add_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.household_members(household_id, user_id, role)
    values (new.id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists households_add_creator_trg on public.households;
create trigger households_add_creator_trg
  after insert on public.households
  for each row execute function public.households_add_creator();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.kids              enable row level security;
alter table public.chores            enable row level security;
alter table public.skills            enable row level security;
alter table public.point_events      enable row level security;
alter table public.reward_proposals  enable row level security;
alter table public.reward_votes      enable row level security;
alter table public.icon_generations  enable row level security;
alter table public.memories          enable row level security;

-- Helper: is the current user a member of household :hid ?
create or replace function public.is_member(hid uuid) returns boolean as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- Lock down is_member so only RLS policies can use it (not client queries)
revoke execute on function public.is_member(uuid) from public, anon, authenticated;

-- Lock down touch_updated_at (trigger-only)
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Lock down households_add_creator (trigger-only)
revoke execute on function public.households_add_creator() from public, anon, authenticated;

-- Households policies
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated using (public.is_member(id));

drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert to authenticated with check (auth.uid() is not null);

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

-- Household members policies
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select to authenticated using (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists members_insert on public.household_members;
create policy members_insert on public.household_members
  for insert to authenticated with check (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists members_delete on public.household_members;
create policy members_delete on public.household_members
  for delete to authenticated using (public.is_member(household_id));

-- Generic member-scoped policies for child tables
do $$
declare t text;
begin
  foreach t in array array[
    'kids','chores','skills','point_events','reward_proposals','icon_generations','memories'
  ]
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all to authenticated
         using (public.is_member(household_id))
         with check (public.is_member(household_id));', t, t);
  end loop;
end $$;

-- Reward votes (scoped via proposal's household)
drop policy if exists reward_votes_all on public.reward_votes;
create policy reward_votes_all on public.reward_votes
  for all to authenticated using (
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

-- (memories RLS is handled by the generic loop above)

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Memories bucket (for photo memory wall uploads)
insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do nothing;

-- Assets bucket (for chore/skill PNG icons)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Storage RLS: memories folder structure = household_id/filename
-- The folder name IS the household_id, so we extract it from the path.
drop policy if exists memories_select on storage.objects;
create policy memories_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists memories_insert on storage.objects;
create policy memories_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists memories_delete on storage.objects;
create policy memories_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

-- Assets bucket: anyone can read (public icons)
drop policy if exists assets_select on storage.objects;
create policy assets_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'assets');

-- Only authenticated users can upload to assets
drop policy if exists assets_insert on storage.objects;
create policy assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets');
