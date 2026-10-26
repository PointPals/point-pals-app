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

Schema highlights: `households` carries legacy entitlement fields
(`subscription_status`, `stripe_customer_id`, …) from the paid era — they are
ignored now that PointPals is free; `icon_generations` is the rate-limit
ledger; RLS is member-scoped.

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

## 3. Billing — none (PointPals is free)

There is no Stripe integration, checkout, subscription, or trial. Every
household has full access. The legacy `subscription_status` column and the old
`stripe-*` edge functions have been retired; `src/lib/entitlements.ts` simply
grants every feature to everyone. Deploy only the remaining functions:

```bash
supabase functions deploy generate-icon upload-icon get-icon-usage
```

Both icon functions call a Gemini image model through
`supabase/functions/_shared/gemini-image.ts`, which falls back to older model
IDs when Google retires one (as it did with `gemini-2.5-flash-image` on
2 Oct 2026). To move to a newer model, set the `GEMINI_IMAGE_MODEL` secret.
Failures are logged to `public.icon_generation_errors`.

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

## 6. Transactional email (Resend)

All email goes **directly to the Resend API** (`api.resend.com/emails`) using
hosted templates — the old Lovable connector gateway (needed
`LOVABLE_API_KEY`) is gone. Two runtimes send email, each needing
`RESEND_API_KEY`:

- **Vercel env** — `sendTrialWelcome` (fires on signup) and the contact form.
- **Supabase function secrets** — `notify-nurture-sequence`,
  `notify-trial-ending`, `notify-memory-expiry`, `stripe-webhook`,
  `generate-icon` (billing alerts).

### Template checklist

Every template below must exist in the Resend dashboard **and be published**
(drafts are rejected at send time). If a template contains a `{{variable}}`
not listed here, give it a default value in the editor or the send fails
validation; templates must also define default from/subject.

| Template (dashboard name)   | ID          | Sender                  | Variables provided by code |
|-----------------------------|-------------|-------------------------|----------------------------|
| Welcome-PointPals           | `c47b8f0c…` | signup server fn        | `first_name` |
| Parenting-Tip-StartSmall    | `f8fbb7b8…` | nurture cron (day 3)    | `first_name` |
| Parenting-Tip-LabelPraise   | `d12adf3c…` | nurture cron (day 7)    | `first_name` |
| Habit-Fading-Tips           | `c61044aa…` | nurture cron (month 1)  | `first_name`, `trial_end_date` |
| Trial-Ending-Soon           | `929843c3…` | trial-ending cron       | `pct_full`, `first_name`, `trial_end_date`, `family_name`, `total_points`, `streak`, `checkout_url` |
| Subscription-Receipt        | `f349804b…` | stripe-webhook          | `amount`, `currency` |
| Subscription-Renewal        | `af7030c6…` | stripe-webhook          | `amount`, `currency`, `period_end`, `month` |
| Payment-Failed              | `be31e3d1…` | stripe-webhook          | `amount`, `currency` |
| Subscription-Cancelled      | `9bbe49aa…` | stripe-webhook          | — |
| Contact-Confirmation        | `267dc7da…` | contact form            | `first_name` |
| Memory-Expiry-Warning       | `f2ebbe00…` | memory-expiry cron      | `first_name`, `family_name`, `cycle_end_date`, `memory_count`, `memory_plural`, `retention_days`, `settings_url`, `memories_url`, `keep_url`, `unsubscribe_url` |
| Memory-Montage-Ready        | `0988eb46…` | render-montage          | `first_name`, `family_name`, `season_label`, `memory_count`, `memory_plural`, `has_videos`, `download_url`, `expires_in_hours`, `season_limit`, `memories_url`, `unsubscribe_url` |

Branded HTML for the templates still in use (and for the Supabase Auth
emails) lives in `emails/` — see `emails/README.md` for where each one is
pasted.

(Full IDs live in `src/lib/emails.server.ts`, `_shared/email-templates.ts`,
`stripe-webhook/index.ts`, and `notify-memory-expiry/index.ts`.)

