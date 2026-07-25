-- =============================================================================
-- Check deleted accounts on household insert — deny free trial
-- =============================================================================
-- When a user who previously deleted their account signs up again, this
-- trigger intercepts the household insert and sets subscription_status = 'free'
-- (no trial) so they go straight to the paywall.
--
-- The trigger fires for both email sign-up and Google OAuth paths because
-- both end up inserting a row into households.

create or replace function public.check_deleted_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _email text;
  _found boolean;
begin
  -- Get the current user's email from the JWT
  _email := auth.jwt() ->> 'email';
  if _email is null then
    -- Shouldn't happen for an authenticated user, but be safe
    return NEW;
  end if;

  -- Check if this email was previously deleted
  select true into _found
  from public.deleted_accounts
  where email = _email
    and restored_at is null
  limit 1;

  if _found then
    -- This user already deleted their account — no second trial
    NEW.subscription_status := 'free';
    NEW.trial_ends_at := null;
  end if;

  return NEW;
end;
$$;

create or replace trigger check_deleted_on_signup_trigger
  before insert on public.households
  for each row
  execute function public.check_deleted_on_signup();
