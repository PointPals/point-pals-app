// Entitlement layer — free edition.
//
// PointPals used to gate some features behind a Stripe subscription with a
// free trial. The product is now completely free, so this module keeps the
// old call sites (`hasEntitlement`, `isSubscribed`) but always grants access.
// If paid extras ever return, reintroduce the config-driven gate here rather
// than spreading checks across screens.

import type { Household } from "./app-store";

export type Feature =
  | "icon_generation"
  | "award_points"
  | "unlimited_kids"
  | "advanced_recap"
  | "leaderboard"
  | "data_export";

// Every household has full access — PointPals is free.
export function isSubscribed(_h: Pick<Household, "subscriptionStatus">): boolean {
  return true;
}

export function hasEntitlement(
  _h: Pick<Household, "subscriptionStatus" | "trialEndsAt">,
  _feature: Feature,
): boolean {
  return true;
}