### Verifying the cron side

```sql
select jobname, schedule, active from cron.job order by jobname;
```

Expected jobs: `notify-nurture-day3/day7/month1`-style entries,
`notify-trial-ending`, `notify-memory-expiry`, `purge-expired-memories` —
each posts to its edge function with the Vault `CRON_SECRET`. ⚠️ If a job
posting to `/api/public/hooks/email-cron` (the legacy Vercel route) appears,
**unschedule it**: it duplicates the nurture/trial-ending functions but sends
without variables, so it either fails validation or beats the personalised
email to the idempotency stamp.

### Manual smoke test

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/notify-trial-ending" \
  -H "x-cron-secret: $CRON_SECRET" -H "Content-Type: application/json" -d '{}'
```

(Repeat per function; each returns `{ok, sent, errors}` and only emails
households inside its trigger window, stamping idempotency columns.)

## 7. Rate limiting (§9)

`generate-icon` caps generations per household per month
(`FREE_MONTHLY_CAP` / `PREMIUM_MONTHLY_CAP`) via the `icon_generations` ledger.
Wire your image provider where marked `TODO` in the function.

## 8. Memory seasons (retention + montage)

The memory feed runs in fixed **90-day seasons** for every household
(`20260714000000_memory_retention.sql`, made mandatory by
`20261026000000_retention_always_on.sql`): each household has a cycle anchor on
`households` (`memory_cycle_started_at` → derived `memory_cycle_ends_at`). All
cycle columns, including `memory_retention_enabled`, are frozen for clients by
the billing guard trigger — there is no opt-out.

Two cron jobs (`20260714000001_memory_retention_cron.sql`, authenticated with
the Vault `CRON_SECRET`) drive the lifecycle:

- **notify-memory-expiry** (daily 9:30 UTC) — emails the household when its
  season ends within 4 days, or has already ended unwarned (idempotent via
  `email_memory_expiry_sent_at`; hosted template Memory-Expiry-Warning). Then
  starts the season recap through `render-montage`'s cron path, unless the
  family already made one this season.
- **purge-expired-memories** (daily 13:00 UTC), in order:
  1. Finishes in-flight recap renders (MP4 → `exports`, Montage-Ready email);
     renders stuck for 2 days are marked failed.
  2. Deletes each ended season's storage objects, then its rows, and rolls the
     anchor. Waits for a reminder that's at least 24h old and for any
     rendering recap — but only up to **7 days past the season end**, after
     which it purges regardless (bounced email, no admin). Rows are kept if a
     storage delete fails, so the files are retried next run.
  3. Sweeps buckets not tied to memory rows via `expired_storage_objects()`:
     `exports/*.zip` after 1 day, `exports/*.mp4` after 90 days (clears
     `montage_jobs.output_path`), `support_attachments` after 90 days.

  Supports `{"dry_run": true}` for a no-op report — recommended for the first
  production runs.

Deploy: `supabase functions deploy notify-memory-expiry purge-expired-memories
render-montage` (config.toml turns off gateway JWT checks for all three; each
checks its own caller), then `supabase db push`.

**Season recap** (`render-montage`, `montage_jobs`): an MP4 of the season in
date order via Shotstack — set `SHOTSTACK_API_KEY` (see `ENV.md`); until then
the UI and the automatic recap degrade gracefully (`not_configured`). Busy
seasons are thinned evenly to 60 clips so the recap spans the whole season;
videos play for their recorded length (capped at 10s; 6s when unknown).
Finished videos land in the private `exports` bucket; the emailed link is
signed for 7 days, in-app links for 1 hour. Cap: 5 montages per season.

## 9. PWA / app-store path (§8)

`public/manifest.webmanifest` + `public/sw.js` (registered in `ClientBoot`,
production only). Nothing depends on browser-only APIs without a clean Capacitor
equivalent — haptics and audio are behind the `feedback.ts` interface, so a
Capacitor wrapper swaps implementations without touching call sites.
