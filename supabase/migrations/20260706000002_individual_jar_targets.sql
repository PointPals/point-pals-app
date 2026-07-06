-- Individual jar targets for each kid (optional, off by default).
-- Enables: each child works toward their own personal reward while also
-- contributing to the shared family jar.
--
-- Usage:
--   1. Run this migration
--   2. Run `supabase gen types typescript --local > src/integrations/supabase/types.ts`
--      to regenerate the TypeScript types (or patch manually)

-- ── kids ──────────────────────────────────────────────────────────────────
ALTER TABLE kids
  ADD COLUMN personal_pool    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN personal_target  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN personal_reward  TEXT DEFAULT NULL;

COMMENT ON COLUMN kids.personal_pool   IS 'Points in this kid''s personal jar (separate from shared pool)';
COMMENT ON COLUMN kids.personal_target IS 'Points needed to fill this kid''s personal jar (0 = disabled)';
COMMENT ON COLUMN kids.personal_reward IS 'The reward name for this kid''s personal jar';

-- ── households ────────────────────────────────────────────────────────────
ALTER TABLE households
  ADD COLUMN split_jars_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN split_ratio         INTEGER NOT NULL DEFAULT 50;

COMMENT ON COLUMN households.split_jars_enabled
  IS 'When true, awards are split between shared pool and each kid''s personal pool';
COMMENT ON COLUMN households.split_ratio
  IS 'Percentage of each award that goes to the shared jar (0-100; remainder is personal)';

ALTER TABLE households
  ADD COLUMN split_mode          TEXT NOT NULL DEFAULT 'percentage'
    CHECK (split_mode IN ('percentage', 'match')),
  ADD COLUMN shared_jar_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN households.split_mode
  IS '"percentage" — split per split_ratio; "match" (1:1) — full points to both jars';
COMMENT ON COLUMN households.shared_jar_enabled
  IS 'When false, the shared family jar is hidden and all points flow to personal jars';
