// Entitlement layer (§5).
//
// The exact pricing model is still being decided, so this is deliberately
// config-driven: switching between a one-off purchase, a monthly subscription,
// or a freemium free-tier-plus-paid-extras split is a change to BILLING_CONFIG
// and the `FEATURES` gate map below — not a rebuild. Screens ask
// `hasEntitlement(household, feature)`; they never hardcode a price or model.
//
// NZD is the primary currency; `CURRENCIES` is structured so more can be added
// later without touching call sites.

import type { Household } from "./app-store";

// ── RevenueCat (native iOS/Android IAP) ──────────────────────────────────────
// The entitlement identifier configured in the RevenueCat dashboard. A customer
// holding this entitlement is treated as subscribed on native, exactly like an
// active Stripe subscription on web. Must match the dashboard string EXACTLY.
export const RC_ENTITLEMENT_ID = "PointPals Pro";

// Product identifiers backing the entitlement, grouped in one Offering. These
// mirror the products created in App Store Connect / Play Console and attached
// to the RevenueCat Offering. The prebuilt Paywall reads them from the Offering
// at runtime — kept here only for reference / analytics, never hardcoded into
// purchase calls.
export const RC_PRODUCTS = {
  lifetime: "lifetime",
  yearly: "yearly",
  monthly: "monthly",
} as const;

export type BillingModel = "subscription" | "one_off" | "freemium";

export type CurrencyCode = "NZD" | "AUD" | "USD" | "GBP" | "EUR";

export type PriceConfig = {
  // Stripe Price ID per currency (filled from the Stripe dashboard / env).
  stripePriceId: Partial<Record<CurrencyCode, string>>;
  amountMinor: Partial<Record<CurrencyCode, number>>; // for display only
  interval?: "month" | "year";
};

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string }> = {
  NZD: { symbol: "$", label: "NZD" },
  AUD: { symbol: "$", label: "AUD" },
  USD: { symbol: "$", label: "USD" },
  GBP: { symbol: "£", label: "GBP" },
  EUR: { symbol: "€", label: "EUR" },
};

// Default scaffolding: a free trial, then a low monthly subscription in NZD
// (~$4–6) — the direction most consistent with sustaining ongoing AI-generation
// + hosting costs. Swappable: set `model` to "one_off" or "freemium" and adjust
// FEATURES.
export const BILLING_CONFIG: {
  model: BillingModel;
  primaryCurrency: CurrencyCode;
  trialDays: number;
  price: PriceConfig;
} = {
  model: "subscription",
  primaryCurrency: "NZD",
  trialDays: 14,
  price: {
    stripePriceId: {
      NZD: import.meta.env.VITE_STRIPE_PRICE_NZD ?? "",
      AUD: import.meta.env.VITE_STRIPE_PRICE_AUD ?? "",
      USD: import.meta.env.VITE_STRIPE_PRICE_USD ?? "",
    },
    amountMinor: { NZD: 500, AUD: 490, USD: 350 }, // display only — $5.00 NZD etc.
    interval: "month",
  },
};

// Feature → does it require an active entitlement? Flip these to reshape the
// free/paid boundary (e.g. for a freemium split) without touching screens.
export type Feature =
  | "icon_generation"
  | "award_points"
  | "unlimited_kids"
  | "advanced_recap"
  | "leaderboard"
  | "data_export";

const FEATURES: Record<Feature, { premium: boolean; freeTierLimit?: number }> = {
  // Free-tier features — available after trial too.
  icon_generation: { premium: false, freeTierLimit: 10 },
  leaderboard: { premium: false },
  data_export: { premium: false },
  // Premium features — require an active subscription.
  award_points: { premium: true },
  unlimited_kids: { premium: true, freeTierLimit: 2 },
  advanced_recap: { premium: true },
};

// A household is "entitled" while trialing or active.
export function isSubscribed(h: Pick<Household, "subscriptionStatus">): boolean {
  return h.subscriptionStatus === "active" || h.subscriptionStatus === "trialing";
}

export function trialDaysLeft(
  h: Pick<Household, "trialEndsAt" | "subscriptionStatus">,
): number | null {
  if (h.subscriptionStatus !== "trialing" || !h.trialEndsAt) return null;
  return Math.max(0, Math.ceil((h.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function hasEntitlement(
  h: Pick<Household, "subscriptionStatus" | "trialEndsAt">,
  feature: Feature,
): boolean {
  const cfg = FEATURES[feature];
  if (!cfg.premium) return true;
  return isSubscribed(h);
}

export function formatPrice(currency: CurrencyCode = BILLING_CONFIG.primaryCurrency): string {
  const minor = BILLING_CONFIG.price.amountMinor[currency];
  if (minor == null) return "";
  const { symbol, label } = CURRENCIES[currency];
  const major = (minor / 100).toFixed(2).replace(/\.00$/, "");
  const per = BILLING_CONFIG.price.interval ? `/${BILLING_CONFIG.price.interval}` : "";
  return `${symbol}${major} ${label}${per}`;
}
