-- Catch-up: add the jar / points columns that are missing on schemas where the
-- earlier jar migrations (individual_jar_targets, add_missing_jar_columns,
-- rewards overhaul) were never applied. Fully idempotent — ADD COLUMN IF NOT
-- EXISTS everywhere, and the points columns are seeded from the legacy `points`
-- column only when freshly created, so existing totals are never zeroed.

-- ── households ──────────────────────────────────────────────────────────────
alter table public.households
  add column if not exists split_jars_enabled boolean not null default false;
alter table public.households
  add column if not exists split_ratio integer not null default 50;
alter table public.households
  add column if not exists shared_jar_enabled boolean not null default true;
alter table public.households
  add column if not exists active_reward_name text;
alter table public.households
  add column if not exists active_reward_target integer default 100;

-- split_mode defaults to "match" (1:1 — every point fills both the child's jar
-- and the family jar). Added in a guard so the CHECK is only attached once.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'households' and column_name = 'split_mode'
  ) then
    alter table public.households
      add column split_mode text not null default 'match'
        check (split_mode in ('percentage', 'match'));
  end if;
end $$;

-- ── kids ────────────────────────────────────────────────────────────────────
alter table public.kids
  add column if not exists personal_pool integer not null default 0;
alter table public.kids
  add column if not exists personal_target integer not null default 0;
alter table public.kids
  add column if not exists personal_reward text default null;

-- current_points / all_time_points: seed from the legacy `points` column when
-- newly added so each kid keeps their existing total (a bare default of 0 would
-- otherwise wipe visible points, since the app reads current_points first).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kids' and column_name = 'current_points'
  ) then
    alter table public.kids add column current_points integer not null default 0;
    update public.kids set current_points = points;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kids' and column_name = 'all_time_points'
  ) then
    alter table public.kids add column all_time_points integer not null default 0;
    update public.kids set all_time_points = points;
  end if;
end $$;
