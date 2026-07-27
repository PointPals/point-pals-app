# Capacitor (native iOS / Android) architecture

## The one thing to know

**The native app is a remote wrapper.** `capacitor.config.ts` sets:

```ts
server: { url: 'https://pointpals.co.nz' }
```

so the WebView loads the **live site** — the exact same code as the tested
web/PWA build. The native shell adds what the web can't do on its own: store
IAP (RevenueCat), OAuth deep links, haptics, the launcher icon.

### Why this matters

There are **two** possible web payloads in this repo:

| | Built by | Entry | Used when |
|---|---|---|---|
| **Web / PWA** (the tested one) | `vite.config.ts`, TanStack Start + SSR | `src/routes/__root.tsx` | always on the web; in the app via `server.url` |
| **Bundled SPA** (fallback) | `vite.capacitor.ts` | `src/main-capacitor.tsx` | only if the `server` block is removed |

The bundled SPA is a **second, far less-tested code path**. It stubs out
TanStack Start modules (`src/capacitor-noop.ts` exports nothing), has no SSR,
and diverges from what every hour of manual testing has been spent on.

### This has already gone wrong twice

The `server` block was dropped in merge `b011174`. Every store build after it
silently shipped the bundled SPA, and testers hit a string of native-only bugs
that never reproduced in a mobile browser:

- the Points page icon grid stuck on "Loading custom icons…" with blank tiles
- text inputs (e.g. the reward name on Rewards) not accepting typing
- scrolling stalling part-way down a page, then freezing
- marble jar physics freezing mid-animation, marbles left floating
- a point award briefly adding more marbles than it should

Commit `f351870` had already restored the block once before. **If the app is
mysteriously broken but the website is fine, check this block first.**

## Trade-offs of the remote wrapper

- ✅ The app is always the tested code, and **web deploys reach users instantly**
  — no rebuild + store review for content or bug fixes.
- ✅ One code path to reason about and support.
- ❌ **Requires a network connection** — there is no offline mode.
- ⚠️ Apple review (guideline 4.2, "minimum functionality") is stricter about
  wrapper apps than Google Play. The native IAP, deep links and haptics help;
  revisit if an iOS submission is rejected.

Going fully offline/bundled is a **deliberate architecture change**: it means
owning the bundled SPA as a first-class, tested target — not just deleting the
`server` block.

## Plugins

`CapacitorHttp` and `CapacitorCookies` are deliberately **disabled**.
`CapacitorHttp` patches the WebView's `fetch`/`XHR` and cross-origin resource
loading to route through native HTTP, which broke Supabase queries and Storage
image loads on native only. Supabase auth uses `localStorage`, not cookies, so
`CapacitorCookies` isn't needed.

Audited and safe to leave off: every outbound call goes to Supabase or PostHog
(both send CORS headers), RevenueCat talks over its own **native** plugin rather
than WebView `fetch`, and nothing in the app uses `credentials: 'include'` or
cross-domain cookies.

## Build & release

```bash
npm install
npm run cap:build      # vite build (capacitor) + npx cap sync
npx cap open android   # → Build → Generate Signed Bundle (.aab) → Play Console
```

`cap sync` (not `cap copy`) is required so native plugin changes are wired into
the Android/iOS projects.

Because this is a remote wrapper, a **new AAB is only needed for native-shell
changes** — the config, plugins, launcher icon, or app permissions. Everything
in the app's UI and logic ships with a normal Vercel deploy.

## Deep links

Supabase OAuth returns to `pointpals://callback`, handled in
`src/lib/native-auth.ts`. The Android intent-filter lives in
`android/app/src/main/AndroidManifest.xml`; iOS uses `ios.scheme`. The redirect
URL must also be allow-listed in **Supabase → Authentication → URL
Configuration → Redirect URLs**, or auth silently falls back to the Site URL and
loops.
