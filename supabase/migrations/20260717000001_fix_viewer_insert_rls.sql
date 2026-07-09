-- =============================================================================
-- G3 — Relax point_events INSERT for viewers
-- =============================================================================
--
-- Problem:
--   The extended-family migration (20260705000001) created
--   `point_events_insert` with `has_min_role(household_id, 'contributor')`,
--   which blocks viewers entirely — the `check_viewer_point_event` trigger
--   never fires.
--
--   Worse: if it DID fire for a viewer inserting a *positive* award, the
--   trigger would silently allow it because its `is_needs_work` check only
--   gates the household-setting validation; positive awards fall through to
--   `return new` unhindered.
--
-- Fix:
--   1. Drop the old `point_events_insert` policy and re-create it with just
--      `is_member(household_id)` — let the trigger do enforcement.
--   2. Fix the trigger to explicitly REJECT non-needs-work inserts from
--      viewers, not just check the household setting for needs-work.
--   3. Use `new.points < 0` directly instead of the unreliable `batch_id`
--      skill-lookup fallback (client batch IDs are UUIDs, not skill IDs).
-- =============================================================================

-- 1. Relax INSERT policy — any household member can insert; the trigger
--    handles the viewer needs-work restriction server-side.
drop policy if exists point_events_insert on public.point_events;
create policy point_events_insert on public.point_events
  for insert to authenticated
  with check (public.is_member(household_id));

-- 2. Fix the viewer-check trigger to also reject positive awards.
create or replace function public.check_viewer_point_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_role text;
  household_setting boolean;
  is_needs_work boolean;
begin
  -- Get the viewer's role for this household
  select m.role into viewer_role
    from public.household_members m
   where m.user_id = auth.uid()
     and m.household_id = new.household_id;

  if viewer_role = 'viewer' then
    -- Determine if this is a needs-work award (negative points).
    -- Note: we do NOT try to look up via new.batch_id because the client
    -- sends random UUID batch IDs, not skill IDs.  The points sign is the
    -- only reliable signal.
    is_needs_work := (new.points < 0);

    if is_needs_work then
      -- Needs‑work: check the household setting.
      select coalesce(
        (select hs.ext_family_can_award_needs_work from public.household_settings hs
          where hs.household_id = new.household_id),
        false
      ) into household_setting;

      if not household_setting then
        raise exception 'Extended family members are not allowed to log Needs Work behaviour';
      end if;
    else
      -- Positive award: viewers are not allowed.
      raise exception 'Viewers can only log Needs Work behaviour';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.check_viewer_point_event() from public, anon, authenticated;

-- Re-attach the trigger (idempotent).
drop trigger if exists trg_check_viewer_point_event on public.point_events;
create trigger trg_check_viewer_point_event
  before insert on public.point_events
  for each row execute function public.check_viewer_point_event();
