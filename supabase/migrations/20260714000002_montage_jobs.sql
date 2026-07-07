-- ============================================================================
-- Season montage exports.
--
-- montage_jobs tracks async MP4 renders (Shotstack) of a household's memory
-- season. Rows are created and updated ONLY by the render-montage edge
-- function (service role); members can read their household's jobs to poll
-- status. Finished videos land in the private "exports" bucket under
-- {household_id}/… and are delivered via short-lived signed URLs.
-- ============================================================================

create table if not exists public.montage_jobs (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households(id) on delete cascade,
  requested_by       uuid references auth.users(id) on delete set null,
  status             text not null default 'queued'
                       check (status in ('queued','rendering','done','failed')),
  provider           text not null default 'shotstack',
  provider_render_id text,
  output_path        text,
  error              text,
  -- Which season this montage belongs to (the cycle end at request time) —
  -- used for the one-free-montage-per-season limit.
  cycle_ends_at      timestamptz,
  post_count         int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists montage_jobs_household_idx
  on public.montage_jobs (household_id, created_at desc);

alter table public.montage_jobs enable row level security;

grant select on public.montage_jobs to authenticated;
grant all on public.montage_jobs to service_role;

-- Members can watch their household's jobs; all writes go through the
-- service-role edge function (no insert/update/delete policies).
create policy montage_jobs_select on public.montage_jobs
  for select to authenticated using (public.is_member(household_id));

drop trigger if exists montage_jobs_touch on public.montage_jobs;
create trigger montage_jobs_touch
  before update on public.montage_jobs
  for each row execute function public.touch_updated_at();

-- Private exports bucket: rendered montages, member-readable via signed URLs
-- minted by render-montage. Path prefix = household id, same as memories.
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

drop policy if exists exports_select on storage.objects;
create policy exports_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exports'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
