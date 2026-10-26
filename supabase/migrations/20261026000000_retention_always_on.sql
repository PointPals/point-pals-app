-- ============================================================================
-- Retention is always on, and covers every bucket that holds family data.
--
-- 1. Memories are kept for one 90-day season for every household — the
--    Settings opt-out is gone. memory_retention_enabled joins the guarded
--    columns so a client can't switch the purge off.
-- 2. Households that had opted out get a fresh season starting now (a full
--    90 days, plus the usual reminder email) rather than an instant wipe.
-- 3. expired_storage_objects(): lets the service-role purge job find old
--    files in buckets that aren't tied to memory_posts rows (montage MP4s,
--    memory ZIP exports, support screenshots). Reading storage.objects is
--    fine; deletion still goes through the Storage API so files are really
--    removed, not just their rows.
-- ============================================================================

-- ── 1. Guard: freeze memory_retention_enabled (otherwise unchanged from
--       20260726000001_trial_expiry_fix.sql) ─────────────────────────────────
create or replace function public.guard_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_expired boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    -- Auto-transition expired trials. Any client write to the row triggers
    -- this, so trials expire server-side without a dedicated cron.
    is_expired := old.subscription_status = 'trialing'
              and old.trial_ends_at is not null
              and old.trial_ends_at < now();

    if is_expired then
      new.subscription_status := case
        when old.founding_tester then 'active'
        else 'free'
      end;
    elsif new.subscription_status <> old.subscription_status then
      -- Client tried to change status directly; block it.
      new.subscription_status := old.subscription_status;
    end if;

    -- Freeze remaining billing + email-stamp + retention columns.
    new.billing_model                := old.billing_model;
    new.stripe_customer_id           := old.stripe_customer_id;
    new.stripe_subscription_id       := old.stripe_subscription_id;
    new.current_period_end           := old.current_period_end;
    new.trial_ends_at                := old.trial_ends_at;
    new.email_trial_welcome_sent_at  := old.email_trial_welcome_sent_at;
    new.email_tip_day3_sent_at       := old.email_tip_day3_sent_at;
    new.email_tip_day7_sent_at       := old.email_tip_day7_sent_at;
    new.email_trial_ending_sent_at   := old.email_trial_ending_sent_at;
    new.email_tip_month1_sent_at     := old.email_tip_month1_sent_at;
    new.email_payment_confirmed_at   := old.email_payment_confirmed_at;
    new.email_cancelled_sent_at      := old.email_cancelled_sent_at;
    new.memory_retention_enabled     := old.memory_retention_enabled;
    new.memory_retention_days        := old.memory_retention_days;
    new.memory_cycle_started_at      := old.memory_cycle_started_at;
    new.email_memory_expiry_sent_at  := old.email_memory_expiry_sent_at;
  end if;
  return new;
end;
$$;

-- ── 2. Switch retention on for households that had opted out ────────────────
-- The guard only lets service_role move these columns, so run the backfill
-- with a service_role claim. One DO block = one transaction, so the claim
-- applies to the update whether or not the runner wraps the file.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  update public.households
     set memory_retention_enabled    = true,
         memory_cycle_started_at     = now(),
         email_memory_expiry_sent_at = null
   where memory_retention_enabled = false;

  perform set_config('request.jwt.claims', '', true);
end $$;

-- ── 3. Old files in buckets without per-row ownership ───────────────────────
create or replace function public.expired_storage_objects(
  p_bucket     text,
  p_older_than interval,
  p_name_like  text default '%',
  p_limit      int  default 1000
)
returns table (name text)
language sql
stable
security definer
set search_path = storage, public
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = p_bucket
     and o.created_at < now() - p_older_than
     and o.name like p_name_like
   order by o.created_at
   limit greatest(1, least(p_limit, 1000));
$$;

revoke execute on function public.expired_storage_objects(text, interval, text, int)
  from public, anon, authenticated;
grant execute on function public.expired_storage_objects(text, interval, text, int)
  to service_role;
