// Billing client (§5) — thin wrapper over the Stripe Checkout + Customer Portal
// edge functions. No custom billing UI: Checkout handles purchase, the Portal
// handles card updates / cancellation / invoices.
//
// The edge function source lives in supabase/functions/{stripe-checkout,
// stripe-portal,stripe-webhook}. They are committed but not deployed here (the
// Supabase project isn't reachable from this environment); deploy with
// `supabase functions deploy` once it is.

import { supabase } from "@/integrations/supabase/client";
import { BILLING_CONFIG, type CurrencyCode } from "./entitlements";
import { isNativePlatform } from "./platform";
import { presentProPaywall, presentCustomerCenter } from "./revenuecat";

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

// Start a subscription for the household.
//   • Native (iOS/Android): present the RevenueCat Paywall (StoreKit / Play
//     Billing). Nothing to redirect to — the result comes back inline.
//   • Web/PWA: start Stripe Checkout and return a URL to redirect to.
export async function startCheckout(
  householdId: string,
  currency: CurrencyCode = BILLING_CONFIG.primaryCurrency,
): Promise<CheckoutResult> {
  if (await isNativePlatform()) {
    const outcome = await presentProPaywall(householdId);
    switch (outcome) {
      case "purchased":
      case "restored":
      case "already_entitled":
        return { native: true, activated: true };
      case "cancelled":
        return { native: true, activated: false };
      case "unavailable":
        return { native: true, activated: false, error: "In-app purchases aren't available." };
      default:
        return { native: true, activated: false, error: "Purchase could not be completed." };
    }
  }

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

// Open subscription self-service management.
//   • Native: RevenueCat Customer Center (manage / cancel / refunds).
//   • Web/PWA: the Stripe Customer Portal (returns a URL to redirect to).
export async function openPortal(householdId: string): Promise<CheckoutResult> {
  if (await isNativePlatform()) {
    const ok = await presentCustomerCenter(householdId);
    return { native: true, error: ok ? undefined : "Subscription management is unavailable." };
  }

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
