// Billing client (§5) — Stripe Checkout + Customer Portal edge functions.

import { supabase } from "@/integrations/supabase/client";
import { BILLING_CONFIG, type CurrencyCode } from "./entitlements";

export type CheckoutResult = {
  url?: string;
  error?: string;
};

export async function startCheckout(
  householdId: string,
  currency: CurrencyCode = BILLING_CONFIG.primaryCurrency,
): Promise<CheckoutResult> {
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

export async function openPortal(householdId: string): Promise<CheckoutResult> {
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
