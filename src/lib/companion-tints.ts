/**
 * companion-tints.ts —  Companion-to-marble-tint mapping.
 *
 * Every PointPals companion (mascot) has an associated marble colour drawn
 * from the MARBLE_TINT palette used by the <MarbleJar> canvas.  The mapping
 * below is the canonical source of truth: both the welcome page mascot parade
 * and the real family jar look up a kid's companionId here to decide the
 * colour of their marbles.
 *
 * The values match "The Mascots' Colour Story" blog post.  Where a
 * companion's `.color` field in mock-data differs from the colour story
 * (e.g. Ziggy is `sand` in data but `lilac` in the story), this map takes
 * precedence.  Unlisted companions fall back to their `.color` field.
 */

import type { PastelKey } from "./mock-data";

/**
 * Canonical tint key for each companion ID.
 */
export const COMPANION_TINT_MAP: Partial<Record<string, PastelKey>> = {
  sunny: "butter",
  pip: "sky",
  bramble: "sage",
  ziggy: "lilac",
  ridge: "foam",
  coda: "lilac",
  fern: "sage",
  marlow: "blush",
};

/**
 * Quick visual reference — hex colours for the tint key so callers
 * (e.g. WalkingMascots bubble badges) don't need to import MARBLE_TINT.
 */
export const TINT_HEX: Record<PastelKey, string> = {
  sky: "#8FC7EA",
  butter: "#F1D36A",
  sage: "#9CD08C",
  blush: "#EDA6B2",
  lilac: "#B79BE0",
  sand: "#E0B673",
  foam: "#84CFCB",
  orange: "#F0A858",
};

/**
 * Resolve a companion's marble tint key.  Returns the companion's colour
 * story tint when known, otherwise the supplied fallback.
 */
export function companionTintKey(
  companionId: string | undefined | null,
  fallback: PastelKey = "sand",
): PastelKey {
  if (!companionId) return fallback;
  return COMPANION_TINT_MAP[companionId] ?? fallback;
}
