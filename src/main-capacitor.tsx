/**
 * Capacitor SPA entry point.
 *
 * This is a pure client-side build target for the native mobile app.
 * It uses TanStack Router's <RouterProvider> directly (no SSR / Nitro).
 * Server functions (sendTrialWelcome, submitContactForm) are replaced with
 * the capacitor-compat shim that calls the deployed SSR server over HTTPS.
 */
import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Instrument once (browser-only, no Sentry — avoids TanStack Start deps)
import "./instrument-capacitor";

// ── Router ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

// Type-safe route registration for TanStack Router
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── Mount ────────────────────────────────────────────────────────────────
const rootElement = document.getElementById("root")!;

// Use startTransition so concurrent rendering doesn't block the main thread
// on first paint — important on mobile.
startTransition(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
