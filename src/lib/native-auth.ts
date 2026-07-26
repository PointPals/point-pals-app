// OAuth sign-in that works on BOTH web and the Capacitor native app.
//
// Web: signInWithOAuth does its normal full-page redirect to the provider and
// back to window.location.origin.
//
// Native (Capacitor): a full-page redirect can't come back to the app, so we
//   1. ask Supabase for the provider URL but skip the auto-redirect,
//   2. open that URL in the system browser (Custom Tab / SafariVC),
//   3. let the provider bounce back to the `pointpals://callback` deep link,
//   4. catch that deep link (see initAuthDeepLinks) and exchange the PKCE code
//      for a session in this same webview (which still holds the code_verifier).
//
// The Android intent-filter (android/app/src/main/AndroidManifest.xml) and the
// iOS URL scheme (capacitor.config.ts `ios.scheme`) already register the
// `pointpals://` scheme. The redirect URL must ALSO be allow-listed in the
// Supabase dashboard → Authentication → URL Configuration → Redirect URLs,
// otherwise Supabase ignores it and falls back to the Site URL (the loop).

import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform } from "./platform";

export const NATIVE_AUTH_REDIRECT = "pointpals://callback";

type Provider = "google" | "apple";

/** Start an OAuth sign-in. Returns an error string if the flow couldn't start. */
export async function oauthSignIn(provider: Provider): Promise<{ error?: string }> {
  const native = await isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Web keeps the trailing slash so it matches the Supabase "https://…/**"
      // allow-list; native uses the custom-scheme deep link.
      redirectTo: native ? NATIVE_AUTH_REDIRECT : window.location.origin + "/",
      // On native we must handle the redirect ourselves in the system browser.
      skipBrowserRedirect: native,
    },
  });
  if (error) return { error: error.message };

  if (native && data?.url) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't open the sign-in page." };
    }
  }
  // Web: signInWithOAuth already performed the full-page redirect.
  return {};
}

/**
 * Register the native deep-link listener that completes an OAuth sign-in when
 * the provider bounces back to `pointpals://callback`. No-op on web. Returns a
 * cleanup function. `onSignedIn` runs after a session is established.
 */
export async function initAuthDeepLinks(onSignedIn: () => void): Promise<() => void> {
  if (!(await isNativePlatform())) return () => {};

  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith(NATIVE_AUTH_REDIRECT)) return;
    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        // PKCE (Supabase default): exchange the code for a session.
        await supabase.auth.exchangeCodeForSession(code);
      } else if (parsed.hash) {
        // Implicit fallback: tokens in the URL fragment.
        const hp = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const access_token = hp.get("access_token");
        const refresh_token = hp.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    } catch (e) {
      console.error("[pointpals] OAuth callback exchange failed", e);
    }
    // Close the system browser tab and continue into the app.
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
    } catch {
      /* no browser tab open — ignore */
    }
    onSignedIn();
  });

  return () => {
    void handle.remove();
  };
}
