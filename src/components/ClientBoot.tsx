import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { initMonitoring } from "@/lib/monitoring";
import { getSettings, setSetting } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_PATHS = new Set([
  "/welcome",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/about",
  "/privacy",
  "/terms",
  "/refunds",
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

  // Auth guard: redirect unauthenticated users to /welcome for private routes.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const authed = !!data.session;
      if (!authed && !isPublic(pathname)) {
        navigate({ to: "/welcome" });
      }
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate({ to: "/welcome" });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname, navigate]);

  return null;
}
