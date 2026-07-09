-- ============================================================================
-- 🗝️ Seed vault secrets for cron auth
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor
-- After running, ALSO set CRON_SECRET as an edge function secret (see below).
-- ============================================================================

-- 1. Create CRON_SECRET vault entry (if missing)
--    pg_cron jobs read this to authenticate HTTP calls to edge functions.
INSERT INTO vault.secrets (secret, name, description)
SELECT gen_random_uuid()::text, 'CRON_SECRET', 'PG cron auth for edge functions'
WHERE NOT EXISTS (
  SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET'
);

-- 2. View the CRON_SECRET (grab this value for edge function secrets too)
SELECT name, decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

-- 3. Optionally add RESEND_API_KEY to vault
--    Uncomment and replace with your actual key:
-- INSERT INTO vault.secrets (secret, name, description)
-- SELECT 're_YOUR_KEY_HERE', 'RESEND_API_KEY', 'Resend API key for transactional emails'
-- WHERE NOT EXISTS (
--   SELECT 1 FROM vault.decrypted_secrets WHERE name = 'RESEND_API_KEY'
-- );

-- 4. Verify all vault secrets
SELECT name, substring(decrypted_secret, 1, 8) || '****' AS masked
FROM vault.decrypted_secrets;

-- 5. Check cron jobs exist (column names vary by pg_cron version)
SELECT * FROM cron.job ORDER BY jobid;
