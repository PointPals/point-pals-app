-- ============================================================================
-- Remove the trial-ending cron job.
--
-- PointPals is now completely free — there is no trial, so the
-- `notify-trial-ending` edge function was deleted. Unschedules the pg_cron
-- job that called it so it stops firing against a 404.
--
-- Idempotent: tolerates the job already being absent.
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('notify-trial-ending');
EXCEPTION WHEN OTHERS THEN
  NULL; -- already unscheduled / pg_cron not present
END $$;
