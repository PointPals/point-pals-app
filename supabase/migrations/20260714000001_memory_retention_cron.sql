-- ============================================================================
-- Memory retention cron jobs.
--
-- notify-memory-expiry  — daily 9:30 UTC: emails households whose memory
--                         season ends in the next 0–4 days (idempotent via
--                         email_memory_expiry_sent_at).
-- purge-expired-memories — daily 13:00 UTC: wipes ended seasons and rolls the
--                          cycle anchor. Refuses to purge any household whose
--                          reminder is missing or less than 24h old.
--
-- Auth: x-cron-secret header, read from Supabase Vault (same pattern as
-- notify-trial-ending).
-- ============================================================================

DO $$ BEGIN PERFORM cron.unschedule('notify-memory-expiry'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'notify-memory-expiry',
  '30 9 * * *',
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

DO $$ BEGIN PERFORM cron.unschedule('purge-expired-memories'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'purge-expired-memories',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/purge-expired-memories',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
