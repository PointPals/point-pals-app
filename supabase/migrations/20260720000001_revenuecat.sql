-- =============================================================================
-- RevenueCat integration — columns for native IAP support
-- =============================================================================
-- Native iOS/Android builds use RevenueCat for StoreKit / Play Billing.
-- The RevenueCat webhook updates households.subscription_status so the
-- existing hasEntitlement() layer works identically on web + native.
--
-- The app_user_id is set to households.id — the webhook looks up the
-- household directly by id, so no separate revenuecat_customer_id column
-- is needed on the DB side.
--
-- However, we store the latest RevenueCat subscriber JSON (sanitized) for
-- debugging and support purposes.
-- =============================================================================

alter table public.households
  add column if not exists revenuecat_entitlement text,
  add column if not exists revenuecat_expires_at timestamptz,
  add column if not exists revenuecat_raw jsonb default null;
