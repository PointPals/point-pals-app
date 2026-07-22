// Runtime platform detection for the web ⇄ native split.
//
// PointPals ships as a web/PWA (served over HTTPS) AND as a Capacitor-wrapped
// native app on iOS/Android. A few flows differ by platform — most importantly
// billing: web/PWA uses Stripe, native must use StoreKit / Play Billing via
// RevenueCat (see billing.ts / revenuecat.ts).
//
// @capacitor/core is dynamically imported so it never lands in the SSR/server
// bundle. On the web it resolves to "web" and every native code path no-ops.

export type Platform = "ios" | "android" | "web";

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
