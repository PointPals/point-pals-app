// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      // A fresh id per build (§2d): the service worker is registered with this
      // as a ?v= query, so its URL changes every deploy and returning users
      // pick up a new cache instead of stale assets.
      __PP_BUILD_ID__: JSON.stringify(String(Date.now())),
    },
    plugins: [
      sentryTanstackStart({
        org: "pointpals",
        project: "javascript-tanstackstart-react",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
  },
});
