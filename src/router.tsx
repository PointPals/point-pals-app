// Client-only Sentry init — imported via lazy dynamic import so TanStack Start's
// import-protection plugin doesn't reject it during the SSR build.
// This runs synchronously on first import because instrument.client.ts wraps
// browser-only code in `typeof window !== "undefined"`.
// Import client-only Sentry init. Safe to call on both client and server because
// instrument-init.ts wraps browser-only code in `typeof window !== "undefined"`.
import "./instrument-init";

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import * as Sentry from "@sentry/tanstackstart-react";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Sentry browser tracing for TanStack Router navigation
  if (!router.isServer) {
    Sentry.addIntegration(
      Sentry.tanstackRouterBrowserTracingIntegration(router),
    );
  }

  return router;
};
