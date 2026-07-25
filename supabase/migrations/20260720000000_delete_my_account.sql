-- =============================================================================
-- Account deletion RPC – for in-app "Delete my account & all data" button
-- =============================================================================
-- Required by Apple App Store Guideline 5.1.1(v): users must be able to
-- delete their account from within the app.
--
── The flow:
--   1. Client prompts supabase.rpc('delete_my_account')
--   2. RPC verifies the caller owns/deletes their household_members rows
--   3. Deletes the household (on delete cascade clears kids, chores,
--      point_events, skills, reward_proposals, reward_votes,
--      icon_generations, memories, household_members)
--   4. Calls auth.delete_user() to remove the auth user
--   5. Client signs out on success
-- =============================================================================

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
begin
  -- Sanity: must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Sanity: must belong to at least one household
  if array_length(_households, 1) is null then
    raise exception 'No household found for this user';
  end if;

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
