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
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

