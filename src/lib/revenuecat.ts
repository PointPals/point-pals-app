// RevenueCat client — the NATIVE (iOS/Android) in-app purchase path.
//
// Why this exists: Apple (StoreKit) and Google (Play Billing) require digital
// subscriptions sold inside a native app to go through their own billing.
// Stripe web checkout is rejected in native builds. RevenueCat wraps both
// stores behind one SDK, validates receipts, and exposes a single
// "PointPals Pro" entitlement.
//
// It does NOT avoid the 15–30% store commission — money still flows through
// Apple/Google. The web/PWA build keeps using Stripe (no store tax there);
// billing.ts routes to the right one by platform.
//
// Everything here is a NO-OP on web: the native SDK is only ever dynamically
// imported after we've confirmed we're running inside Capacitor, so the
// browser/SSR bundle never loads it. None of this can be exercised until:
//   1. a real device build exists (Capacitor must load a bundled web app, not
//      the localhost dev server), and
//   2. the products, the "PointPals Pro" entitlement, an Offering and a Paywall
//      are configured in the RevenueCat dashboard + App Store Connect + Play
//      Console.

import { getPlatform } from "./platform";
import { RC_ENTITLEMENT_ID } from "./entitlements";

// Public SDK keys — safe to ship in the client, one per store. Paste the real
// values (from RevenueCat → Project → API keys → "Public app-specific") into
// the env vars. These are NOT the Stripe/secret keys and NOT the sample
// `test_…` key from the docs.
const RC_IOS_KEY = import.meta.env.VITE_RC_IOS_KEY ?? "";
const RC_ANDROID_KEY = import.meta.env.VITE_RC_ANDROID_KEY ?? "";

// The RevenueCat "app user id" we configure with is the household id, so a
// single subscription unlocks the whole household across every parent/device.
let configuredForHousehold: string | null = null;

/**
 * Configure the SDK once per household. Returns false (no-op) on web, when a
 * platform key is missing, or on any SDK error — callers treat false as
 * "native purchasing unavailable, fall back / show nothing".
 */
export async function configureRevenueCat(householdId: string): Promise<boolean> {
  const platform = await getPlatform();
  if (platform === "web") return false;

  const apiKey = platform === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      `[revenuecat] No ${platform} SDK key (VITE_RC_${platform.toUpperCase()}_KEY) — skipping.`,
    );
    return false;
  }
  if (configuredForHousehold === householdId) return true;

  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    await Purchases.configure({ apiKey, appUserID: householdId });
    configuredForHousehold = householdId;
    return true;
  } catch (e) {
    console.error("[revenuecat] configure failed:", e);
    return false;
  }
}

export type PaywallOutcome =
  | "purchased" // user completed a purchase
  | "restored" // user restored an existing purchase
  | "already_entitled" // paywall skipped — already has PointPals Pro
  | "cancelled" // user dismissed without buying
  | "unavailable" // web / not configured
  | "error";

/**
 * Present RevenueCat's prebuilt Paywall for the "PointPals Pro" entitlement.
 * Uses `presentPaywallIfNeeded`, so an already-entitled user isn't shown the
 * wall. The Paywall pulls its products (Lifetime / Yearly / Monthly) from the
 * current Offering configured in the dashboard — we never hardcode product ids
 * in the UI, which is the recommended modern approach.
 */
export async function presentProPaywall(householdId: string): Promise<PaywallOutcome> {
  if (!(await configureRevenueCat(householdId))) return "unavailable";
  try {
    const { RevenueCatUI, PAYWALL_RESULT } = await import("@revenuecat/purchases-capacitor-ui");
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: RC_ENTITLEMENT_ID,
    });
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        return "purchased";
      case PAYWALL_RESULT.RESTORED:
        return "restored";
      case PAYWALL_RESULT.NOT_PRESENTED:
        return "already_entitled";
      case PAYWALL_RESULT.CANCELLED:
        return "cancelled";
      default:
        return "error";
    }
  } catch (e) {
    console.error("[revenuecat] presentPaywall failed:", e);
    return "error";
  }
}

/** True if the customer currently holds the PointPals Pro entitlement. */
export async function hasProEntitlement(householdId: string): Promise<boolean> {
  if (!(await configureRevenueCat(householdId))) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
  } catch (e) {
    console.error("[revenuecat] getCustomerInfo failed:", e);
    return false;
  }
}

/** Restore prior purchases (e.g. new device / reinstall). Returns entitlement state. */
export async function restorePurchases(householdId: string): Promise<boolean> {
  if (!(await configureRevenueCat(householdId))) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    return Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
  } catch (e) {
    console.error("[revenuecat] restorePurchases failed:", e);
    return false;
  }
}

/**
 * Present RevenueCat's Customer Center — the native self-service screen for
 * managing / cancelling a subscription and handling refunds. This is the
 * native replacement for the Stripe Customer Portal.
 */
export async function presentCustomerCenter(householdId: string): Promise<boolean> {
  if (!(await configureRevenueCat(householdId))) return false;
  try {
    const { RevenueCatUI } = await import("@revenuecat/purchases-capacitor-ui");
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch (e) {
    console.error("[revenuecat] presentCustomerCenter failed:", e);
    return false;
  }
}
