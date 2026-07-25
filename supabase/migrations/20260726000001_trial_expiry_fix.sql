-- ============================================================================
-- Trial expiry fix: auto-set trial_ends_at on insert + auto-transition expired
-- trials in the billing guard.
--
-- 1. Sets trial_ends_at = now() + 14 days on INSERT when not specified.
-- 2. Enhances guard_household_billing_columns to auto-transition
--    trialing → free (or → active for founding testers) when trial_ends_at
--    is in the past. This runs on every client UPDATE, so the trial expires
--    server-side without needing a cron job, and the billing guard still
--    blocks all other client-initiated subscription_status changes.
-- ============================================================================

-- ── 1. Auto-set trial_ends_at on household creation ───────────────────────
create or replace function public.set_trial_ends_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_ends_at is null then
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists households_set_trial_ends on public.households;
create trigger households_set_trial_ends
  before insert on public.households
  for each row execute function public.set_trial_ends_at();

-- ── 2. Enhanced billing guard with trial-expiry auto-transition ───────────
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
    new.memory_retention_days        := old.memory_retention_days;
    new.memory_cycle_started_at      := old.memory_cycle_started_at;
    new.email_memory_expiry_sent_at  := old.email_memory_expiry_sent_at;
  end if;
  return new;
end;
$$;
