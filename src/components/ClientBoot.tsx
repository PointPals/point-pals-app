import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { initMonitoring } from "@/lib/monitoring";
import { getSettings, setSetting } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import { configureRevenueCat } from "@/lib/revenuecat";

const PUBLIC_PATHS = new Set([
  "/welcome",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/join",
  "/about",
  "/faq",
  "/blog",
  "/privacy",
  "/terms",
  "/refunds",
  "/contact",
]);

// Paths that a signed-in user without a household is allowed to see. Anything
// else in the authed area bounces to /welcome-back so they can create or join
// one before the app-store tries to hydrate empty state.
const NO_HOUSEHOLD_ALLOWED = new Set([
  "/welcome-back",
  "/join",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/settings",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_PATHS) if (pathname.startsWith(p + "/")) return true;
  return false;
}

// Client-only boot tasks (runs once, after hydration):
//  - register the service worker for offline/PWA (§8)
//  - initialise error monitoring (no-op unless configured; PII-scrubbed) (§7)
//  - honour the OS "reduce motion" preference the first time we see it
// Renders nothing.
export function ClientBoot() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { needsHousehold, mode, household } = useApp();

  useEffect(() => {
    void initMonitoring();

    // Adopt the OS reduced-motion preference unless the user already chose.
    try {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced && !getSettings().reducedMotion) {
        setSetting("reducedMotion", true);
      }
    } catch {
      /* matchMedia unavailable — ignore */
    }

    // Register the service worker (production only; dev SW caching is noisy).
    // The ?v=<build id> makes the SW URL change every deploy so returning users
    // get the new cache instead of stale assets (§2d).
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      const buildId = typeof __PP_BUILD_ID__ !== "undefined" ? __PP_BUILD_ID__ : "1";
      navigator.serviceWorker.register(`/sw.js?v=${buildId}`).catch(() => {
        /* registration failed — app still works online */
      });
    }
  }, []);

  // Auth redirects are handled by the `_authenticated/` layout's beforeLoad.
  // Here we only listen for explicit SIGNED_OUT to push the user back to /welcome
  // even from a public page that shouldn't feel "still logged in".
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublic(pathname)) {
        navigate({ to: "/welcome" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, navigate]);

  // Configure RevenueCat (native only) once we know the household, so the store
  // paywall, entitlement checks and restore are ready. No-op on web.
  useEffect(() => {
    if (household?.id) void configureRevenueCat(household.id);
  }, [household?.id]);

  // Bounce authed-but-no-household users to the "create or join" chooser.
  useEffect(() => {
    if (!needsHousehold) return;
    if (mode === "live") return; // already in a household
    if (NO_HOUSEHOLD_ALLOWED.has(pathname)) return;
    if (isPublic(pathname)) return;
    navigate({ to: "/welcome-back" });
  }, [needsHousehold, mode, pathname, navigate]);

  return null;
}
