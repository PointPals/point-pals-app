-- Add missing columns that were supposed to come from
-- 20260706000002_individual_jar_targets.sql but were never applied to production.
-- split_mode and shared_jar_enabled are the two columns still missing.

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS split_mode          TEXT    NOT NULL DEFAULT 'percentage'
    CHECK (split_mode IN ('percentage', 'match')),
  ADD COLUMN IF NOT EXISTS shared_jar_enabled  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN households.split_mode
  IS '"percentage" - split per split_ratio; "match" (1:1) - full points to both jars';
COMMENT ON COLUMN households.shared_jar_enabled
  IS 'When false the shared family jar is hidden; all points go to personal jars';
