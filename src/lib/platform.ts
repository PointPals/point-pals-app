/**
 * Platform detection for PointPals.
 *
 * Web/PWA uses Stripe.  Capacitor (iOS/Android) uses native IAP.
 * This module provides a single `isNative()` check so UI can gate
 * store-sensitive copy (e.g. "Secure checkout by Stripe") per platform.
 */

// Detect Capacitor at runtime.
// Capacitor sets `window.Capacitor` when running inside the WebView.
const _native = !!(globalThis as any).Capacitor?.isNativePlatform?.();

/** True when running inside the Capacitor WebView (iOS App Store / Play Store build). */
export function isNative(): boolean {
  return _native;
}

/**
 * True when running in a web browser PWA.
 * (Inverse of isNative().)
 */
export function isWeb(): boolean {
  return !_native;
}

export type Platform = "ios" | "android" | "web";

/**
 * Which platform we're on. Async so @capacitor/core is dynamically imported
 * and never lands in the SSR/server bundle; resolves to "web" in a plain
 * browser. Used by RevenueCat (billing) and the native OAuth deep-link flow.
 */
export async function getPlatform(): Promise<Platform> {
  if (typeof window === "undefined") return "web";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return "web";
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    // @capacitor/core unavailable (plain browser) — treat as web.
    return "web";
  }
}

export async function isNativePlatform(): Promise<boolean> {
  return (await getPlatform()) !== "web";
}
