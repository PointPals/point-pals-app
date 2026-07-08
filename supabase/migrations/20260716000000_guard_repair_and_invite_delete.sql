-- ============================================================================
-- 1. Repair the household billing/retention guard.
--
--    20260715000000 (merged from an earlier branch) redefined
--    guard_household_billing_columns referencing memory_cycle_reminded_at —
--    a column from the removed first-cut retention migration that doesn't
--    exist in the current schema. On databases without that column, EVERY
--    client update to households fails at runtime ("record new has no field
--    memory_cycle_reminded_at"). It also dropped memory_retention_days and
--    email_memory_expiry_sent_at from the frozen set.
--
--    This re-asserts the correct guard for the final schema: billing +
--    email stamps + the retention cycle machinery. memory_retention_enabled
--    stays client-editable (the Settings toggle).
-- ============================================================================

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
    new.memory_retention_days       := old.memory_retention_days;
    new.memory_cycle_started_at     := old.memory_cycle_started_at;
    new.email_memory_expiry_sent_at := old.email_memory_expiry_sent_at;
  end if;
  return new;
end;
$$;

-- ── Leftovers from the removed first-cut retention migration (no-ops on
--    databases that never ran it): its cron job targets a deleted function,
--    and its columns were replaced by memory_retention_enabled /
--    email_memory_expiry_sent_at. ────────────────────────────────────────────
DO $$ BEGIN PERFORM cron.unschedule('purge-memories'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

alter table public.households
  drop column if exists memory_cycle_reminded_at,
  drop column if exists memory_auto_purge;

-- ============================================================================
-- 2. Let admins revoke invites.
--
--    household_invites has select/insert/update policies but no DELETE
--    policy (and no delete grant), so the Settings "revoke invite" button
--    silently deleted 0 rows and the invite reappeared on reload.
-- ============================================================================

grant delete on public.household_invites to authenticated;

drop policy if exists invites_delete on public.household_invites;
create policy invites_delete on public.household_invites
  for delete to authenticated
  using (public.has_min_role(household_id, 'admin'));
