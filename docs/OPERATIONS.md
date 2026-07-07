# PointPals — Operations & launch checklist

This app was rebuilt to be market-ready. Several pieces are **committed as source
but not deployed**, because the connected Supabase project
(`tcpbvcgvtwrqsrzerwwr`) was not reachable from the build environment (network
policy 403; the Supabase MCP account also lacked permission for it). This doc is
the runbook to finish wiring them.

## 1. Assets (§0)

- Chore/skill **icon tiles already render real bundled PNG illustrations**
  (`src/assets/icons/i00…i65.png`) layered over CSS-driven colour tiles — no
  action needed.
- **Companion mascot art** lives in the Supabase Storage `assets` bucket
  (`sunny.png`, `bramble.png`, …). Wire it in one place:
  `src/lib/companion-assets.ts` — populate `COMPANION_FILES` (companion id →
  filename) and/or `AVATAR_MAP` (kid id → filename/URL). Avatars then use the
  real art automatically; until then a friendly deterministic vector face is
  shown (no broken images).

## 2. Database (Supabase)

Apply the committed migrations once the project is reachable:

```bash
supabase link --project-ref <ref>
supabase db push          # applies supabase/migrations/0001_init.sql, 0002_rls.sql
```

Schema highlights: `households` carries the entitlement fields
(`subscription_status`, `stripe_customer_id`, …); `icon_generations` is the
rate-limit ledger; RLS is member-scoped and billing columns are service-role
only (`0004_billing_guard.sql` adds a BEFORE-UPDATE trigger enforcing this).

### Regenerating the client types

`src/integrations/supabase/types.ts` is now generated from the live project
(no longer the empty placeholder). Re-run this after any migration:

```bash
supabase gen types typescript --project-id tcpbvcgvtwrqsrzerwwr \
  > src/integrations/supabase/types.ts
```

A few call sites (`src/lib/memories.ts`, `src/lib/correction-store.tsx`) still
cast the client (`supabase as unknown as SupabaseClient`) or individual calls
(`as never`) from when those tables predated the generated types — safe to
drop those casts opportunistically now that the types include them.

## 3. Stripe (§5)

1. Create a Product + recurring Price per currency in the Stripe dashboard.
2. Set function secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   supabase secrets set STRIPE_PRICE_NZD=price_... STRIPE_PRICE_AUD=price_... STRIPE_PRICE_USD=price_...
   ```
3. Deploy the functions:
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy generate-icon
   ```
4. Add a Stripe webhook endpoint → `.../functions/v1/stripe-webhook` sending:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
5. Client Price IDs: set `VITE_STRIPE_PRICE_*` (see `.env.example`).

**Switching pricing model** (one-off / monthly / freemium) is a config change in
`src/lib/entitlements.ts` (`BILLING_CONFIG.model` + the `FEATURES` gate map) —
no rebuild. NZD is primary; add a currency by adding a Price ID.

## 4. Analytics & error tracking (§7)

- **PostHog**: `npm i posthog-js`, set `VITE_POSTHOG_KEY`. Scoped to parent
  actions only; no session recording; kid-flow events carry only a hashed
  `kid_id`. No-op when unset.
- **Sentry**: `npm i @sentry/browser`, set `VITE_SENTRY_DSN`. Names/emails are
  scrubbed before send. No-op when unset.

## 5. Uptime monitoring (§7)

Point UptimeRobot / Better Uptime at the deployed root URL (`/`) on a 5-minute
interval and alert to the support inbox. The service worker serves a cached
shell if the origin briefly blips.

## 6. Transactional email

Keep the existing **Resend** integration for receipts / password resets.

## 7. Rate limiting (§9)

`generate-icon` caps generations per household per month
(`FREE_MONTHLY_CAP` / `PREMIUM_MONTHLY_CAP`) via the `icon_generations` ledger.
Wire your image provider where marked `TODO` in the function.

## 8. Memory seasons (retention + montage)

