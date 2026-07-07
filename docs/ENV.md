# PointPals — environment variables (Vercel + Supabase)

Now that the app runs direct against Supabase, GitHub and Vercel (no Lovable),
these are the variables to set. Nothing calls the Lovable connector gateway
anymore — email goes straight to the Resend API.

## Vercel → Project → Settings → Environment Variables

These are baked into the client/SSR build. Client-exposed ones **must** be
prefixed `VITE_`.

| Variable | Required | What it's for |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon/publishable key |
| `VITE_SENTRY_DSN` | optional | Sentry DSN. **Unset = Sentry off.** When set, errors report with PII scrubbed and Session Replay masks all text/media. |
| `VITE_POSTHOG_KEY` | optional | PostHog project API key. Unset = analytics off. |
| `VITE_POSTHOG_HOST` | optional | Defaults to `https://us.i.posthog.com`. Set for EU/self-host. |
| `VITE_STRIPE_PRICE_NZD` | for billing | Stripe Price ID (NZD, primary) |
| `VITE_STRIPE_PRICE_AUD` | optional | Stripe Price ID (AUD) |
| `VITE_STRIPE_PRICE_USD` | optional | Stripe Price ID (USD) |
| `RESEND_API_KEY` | for email | Used by the TanStack **server functions** (contact form + trial welcome). Server-only — do NOT prefix `VITE_`. |

> Sentry/PostHog are read at build time via `import.meta.env`, so after adding
> them you must **redeploy** (not just save) for them to take effect.

## Supabase → Project → Edge Functions → Secrets

Set with `supabase secrets set NAME=value` (or the dashboard). These are for the
edge functions (Stripe, email, AI icons, cron).

| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | all | auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | all | auto-provided by Supabase |
| `RESEND_API_KEY` | stripe-webhook, notify-trial-ending, notify-nurture-sequence, generate-icon, upload-icon | direct Resend API now — **`LOVABLE_API_KEY` is no longer needed** |
| `STRIPE_SECRET_KEY` | stripe-checkout, stripe-portal, stripe-webhook | |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | from the Stripe webhook endpoint |
| `STRIPE_COUPON_ID` | stripe-checkout | optional intro coupon |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | generate-icon | Gemini image model |
| `OPENAI_API_KEY` | transcribe-memory | Whisper transcription |
| `CRON_SECRET` | notify-trial-ending, notify-nurture-sequence, notify-memory-expiry, purge-expired-memories | shared secret guarding the cron endpoints (also stored in Supabase **Vault** under the same name — the `cron.schedule` jobs read it from there) |
| `PUBLIC_SITE_URL` | notify-*, stripe-* | canonical site URL for links in emails/redirects |
| `SHOTSTACK_API_KEY` | render-montage | Shotstack render API key. **Unset = montage off** — the Memories-page button shows a friendly "coming soon" message. |
| `SHOTSTACK_ENV` | render-montage | `v1` (production, default) or `stage` (free sandbox renders with a watermark) |
| `SHOTSTACK_SOUNDTRACK_URL` | render-montage | optional: public URL of a royalty-free MP3 used as the montage soundtrack |

## Resend

- Verify the sending domain **pointpals.co.nz** in Resend (SPF/DKIM), or emails
  silently fail to deliver.
- The lifecycle emails use Resend **hosted templates** by ID (see
  `EMAIL_TEMPLATES` in `src/lib/emails.server.ts` and `RESEND_TEMPLATES` in the
  edge functions). Those template IDs must exist in the Resend account tied to
  `RESEND_API_KEY`. If you're moving Resend accounts, recreate the templates and
  update the IDs.

## Still on Lovable (build-time only, not a runtime API)

`vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, a build-time plugin
bundle (TanStack Start + React + Sentry + tsconfig-paths). It does **not** call
Lovable at runtime, so it's safe on Vercel. If you want it fully gone, replace
it by installing `@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`,
`vite-tsconfig-paths` and `@sentry/tanstackstart-react/vite` and listing them in
`vite.config.ts` directly — test the build before shipping.
