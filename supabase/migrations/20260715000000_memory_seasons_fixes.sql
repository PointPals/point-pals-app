-- ============================================================================
-- Memory seasons — hardening + montage infrastructure.
--
-- Follow-ups to 20260714000001_memory_retention.sql:
--
-- 1. Freeze the cycle machinery from client writes. The purge function's
--    "never delete without a warning" gate reads memory_cycle_reminded_at;
--    if a household member could write that column (or shift the anchor),
--    they could trigger a purge that skips the warning. Same pattern as the
--    billing columns: reset to OLD unless service_role.
--    (memory_auto_purge stays client-editable — it's the Settings toggle.)
--
-- 2. montage_jobs table + private "exports" bucket for the render-montage
--    edge function. Rows are written ONLY by the service-role function;
--    members can read their household's jobs to poll status. Finished MP4s
--    land under exports/{household_id}/… and are served by signed URL.
--
-- 3. Drop the unused memory_montage_jobs jsonb column and the
--    montage_exported_at column: jobs live in montage_jobs now, and exported
--    montages persist in the exports bucket, so originals always purge with
--    their season (keeping them would defeat the retention promise).
-- ============================================================================

-- ── 1. Guard the cycle columns (extends the billing guard) ─────────────────
create or replace function public.guard_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.subscription_status    := old.subscription_status;
    new.billing_model          := old.billing_model;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.current_period_end     := old.current_period_end;
    new.trial_ends_at          := old.trial_ends_at;
    new.email_trial_welcome_sent_at := old.email_trial_welcome_sent_at;
    new.email_tip_day3_sent_at      := old.email_tip_day3_sent_at;
    new.email_tip_day7_sent_at      := old.email_tip_day7_sent_at;
    new.email_trial_ending_sent_at  := old.email_trial_ending_sent_at;
    new.email_tip_month1_sent_at    := old.email_tip_month1_sent_at;
    new.email_payment_confirmed_at  := old.email_payment_confirmed_at;
    new.email_cancelled_sent_at     := old.email_cancelled_sent_at;
    new.memory_cycle_started_at     := old.memory_cycle_started_at;
    new.memory_cycle_reminded_at    := old.memory_cycle_reminded_at;
  end if;
  return new;
end;
$$;

-- ── 3. Drop dead columns from the first cut ────────────────────────────────
alter table public.households   drop column if exists memory_montage_jobs;
alter table public.memory_posts drop column if exists montage_exported_at;

-- ── 2. Montage jobs ────────────────────────────────────────────────────────
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
  -- Which season this montage belongs to (the computed cycle end at request
  -- time) — used for the one-free-montage-per-season limit.
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
drop policy if exists montage_jobs_select on public.montage_jobs;
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
