-- =============================================================================
-- Update delete_my_account RPC — record email for re-registration block
-- =============================================================================
-- Inserts the user's email into public.deleted_accounts BEFORE deleting the
-- auth user, so sign-up check functions can deny a second free trial.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _households uuid[] := array(
    select household_id
    from public.household_members
    where user_id = auth.uid()
  );
  _hid uuid;
  _email text;
  _had_trial boolean;
begin
  -- Sanity: must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Sanity: must belong to at least one household
  if array_length(_households, 1) is null then
    raise exception 'No household found for this user';
  end if;

  -- Capture email from JWT before deleting the user
  _email := auth.jwt() ->> 'email';
  if _email is null then
    raise exception 'Could not determine email from session';
  end if;

  -- Check if any of this user's households had an active/trialing subscription
  select bool_or(subscription_status in ('trialing', 'active', 'past_due'))
  into _had_trial
  from public.households
  where id = any(_households);

  -- Record in deleted_accounts BEFORE destroying the household data
  insert into public.deleted_accounts (email, household_id, had_trial)
  values (_email, _households[1], coalesce(_had_trial, false));

  -- 1. Delete storage objects for each household (memories bucket).
  foreach _hid in array _households loop
    delete from storage.objects
    where bucket_id in ('memories', 'assets')
      and (storage.foldername(name))[1]::uuid = _hid;
  end loop;

  -- 2. Delete households (cascade removes all child rows).
  delete from public.households
  where id = any(_households);

  -- 3. Delete the auth user.
  delete from auth.users where id = auth.uid();
end;
$$;

-- Revoke public/anon EXECUTE, grant only to authenticated callers.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
