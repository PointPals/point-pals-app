-- Per-child chore/skill assignment.
--
-- Semantics (deliberate, do not "helpfully" change):
--   * assigned_kid_ids IS NULL (or empty) = universal — applies to every kid,
--     INCLUDING kids added to the household later. This is the default and the
--     migration leaves every existing row NULL, preserving behaviour exactly.
--   * a non-empty array = a static allow-list of kid ids. A kid added later is
--     NOT auto-included: a chore narrowed to an 8-year-old must not suddenly
--     apply to a newborn added next year.
-- The client only writes a non-null array when the parent has deliberately
-- deselected at least one kid; "left everyone ticked" saves NULL.

alter table public.chores add column if not exists assigned_kid_ids uuid[] default null;
alter table public.skills add column if not exists assigned_kid_ids uuid[] default null;

-- While we're touching chores: the client has had a `tags` field since the
-- edit-in-place work, but no column ever existed, so tags silently never
-- persisted (and the whole field was dropped on every realtime echo). Add it
-- so the chore write path round-trips completely.
alter table public.chores add column if not exists tags text[] not null default '{}';
