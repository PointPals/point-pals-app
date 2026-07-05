
create extension if not exists "pgcrypto";

-- HOUSEHOLDS
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
grant select, insert, update, delete on public.households to authenticated;
grant all on public.households to service_role;

-- MEMBERS
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'parent' check (role in ('parent','admin')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);
grant select, insert, update, delete on public.household_members to authenticated;
grant all on public.household_members to service_role;

-- KIDS
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
grant select, insert, update, delete on public.kids to authenticated;
grant all on public.kids to service_role;

-- CHORES
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
grant select, insert, update, delete on public.chores to authenticated;
grant all on public.chores to service_role;

-- SKILLS
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
grant select, insert, update, delete on public.skills to authenticated;
grant all on public.skills to service_role;

-- POINT EVENTS
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
grant select, insert, update, delete on public.point_events to authenticated;
grant all on public.point_events to service_role;

-- REWARD PROPOSALS
create table if not exists public.reward_proposals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  proposed_by    uuid references public.kids(id) on delete set null,
  name           text not null,
  created_at     timestamptz not null default now()
);
grant select, insert, update, delete on public.reward_proposals to authenticated;
grant all on public.reward_proposals to service_role;

-- REWARD VOTES
create table if not exists public.reward_votes (
  proposal_id uuid not null references public.reward_proposals(id) on delete cascade,
  kid_id      uuid not null references public.kids(id) on delete cascade,
  primary key (proposal_id, kid_id)
);
grant select, insert, update, delete on public.reward_votes to authenticated;
grant all on public.reward_votes to service_role;

-- ICON GENERATIONS
create table if not exists public.icon_generations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  prompt       text,
  storage_path text,
  created_at   timestamptz not null default now()
);
create index if not exists icon_generations_household_month_idx
  on public.icon_generations(household_id, created_at);
grant select, insert, update, delete on public.icon_generations to authenticated;
grant all on public.icon_generations to service_role;

-- MEMORY POSTS
create table if not exists public.memory_posts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  caption      text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists memory_posts_household_idx
  on public.memory_posts(household_id, created_at desc);
grant select, insert, update, delete on public.memory_posts to authenticated;
grant all on public.memory_posts to service_role;

create table if not exists public.memory_post_kids (
  post_id uuid not null references public.memory_posts(id) on delete cascade,
  kid_id  uuid not null references public.kids(id) on delete cascade,
  primary key (post_id, kid_id)
);
grant select, insert, update, delete on public.memory_post_kids to authenticated;
grant all on public.memory_post_kids to service_role;

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql set search_path = public;

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.kids              enable row level security;
alter table public.chores            enable row level security;
alter table public.skills            enable row level security;
alter table public.point_events      enable row level security;
alter table public.reward_proposals  enable row level security;
alter table public.reward_votes      enable row level security;
alter table public.icon_generations  enable row level security;
alter table public.memory_posts      enable row level security;
alter table public.memory_post_kids  enable row level security;

create or replace function public.is_member(hid uuid) returns boolean as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated using (public.is_member(id));

drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert to authenticated with check (true);

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select to authenticated using (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists members_insert on public.household_members;
create policy members_insert on public.household_members
  for insert to authenticated with check (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists members_delete on public.household_members;
create policy members_delete on public.household_members
  for delete to authenticated using (public.is_member(household_id));

do $$
declare t text;
begin
  foreach t in array array[
    'kids','chores','skills','point_events','reward_proposals','icon_generations','memory_posts'
  ]
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all to authenticated
         using (public.is_member(household_id))
         with check (public.is_member(household_id));', t, t);
  end loop;
end $$;

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

drop policy if exists memory_post_kids_all on public.memory_post_kids;
create policy memory_post_kids_all on public.memory_post_kids
  for all to authenticated using (
    exists (
      select 1 from public.memory_posts p
      where p.id = post_id and public.is_member(p.household_id)
    )
  ) with check (
    exists (
      select 1 from public.memory_posts p
      where p.id = post_id and public.is_member(p.household_id)
    )
  );
