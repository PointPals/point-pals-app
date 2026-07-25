// Billing client (§5) — platform-adaptive checkout.
//
// Web/PWA uses Stripe Checkout + Customer Portal edge functions.
// Native (iOS/Android Capacitor) uses RevenueCat Purchases SDK for
// StoreKit / Play Billing.
//
// The entitlement layer (hasEntitlement) is unified: both paths write
// to households.subscription_status, so the rest of the app doesn't
// need to know which platform it's on.

import { supabase } from "@/integrations/supabase/client";
import { BILLING_CONFIG, type CurrencyCode } from "./entitlements";
import { isNative } from "./platform";

// Lazy import — RevenueCat SDK is only available in the Capacitor build.
async function getPurchases() {
  // @revenuecat/purchases-capacitor is a Capacitor plugin; it's not
  // installed on web, so we dynamic-import so web doesn't crash on
  // a missing module.
  const mod = await import(/* @vite-ignore */ "@revenuecat/purchases-capacitor");
  return mod.Purchases;
}

export type CheckoutResult = {
  // Web: the Stripe URL to redirect to.
  url?: string;
  // Native: the purchase was handled in-app (RevenueCat) — no redirect. When
  // `activated` is true the entitlement is now live and the caller should
  // refresh household state; when false the user cancelled or it failed.
  native?: boolean;
  activated?: boolean;
  error?: string;
};

// Start checkout for the household.
// - Web: returns a Stripe Checkout URL to redirect to.
// - Native: initiates StoreKit/Play Billing purchase via RevenueCat.
export async function startCheckout(
  householdId: string,
  currency: CurrencyCode = BILLING_CONFIG.primaryCurrency,
): Promise<CheckoutResult> {
  // ── Native (RevenueCat) ──────────────────────────────────────────────
  if (isNative()) {
    try {
      const Purchases = await getPurchases();

      // Link the RevenueCat anonymous user to this household.
      // This means the RevenueCat webhook receives app_user_id = householdId
      // and can look up the household directly.
      const logInResult = await Purchases.logIn(householdId);

      // Start the purchase flow — RevenueCat shows the native modal.
      // We use getProducts to find the offering, then purchase it.
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current?.monthly?.product) {
        return { error: "No products available" };
      }

      const product = current.monthly;
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);

      // If successful, the RevenueCat webhook will update Supabase.
      // We optimistically update the local state here so the UI reflects
      // immediately.
      const entitlement = customerInfo.entitlements.active["premium"];
      if (entitlement) {
        // The webhook will fire soon; for now the caller should re-fetch
        // the household or we can return success.
        return {};
      }

      return { error: "Purchase completed but entitlement not active. Please wait a moment and refresh." };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Purchase failed";
      // RevenueCat throws on user cancellation — that's not an error.
      if (msg.includes("User cancelled") || msg.includes("CANCELLED")) {
        return { error: "Purchase cancelled" };
      }
      return { error: msg };
    }
  }

  // ── Web (Stripe) ─────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: {
        householdId,
        currency,
        model: BILLING_CONFIG.model,
        successUrl: `${origin()}/settings?checkout=success`,
        cancelUrl: `${origin()}/settings?checkout=cancelled`,
      },
    });
    if (error) return { error: error.message };
    return { url: (data as { url?: string })?.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Checkout unavailable" };
  }
}

// Open subscription management.
// - Web: Stripe Customer Portal URL.
// - Native: RevenueCat's manage subscription sheet (iOS shows App Store's
//   subscription management UI).
export async function openPortal(householdId: string): Promise<CheckoutResult> {
  // ── Native (RevenueCat) ──────────────────────────────────────────────
  if (isNative()) {
    try {
      const Purchases = await getPurchases();
      await Purchases.logIn(householdId);
      // iOS: opens the system subscription management sheet.
      // Android: opens Play Store subscription management.
      await Purchases.showManageSubscriptions();
      return {};
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Could not open subscription management" };
    }
  }

  // ── Web (Stripe) ─────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase.functions.invoke("stripe-portal", {
      body: { householdId, returnUrl: `${origin()}/settings` },
    });
    if (error) return { error: error.message };
    return { url: (data as { url?: string })?.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Portal unavailable" };
  }
}

function origin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}
