import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nz.co.pointpals.app',
  appName: 'PointPals',
  webDir: 'capacitor-web',

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
