-- PointPals core schema.
--
-- NOTE: committed as source. The Supabase project is not reachable from the
-- build environment, so apply this with `supabase db push` (or the dashboard
-- SQL editor / `supabase migration up`) once connected. The client app state
-- (src/lib/app-store.tsx) is shaped 1:1 onto these tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Households (the billing + entitlement unit)
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default 'My Family',
  shared_pool         integer not null default 0 check (shared_pool >= 0),
  reward_target       integer not null default 100 check (reward_target > 0),
  onboarded           boolean not null default false,

  -- Entitlement layer (§5) — swappable pricing model, so we store status not price.
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

-- Membership: which auth users are parents/admins of a household.
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'parent' check (role in ('parent','admin')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

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

create table if not exists public.point_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kid_id       uuid not null references public.kids(id) on delete cascade,
  item_name    text not null,
  item_icon    text not null,
  points       integer not null,
  batch_id     text,                 -- groups a multi-kid award for undo
  created_at   timestamptz not null default now()
);
create index if not exists point_events_household_idx on public.point_events(household_id, created_at desc);
create index if not exists point_events_kid_idx on public.point_events(kid_id, created_at desc);

create table if not exists public.reward_proposals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  proposed_by    uuid references public.kids(id) on delete set null,
  name           text not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.reward_votes (
  proposal_id uuid not null references public.reward_proposals(id) on delete cascade,
  kid_id      uuid not null references public.kids(id) on delete cascade,
  primary key (proposal_id, kid_id)
);

-- Icon-generation ledger — used to rate-limit the generate-icon edge function
-- per household (§9), so AI generation costs stay predictable.
create table if not exists public.icon_generations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  prompt       text,
  storage_path text,
  created_at   timestamptz not null default now()
);
create index if not exists icon_generations_household_month_idx
  on public.icon_generations(household_id, created_at);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
  for each row execute function public.touch_updated_at();
