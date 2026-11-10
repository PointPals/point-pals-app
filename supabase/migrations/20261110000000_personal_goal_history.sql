-- Personal-jar wins. When a member reaches their personal target and a parent
-- taps "Reset points", the win is logged in reward_history with kid_id set, so
-- each member keeps a record of their successes over time (shown on Reports).
-- Family-jar rewards keep kid_id null, so the family's "Past rewards" list is
-- unchanged. Insert/select policies already cover the table (members read,
-- parents/admins insert).

alter table public.reward_history
  add column if not exists kid_id uuid references public.kids(id) on delete cascade;

create index if not exists reward_history_kid_idx
  on public.reward_history(kid_id, achieved_at desc)
  where kid_id is not null;

comment on column public.reward_history.kid_id is
  'Set for a personal-jar goal reached by this member; null for a family-jar reward.';
