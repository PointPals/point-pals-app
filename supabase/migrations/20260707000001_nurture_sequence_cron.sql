-- ============================================================================
-- Nurture Sequence Cron Schedules — sends parenting tips at Day 3, Day 7,
-- and Month 1 after household signup.
--
-- Each runs once daily. The edge function handles idempotency via
-- email_tip_day3_sent_at, email_tip_day7_sent_at, email_tip_month1_sent_at.
--
-- Auth: uses x-cron-secret header (read from Supabase Vault).
-- ============================================================================

-- Day 3 tip (8:00 AM UTC = 8:00 PM NZT during daylight)
DO $$ BEGIN PERFORM cron.unschedule('nurture-day3'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'nurture-day3',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/notify-nurture-sequence',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := jsonb_build_object('tip', 'day3')
  );
  $$
);

-- Day 7 tip (8:15 AM UTC — staggered so they don't all hit at once)
DO $$ BEGIN PERFORM cron.unschedule('nurture-day7'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'nurture-day7',
  '15 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/notify-nurture-sequence',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := jsonb_build_object('tip', 'day7')
  );
  $$
);

-- Month 1 tip (8:30 AM UTC)
DO $$ BEGIN PERFORM cron.unschedule('nurture-month1'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'nurture-month1',
  '30 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/notify-nurture-sequence',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := jsonb_build_object('tip', 'month1')
  );
  $$
);
