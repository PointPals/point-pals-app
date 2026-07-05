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

## 8. PWA / app-store path (§8)

`public/manifest.webmanifest` + `public/sw.js` (registered in `ClientBoot`,
production only). Nothing depends on browser-only APIs without a clean Capacitor
equivalent — haptics and audio are behind the `feedback.ts` interface, so a
Capacitor wrapper swaps implementations without touching call sites.
