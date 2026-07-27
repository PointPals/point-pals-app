import type { CapacitorConfig } from '@capacitor/cli';

// Where the native WebView loads the app from.
//   • Local dev: set CAP_SERVER_URL to the Vite dev server (use your LAN IP,
//     e.g. http://192.168.1.20:8081, when running on a physical device).
//   • Production store builds: the live site — a "remote wrapper". The native
//     app then runs the SAME code as the tested web/PWA build.
//
// ⚠️  Do NOT drop this `server` block. Without it Capacitor serves the bundled
// `capacitor-web` SPA (vite.capacitor.ts → main-capacitor.tsx), which is a
// SECOND, far less-tested code path than the web app. It was lost once in a
// merge (b011174) and the store builds that followed were glitchy — icons never
// loading, inputs not accepting text, scrolling stalling, marble physics
// freezing mid-animation — none of which reproduce in the mobile browser.
// Removing it is a deliberate architecture change (offline support), not a
// cleanup: see docs/CAPACITOR.md before touching it.
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'nz.co.pointpals.app',
  appName: 'PointPals',
  webDir: 'capacitor-web',

  server: {
    url: devServerUrl ?? 'https://pointpals.co.nz',
    cleartext: Boolean(devServerUrl),
  },

  // ── Deep links (Supabase PKCE auth callback) ───────────────────────────────
  // After sign-in the Supabase redirect URI bounces back to:
  //   pointpals://callback#access_token=...
  // Capacitor intercepts this via android:launchMode / custom scheme on iOS.
  // ────────────────────────────────────────────────────────────────────────────
  android: {
    // Required so the auth redirect returns to the same activity instance.
    launchMode: 'singleTask',
  },
  ios: {
    // Tells iOS to treat pointpals:// callbacks as belonging to our app.
    scheme: 'pointpals',
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  // CapacitorHttp / CapacitorCookies are intentionally DISABLED. CapacitorHttp
  // patches the WebView's fetch/XHR (and cross-origin resource loads) to route
  // through native HTTP, which broke Supabase queries and Storage image loads
  // on native only — the Points page icon grid stuck on "Loading custom icons…"
  // with blank tiles, even though the same pages load fine in a mobile browser.
  // Letting the WebView do its own networking matches the working browser
  // behaviour. Supabase auth uses localStorage, not cookies, so CapacitorCookies
  // isn't needed either.
  plugins: {
    CapacitorCookies: {
      enabled: false,
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
