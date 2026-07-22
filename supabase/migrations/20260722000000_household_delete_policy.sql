-- Allow household members to delete their own household.
-- This cascades through all child tables (kids, chores, skills, point_events,
-- household_members, memory posts, etc.) which have ON DELETE CASCADE.
-- Only admins can delete — prevents a child-minder or viewer from destroying the family data.

drop policy if exists households_delete on public.households;
create policy households_delete on public.households
  for delete using (public.has_min_role(id, 'admin'));