The memory feed runs in fixed **90-day seasons**
(`20260714000000_memory_retention.sql`): each household has a cycle anchor on
`households` (`memory_cycle_started_at` → derived `memory_cycle_ends_at`).
Two cron jobs (`20260714000001_memory_retention_cron.sql`, authenticated with
the Vault `CRON_SECRET`) drive the lifecycle:

- **notify-memory-expiry** (daily 9:30 UTC) — emails the household when a
  season ends within 0–4 days (idempotent via `email_memory_expiry_sent_at`).
  Sends direct HTML via Resend — no hosted template to create.
- **purge-expired-memories** (daily 13:00 UTC) — deletes the ended season's
  storage objects + rows and rolls the anchor. **Never purges a household
  whose reminder is missing or under 24h old.** Supports `{"dry_run": true}`
  for a no-op report — recommended for the first production runs.

Per-household opt-out: `memory_retention_enabled` (toggle in Settings → Your
data). The cycle columns themselves are frozen for clients by the billing
guard trigger.

Deploy: `supabase functions deploy notify-memory-expiry purge-expired-memories
render-montage`, then `supabase db push`.

**Montage export** (`render-montage`, `20260714000002_montage_jobs.sql`):
members can render their season as an MP4 via Shotstack — set
`SHOTSTACK_API_KEY` (see `ENV.md`); until then the UI degrades gracefully.
Finished videos land in the private `exports` bucket and are served by signed
URL. Cost gate: 1 montage/season free tier, 5 for subscribers.

## 9. PWA / app-store path (§8)

`public/manifest.webmanifest` + `public/sw.js` (registered in `ClientBoot`,
production only). Nothing depends on browser-only APIs without a clean Capacitor
equivalent — haptics and audio are behind the `feedback.ts` interface, so a
Capacitor wrapper swaps implementations without touching call sites.

## 9. Memory seasons (retention + montage)

The memory feed runs in fixed **90-day cycles**
(`20260714000001_memory_retention.sql` + `20260715000000_memory_seasons_fixes.sql`):
each household has a cycle anchor on `households`
(`memory_cycle_started_at`); the current cycle window is derived from it
everywhere (client banner, both cron functions, montage). Two cron jobs
(authenticated with the Vault `CRON_SECRET`, same pattern as
`notify-trial-ending`) drive the lifecycle:

- **notify-memory-expiry** (daily 10:00 UTC) — emails the household's primary
  parent when the cycle ends in 4–8 days (idempotent via
  `memory_cycle_reminded_at`). Uses the Resend hosted template
  `MEMORY_EXPIRY_WARNING` — **create it in the Resend dashboard** with
  variables `first_name`, `family_name`, `expiry_date`, `post_count`,
  `memories_url`, `montage_url`, `auto_purge`, then put its ID in
  `_shared/email-templates.ts`.
- **purge-memories** (daily 11:00 UTC) — deletes aged-out posts' storage
  objects (both `storage_path` and every `media_paths` entry) + DB rows.
  **Never purges a household that wasn't warned this cycle, or whose reminder
  is under 24h old.** Respects the per-household `memory_auto_purge` opt-out
  (Settings → toggle; the cycle columns themselves are frozen for clients by
  the billing-guard trigger). Supports `{"dry_run": true}` for a no-op
  report — recommended for the first production runs.

**Montage export** (`render-montage` + `montage_jobs` table): any household
member can render the current cycle as an MP4 via Shotstack — set
`SHOTSTACK_API_KEY` (optional: `SHOTSTACK_ENV` `v1`/`stage`,
`SHOTSTACK_SOUNDTRACK_URL`); until then the button degrades gracefully
("coming soon"). Finished videos are pulled into the private `exports` bucket
and served by signed URL. Cost gate: 1 montage/cycle free tier, 5 for
subscribers.

Deploy:

```bash
supabase db push
supabase functions deploy notify-memory-expiry purge-memories render-montage
supabase secrets set SHOTSTACK_API_KEY=...   # montage rendering
# CRON_SECRET must exist both in Vault (for cron) and as a function secret.
```
