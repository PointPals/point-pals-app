-- 🔧 RUN THIS IN SUPABASE DASHBOARD SQL EDITOR
-- Fix missing columns: split_mode and shared_jar_enabled never made it to production.
-- Navigate to https://supabase.com/dashboard/project/tcpbvcgvtwrqsrzerwwr/sql/new
-- Paste and run.

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS split_mode          TEXT    NOT NULL DEFAULT 'percentage'
    CHECK (split_mode IN ('percentage', 'match')),
  ADD COLUMN IF NOT EXISTS shared_jar_enabled  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN households.split_mode
  IS '"percentage" - split per split_ratio; "match" (1:1) - full points to both jars';
COMMENT ON COLUMN households.shared_jar_enabled
  IS 'When false the shared family jar is hidden; all points go to personal jars';
