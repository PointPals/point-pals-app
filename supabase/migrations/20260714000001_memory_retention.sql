-- ============================================================================
-- Memory Retention: 90-day fixed cycles
--
-- - memory_cycle_started_at: anchor for the household's current 90-day cycle.
--   Defaults to the household's created_at (or first memory post date if null).
--   Reset to now() when a cycle turns over.
-- - memory_cycle_reminded_at: when the "your memories expire soon" email was
--   last sent (idempotency stamp, one per cycle).
-- - Exported montage filename stored on memory_posts so we know what's been
--   downloaded and don't purge content that was exported this cycle.
-- ============================================================================

-- ── Columns on households ──────────────────────────────────────────────────
ALTER TABLE households
  ADD COLUMN memory_cycle_started_at timestamptz,
  ADD COLUMN memory_cycle_reminded_at timestamptz;

-- Backfill: set cycle anchor to the household's creation date, or the date
-- of their first memory post, whichever is earlier. Also set for households
-- that already have memories.
UPDATE households h
  SET memory_cycle_started_at = COALESCE(
    (SELECT MIN(mp.created_at) FROM memory_posts mp WHERE mp.household_id = h.id),
    h.created_at
  )
  WHERE h.memory_cycle_started_at IS NULL;

-- Ensure no nulls remain for households that don't have posts yet
-- (their cycle starts now, since we can't know when they "started").
UPDATE households
  SET memory_cycle_started_at = created_at
  WHERE memory_cycle_started_at IS NULL;

-- ── Montage export tracking on memory_posts ────────────────────────────────
ALTER TABLE memory_posts
  ADD COLUMN montage_exported_at timestamptz;
CREATE INDEX IF NOT EXISTS memory_posts_cycle_export_idx
  ON memory_posts(household_id, montage_exported_at NULLS LAST);

-- ── Household opt-out ──────────────────────────────────────────────────────
ALTER TABLE households
  ADD COLUMN memory_auto_purge boolean NOT NULL DEFAULT true;

-- ── Montage job state (JSONB array, lightweight) ───────────────────────────
ALTER TABLE households
  ADD COLUMN memory_montage_jobs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── Grant (service_role already has all; add to authenticated for reads) ────
GRANT ALL ON households(memory_cycle_started_at, memory_cycle_reminded_at, memory_auto_purge, memory_montage_jobs) TO authenticated;

-- ============================================================================
-- Cron: notify-memory-expiry – runs daily at 10:00 UTC (10 PM NZT)
-- Finds households whose cycle ends in 4–8 days and sends a reminder email.
-- ============================================================================
DO $$ BEGIN PERFORM cron.unschedule('notify-memory-expiry'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'notify-memory-expiry',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/notify-memory-expiry',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- Cron: purge-memories – runs daily at 11:00 UTC (11 PM NZT)
-- Hard-deletes memory_posts older than the household's current cycle boundary.
-- ============================================================================
DO $$ BEGIN PERFORM cron.unschedule('purge-memories'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'purge-memories',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/purge-memories',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
