import type { CapacitorConfig } from '@capacitor/cli';

// Where the native WebView loads the app from.
//   • Local dev: set CAP_SERVER_URL to the Vite dev server (use your LAN IP,
//     e.g. http://192.168.1.20:8081, when running on a physical device).
//   • Production store builds: fall back to the live site — a "remote wrapper".
//     No offline support this way; to ship a fully-bundled/offline app instead,
//     build a static client into `capacitor-web` and delete the whole `server`
//     block so Capacitor serves the bundled files.
const devServerUrl = process.env.CAP_SERVER_URL;

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
