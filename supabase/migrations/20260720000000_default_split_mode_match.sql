-- Default new households to "match" split mode.
--
-- The previous default was 'percentage' at a 50/50 ratio, which rounds small
-- awards DOWN: a 1-point award gave the shared family jar floor(1 * 0.5) = 0,
-- so with normal 1-point taps the family jar never filled — a confusing empty
-- family jar the moment individual jars were switched on. "match" sends every
-- point to BOTH the child's jar and the family jar, which is the intuitive
-- team + individual behaviour.
--
-- Only the column DEFAULT changes — existing households keep whatever they've
-- already set, so no active family's behaviour changes mid-cycle.

alter table public.households
  alter column split_mode set default 'match';
