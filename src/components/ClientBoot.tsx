import { useEffect } from "react";
import { initMonitoring } from "@/lib/monitoring";
import { getSettings, setSetting } from "@/lib/settings";

// Client-only boot tasks (runs once, after hydration):
//  - register the service worker for offline/PWA (§8)
//  - initialise error monitoring (no-op unless configured; PII-scrubbed) (§7)
//  - honour the OS "reduce motion" preference the first time we see it
// Renders nothing.
export function ClientBoot() {
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
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failed — app still works online */
      });
    }
  }, []);

  return null;
}
