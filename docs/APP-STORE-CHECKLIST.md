# PointPals — App Store & Play Store readiness checklist

Working checklist to get PointPals submittable to the Apple App Store and Google
Play. Each item is tagged:

- **[You]** — account, dashboard, legal, or asset work (no code).
- **[Agent]** — code changes in this repo (for the VS Code agent), with file
  pointers where useful.

Ordered so blockers come first. Status of the in-repo billing/auth groundwork:
Sign in with Apple + production Capacitor config (PR #22) and the RevenueCat
native IAP path (PR #23) are already merged to `main`.

---

## 0. Naming — "PointPals" vs the existing "Point Pals" (do first)

There is already a **"Point Pals"** app on the App Store (personal developer
account; a pet/chore-growing game). Ours is **PointPals** (family marble-jar
behaviour tool). Different function + different market = low "likelihood of
confusion", but the near-identical name is worth de-risking cheaply. *(Not legal
advice.)*

- [ ] **[You]** Search **USPTO TESS** (US) and **IPONZ** (NZ) for a *registered*
      "Point Pals" trademark. If one exists in a related class, take it
      seriously; if not, exposure is modest.
- [ ] **[You]** Decide the final store display name. Recommended: keep the
      **PointPals** brand but add a distinguishing subtitle, e.g.
      **"PointPals — Family Marble Jar"** — heads off Apple Guideline 4.1
      (Copycats) and any IP friction.
- [ ] **[You]** Reserve the name in App Store Connect + Play Console as soon as
      the accounts exist (names are first-come; the bundle id
      `nz.co.pointpals.app` is already unique and unaffected).

---

## 1. Shippable native build (Tier-1 blocker)

- [ ] **[Agent]** Produce the static web bundle Capacitor expects at `webDir:
      'capacitor-web'`. Today `vite build` emits a TanStack Start *server*
      (Nitro), not static assets. Either add a static/SPA build target that
      outputs `capacitor-web`, or confirm the WebView loads the hosted
      production URL. (PR #22 already pointed `capacitor.config.ts` at the live
      site.)
- [ ] **[Agent]** Confirm the store build has **no** `cleartext` and **no**
      `localhost` server URL (`capacitor.config.ts`).
- [ ] **[Agent]** Sync `bun.lock` — run `bun install` so the RevenueCat deps
      added to `package.json` (`@revenuecat/purchases-capacitor` + `-ui`) are
      recorded; commit the lockfile.
- [ ] **[Agent]** `npx cap sync`, then confirm iOS (Xcode) and Android (Android
      Studio) each build a release binary.
- [ ] **[You]** Bump versions: Android `versionCode`/`versionName` (currently
      `1` / `1.0`), iOS marketing/build numbers.

---

## 2. Payments — finish RevenueCat wiring (code merged, config pending)

Native iOS/Android must use StoreKit / Play Billing (Stripe web checkout is
rejected for digital goods). The code routes to RevenueCat on native and keeps
Stripe on web; the dashboard/store config is what's left.

> Note: RevenueCat routes money **through** Apple/Google — the 15–30% store
> commission still applies. It's the compliant path, not a way around the fee.

- [ ] **[You]** RevenueCat dashboard: create products **`lifetime` / `yearly` /
      `monthly`**, the **`PointPals Pro`** entitlement, an **Offering**, and a
      **Paywall**. Create matching products in App Store Connect + Play Console.
- [ ] **[You]** Paste public SDK keys into `VITE_RC_IOS_KEY` /
      `VITE_RC_ANDROID_KEY` (env). These are the public app-specific keys, not
      the docs' sample `test_…` key and not a secret key.
- [ ] **[You]** Deploy the webhook: `supabase functions deploy
      revenuecat-webhook --no-verify-jwt`; set its URL + `REVENUECAT_WEBHOOK_AUTH`
      header in the RevenueCat dashboard.
- [ ] **[Agent]** Configure the 14-day trial as a store *introductory offer* so
      the trial and the store agree; test purchase → entitlement →
      `households.subscription_status` on a real device.
- [ ] **[You]** Confirm Stripe remains the web/PWA path (no store tax there).

---

## 3. Kids' data / COPPA / Google Families

The account holder is the parent; kids don't log in or provide data. Positioning
as a **parent tool with a mixed audience** (not Apple's Kids Category / Google
Designed for Families) avoids the harshest tier and its SDK bans.

- [ ] **[Agent]** Re-add **in-app account + data deletion** in Settings
      (`src/routes/_authenticated.settings.tsx` currently only has "Export
      data"; `src/routes/privacy.tsx` already *promises* deletion). Required by
      Apple 5.1.1(v) and Google.
- [ ] **[Agent]** Add a **neutral age gate** (ask age without pre-fill) and a
      **parental gate** before the paywall and any external link.
- [ ] **[Agent]** Add a **consent checkbox at sign-up** (parent confirms
      guardianship + consent to store child info) — `src/routes/sign-up.tsx`,
      `welcome-back.tsx`.
- [ ] **[Agent]** Keep the **Kids' view strictly read-only / device-local**
      (`src/components/KidView.tsx`). Do not let it log in, type, or upload —
      that would trigger verifiable-parental-consent obligations.
- [ ] **[Agent]** Fix the memory (kid photo/audio) storage RLS so uploads are
      genuinely private + household-scoped (an earlier audit found live uploads
      denied and falling back to local).
- [ ] **[You]** Declare **"mixed audience"** on Google Play's Target Audience
      form (adults primary, appeals to children) — not "adults only" (a Kids'
      view ships) and not the Kids Category / Families program.

---

## 4. Backend deploy (see `docs/OPERATIONS.md`)

- [ ] **[You]** Apply Supabase migrations (`supabase db push`), including the two
      pending from PR #22 (RLS member hardening, default split-mode).
- [ ] **[You]** Enable the **Apple** auth provider in Supabase (or PR #22's Sign
      in with Apple button stays inert).
- [ ] **[You]** Deploy edge functions + set secrets (Stripe, Resend, cron) per
      OPERATIONS.md.
- [ ] **[Agent/You]** Regenerate `src/integrations/supabase/types.ts` from the
      live project (it's a placeholder — the source of most current `tsc` noise).

---

## 5. Store accounts, signing, listings

- [ ] **[You]** Apple Developer Program ($99/yr) + Google Play Developer ($25
      one-time).
- [ ] **[You]** Signing: iOS certs/provisioning profiles; Android upload
      keystore + Play App Signing.
- [ ] **[You]** Privacy policy URL + Apple App Privacy labels + Google Data
      Safety form — must disclose **PostHog** (analytics) and **Sentry**
      (diagnostics). Confirm no ad SDKs (there are none — state it).
- [ ] **[You]** Screenshots (proper device sizes), age-rating questionnaires,
      descriptions, and an App Review note explaining the family-utility purpose
      (heads off Guideline 4.1 / 4.2).

---

## 6. Pre-submit smoke test

- [ ] **[Agent]** On a real device: sign up → create household → award points
      (jar fills) → **claim reward and verify the jar/points actually reset**
      (an earlier audit found claim resets nothing) → post a memory → purchase
      via the store → delete account.
