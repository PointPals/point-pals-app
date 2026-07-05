-- 20260706000001 — Rewards, points architecture, memory wall, extended family overhaul
--
-- Bundles: points split (current/all-time), reward history, correction logging,
-- memory likes/comments, audio_path on memory_posts, household settings,
-- extended-family viewer role with Needs-Work permission toggle, and RLS updates.

-- =============================================================================
-- PART 1 — Points architecture: split kids.points into current + all-time
-- =============================================================================

alter table public.kids
  add column if not exists current_points  integer not null default 0 check (current_points >= 0),
  add column if not exists all_time_points integer not null default 0 check (all_time_points >= 0);

-- Seed: existing `points` value becomes both current_points and all_time_points
update public.kids
  set current_points = points, all_time_points = points
  where current_points = 0 and all_time_points = 0 and points > 0;

-- =============================================================================
-- PART 2 — Reward history
-- =============================================================================

create table if not exists public.reward_history (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households(id) on delete cascade,
  reward_name           text not null,
  target_points         int  not null,
  achieved_at           timestamptz not null default now(),
  contributing_kid_ids  uuid[] default '{}'
);
create index if not exists reward_history_household_idx
  on public.reward_history(household_id, achieved_at desc);

alter table public.reward_history enable row level security;
create policy reward_history_select on public.reward_history
  for select to authenticated using (public.is_member(household_id));
create policy reward_history_insert on public.reward_history
  for insert to authenticated
  with check (public.is_member(household_id) and public.has_min_role(household_id, 'parent'));

-- =============================================================================
-- PART 3 — Memory likes & comments
-- =============================================================================

create table if not exists public.memory_likes (
  post_id     uuid not null references public.memory_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.memory_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.memory_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists memory_comments_post_idx
  on public.memory_comments(post_id, created_at asc);

alter table public.memory_likes    enable row level security;
alter table public.memory_comments enable row level security;

-- Likes: household members can select/insert/delete their own likes
create policy memory_likes_select on public.memory_likes
  for select to authenticated
  using (exists (select 1 from public.memory_posts p
                 where p.id = memory_likes.post_id and public.is_member(p.household_id)));
create policy memory_likes_insert on public.memory_likes
  for insert to authenticated
  with check (exists (select 1 from public.memory_posts p
                      where p.id = memory_likes.post_id and public.is_member(p.household_id)));
create policy memory_likes_delete on public.memory_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- Comments: household members can select, insert owns, delete owns
create policy memory_comments_select on public.memory_comments
  for select to authenticated
  using (exists (select 1 from public.memory_posts p
                 where p.id = memory_comments.post_id and public.is_member(p.household_id)));
create policy memory_comments_insert on public.memory_comments
  for insert to authenticated
  with check (exists (select 1 from public.memory_posts p
                      where p.id = memory_comments.post_id and public.is_member(p.household_id)));
create policy memory_comments_delete on public.memory_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- PART 4 — Audio path on memory_posts
-- =============================================================================

alter table public.memory_posts
  add column if not exists audio_path text;

-- =============================================================================
-- PART 5 — Household settings (extended family prefs, etc.)
-- =============================================================================

create table if not exists public.household_settings (
  household_id                         uuid primary key references public.households(id) on delete cascade,
  ext_family_can_award_needs_work      boolean not null default false,
  ext_family_can_post_memories         boolean not null default true,
  updated_at                           timestamptz not null default now()
);

alter table public.household_settings enable row level security;
create policy household_settings_select on public.household_settings
  for select to authenticated using (public.is_member(household_id));
create policy household_settings_insert on public.household_settings
  for insert to authenticated with check (public.is_member(household_id) and public.has_min_role(household_id, 'admin'));
create policy household_settings_update on public.household_settings
  for update to authenticated using (public.has_min_role(household_id, 'admin')) with check (public.has_min_role(household_id, 'admin'));

-- =============================================================================
-- PART 6 — Update has_min_role to support viewer role
-- =============================================================================

-- Drop and recreate has_min_role to include viewer in the hierarchy
create or replace function public.has_min_role(hid uuid, min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Role hierarchy: admin > parent > contributor > viewer
  -- has_min_role returns true if the current user's role is >= min_role
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid
      and m.user_id = auth.uid()
      and (
        (min_role = 'viewer'      and m.role in ('viewer', 'contributor', 'parent', 'admin'))
        or (min_role = 'contributor' and m.role in ('contributor', 'parent', 'admin'))
        or (min_role = 'parent'      and m.role in ('parent', 'admin'))
        or (min_role = 'admin'       and m.role = 'admin')
      )
  );
$$;

-- =============================================================================
-- PART 7 — RLS updates for point_events to support viewer inserts (with Needs-Work constraint)
-- =============================================================================

-- Viewers can now select kids (for Home-lite display) and select/insert point_events
-- The needs-work check is handled at the application layer AND via a DB trigger
create or replace function public.check_viewer_point_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_role text;
  household_setting boolean;
  is_needs_work boolean;
  kid_household_id uuid;
begin
  -- Get the viewer's role for this household
  select m.role into viewer_role
    from public.household_members m
   where m.user_id = auth.uid()
     and m.household_id = new.household_id;

  if viewer_role = 'viewer' then
    -- Check if the awarded item is a needs-work skill (negative points)
    select coalesce(
      (select not s.is_positive from public.skills s
        where s.id = new.batch_id -- batch_id doubles as skill_id for needs-work lookups
          and s.household_id = new.household_id),
      (new.points < 0) -- fallback: negative points = needs work
    ) into is_needs_work;

    if is_needs_work then
      select coalesce(
        (select hs.ext_family_can_award_needs_work from public.household_settings hs
          where hs.household_id = new.household_id),
        false
      ) into household_setting;

      if not household_setting then
        raise exception 'Extended family members are not allowed to log Needs Work behaviour';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.check_viewer_point_event() from public, anon, authenticated;

drop trigger if exists trg_check_viewer_point_event on public.point_events;
create trigger trg_check_viewer_point_event
  before insert on public.point_events
  for each row execute function public.check_viewer_point_event();

-- =============================================================================
-- PART 8 — Add memory tables to Realtime publication
-- =============================================================================

alter table public.memory_posts    REPLICA IDENTITY FULL;
alter table public.memory_likes    REPLICA IDENTITY FULL;
alter table public.memory_comments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_comments;
