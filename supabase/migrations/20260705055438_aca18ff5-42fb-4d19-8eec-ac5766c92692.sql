-- 1. Lifecycle email tracking columns on households
alter table public.households
  add column if not exists email_trial_welcome_sent_at timestamptz,
  add column if not exists email_tip_day3_sent_at      timestamptz,
  add column if not exists email_tip_day7_sent_at      timestamptz,
  add column if not exists email_trial_ending_sent_at  timestamptz,
  add column if not exists email_tip_month1_sent_at    timestamptz,
  add column if not exists email_payment_confirmed_at  timestamptz,
  add column if not exists email_cancelled_sent_at     timestamptz;

-- Let the webhook write those email_* columns too (billing guard freezes them otherwise).
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
  end if;
  return new;
end;
$$;

-- 2. Support messages (contact form)
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

grant select, insert on public.support_messages to authenticated;
grant insert on public.support_messages to anon;
grant all on public.support_messages to service_role;

alter table public.support_messages enable row level security;

create policy "anyone can submit a support message"
  on public.support_messages for insert
  to anon, authenticated
  with check (true);

create policy "authors can read their own support messages"
  on public.support_messages for select
  to authenticated
  using (user_id = auth.uid());

-- 3. Extensions needed for pg_cron scheduling of the email hook
create extension if not exists pg_cron;
create extension if not exists pg_net;