-- Founding tester program (§9)
--
-- Lets new sign-ups opt in as founding members / beta testers.  Their trial
-- auto-activates when it expires (no Stripe coupon needed), keeping full
-- access for as long as the program runs.
--
-- Migration safety:
--   • DROP + re-adds the CHECK constraint on subscription_status to include
--     the new "founding_tester" sentinel (the original constraint may have
--     been named differently in prior migrations, so we drop by raw
--     definition rather than by name).
--   • Existing rows default founding_tester → false (behaviour unchanged).

-- 1. Add the column (safe additive change).
alter table public.households
  add column if not exists founding_tester boolean not null default false;

-- 2. Widen the subscription_status CHECK to include "founding_tester" so that
--    the server-side trial-expiry handler can set it without violating the
--    constraint.
alter table public.households
  drop constraint if exists households_subscription_status_check;

alter table public.households
  add constraint households_subscription_status_check
    check (subscription_status in (
      'trialing','active','past_due','canceled','free','founding_tester'
    ));

-- 3. Grant (idempotent — safe even if already granted).
grant select, insert, update, delete on public.households to authenticated;
grant all on public.households to service_role;
