import { defineConfig, loadEnv } from "vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Inject VITE_* env vars — Vite normally only exposes them with the `vite`
  // prefix; TanStack Start uses import.meta.env in both client and server
  // builds, so we inject them manually for parity.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: {
      ...envDefine,
      // A fresh id per build: the service worker is registered with this
      // as a ?v= query, so its URL changes every deploy and returning users
      // pick up a new cache instead of stale assets.
      __PP_BUILD_ID__: JSON.stringify(String(Date.now())),
    },
    ...(isDevBuild
      ? {
          environments: {
            client: {
              define: { "process.env.NODE_ENV": JSON.stringify("development") },
            },
          },
        }
      : {}),
    // Match the build's CSS pipeline in dev. Vite uses PostCSS in dev and only
    // runs Lightning CSS at build, so build-time transforms (e.g. collapsing a
    // hand-written `-webkit-backdrop-filter` to the prefixed form Chrome ignores)
    // break the built/static output while the dev preview looks fine. Running
    // Lightning CSS in both keeps the preview honest.
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    // Dep re-optimization rotates the optimized-dep hash and 504s tabs holding
    // the old one; pre-bundle the always-present client deps + tolerate stale
    // requests. React core only — including @tanstack/react-start would pull its
    // node:async_hooks server entry into the client bundle and crash hydration.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: {
          entry: "server",
        },
      }),
      viteReact(),
      sentryTanstackStart({
        org: "pointpals",
        project: "javascript-tanstackstart-react",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
  };
});
