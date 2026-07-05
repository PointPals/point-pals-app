-- Billing-column write guard (§3b).
--
-- The households_update RLS policy (0002_rls.sql) lets any household member
-- update their household row — which is correct for name / reward_target, but
-- must NOT let a client (anon/authenticated key) grant itself entitlement by
-- writing subscription_status / stripe_customer_id / stripe_subscription_id /
-- current_period_end. Those are set only by the Stripe webhook using the
-- service-role key.
--
-- Rather than rely on column-level grants (fiddly with RLS), this trigger
-- silently preserves the billing columns on any UPDATE unless the caller is the
-- service role (the webhook). Postgres runs BEFORE-UPDATE triggers even for
-- rows passing RLS, and the service role bypasses RLS entirely, so this is a
-- reliable last line of defence.

create or replace function public.guard_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.role() is 'service_role' for the service key, 'authenticated'/'anon'
  -- for clients. Allow the webhook (service_role) to write billing fields;
  -- for everyone else, freeze them to their prior values.
  if coalesce(auth.role(), '') <> 'service_role' then
    new.subscription_status    := old.subscription_status;
    new.billing_model          := old.billing_model;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.current_period_end     := old.current_period_end;
    new.trial_ends_at          := old.trial_ends_at;
  end if;
  return new;
end;
$$;

drop trigger if exists households_billing_guard on public.households;
create trigger households_billing_guard
  before update on public.households
  for each row execute function public.guard_household_billing_columns();
