-- ============================================================================
-- Memory feed retention — fixed 90-day "seasons".
--
-- Each household has a cycle anchor (memory_cycle_started_at). When the cycle
-- ends (anchor + memory_retention_days), the whole memory feed is purged and
-- the anchor rolls forward. A reminder email goes out a few days before each
-- wipe (see notify-memory-expiry), and the purge itself never runs for a
-- household that wasn't warned (see purge-expired-memories).
--
-- Data-minimisation: this is also the NZ Privacy Act 2020 (IPP 9) retention
-- control — memories aren't kept longer than the season they belong to.
-- ============================================================================

alter table public.households
  add column if not exists memory_retention_enabled boolean not null default true,
  add column if not exists memory_retention_days int not null default 90
    check (memory_retention_days between 30 and 365),
  add column if not exists memory_cycle_started_at timestamptz not null default now(),
  add column if not exists memory_cycle_ends_at timestamptz,
  add column if not exists email_memory_expiry_sent_at timestamptz;

-- Derived: cycle end = anchor + retention days. Kept as a plain column
-- (timestamptz + interval is not immutable, so no generated column) and
-- recomputed by trigger whenever the row is written.
update public.households
   set memory_cycle_ends_at = memory_cycle_started_at + make_interval(days => memory_retention_days)
 where memory_cycle_ends_at is null;

create or replace function public.sync_memory_cycle_ends_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.memory_cycle_ends_at :=
    new.memory_cycle_started_at + make_interval(days => new.memory_retention_days);
  return new;
end;
$$;
revoke execute on function public.sync_memory_cycle_ends_at() from public, anon, authenticated;

-- BEFORE triggers fire alphabetically: households_billing_guard runs first and
-- freezes the guarded inputs, then this recomputes the derived end date.
drop trigger if exists households_memory_cycle_sync on public.households;
create trigger households_memory_cycle_sync
  before insert or update on public.households
  for each row execute function public.sync_memory_cycle_ends_at();

-- Guard the cycle machinery from client writes. memory_retention_enabled stays
-- client-editable (the opt-out toggle in Settings); the anchor, day count and
-- idempotency stamp are written only by the cron edge functions.
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

-- Cron jobs query by cycle end across all households.
create index if not exists households_memory_cycle_ends_idx
  on public.households (memory_cycle_ends_at)
  where memory_retention_enabled;
