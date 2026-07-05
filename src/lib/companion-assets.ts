// Companion mascot asset resolver — the single seam for wiring the real
// AI-generated mascot art (§0).
//
// The descriptive-named files (e.g. `sunny.png`, `bramble.png`) live in the
// Supabase Storage `assets` bucket. In this build environment that project is
// not network-reachable, so we cannot enumerate the bucket. Rather than ship
// broken <img> refs, this resolver returns `undefined` and callers fall back to
// the vector companion, EXCEPT where a real mapping has been provided below.
//
// To go live, populate COMPANION_FILES with the actual bucket filenames per
// companion/kid, or point AVATAR_MAP at real URLs. Nothing else changes.

// Companion mascot art — plush toy illustrations served from the Lovable
// CDN via .asset.json pointers (generated locally, uploaded to R2).
import sunnyAsset from "@/assets/companions/sunny.png.asset.json";
import brambleAsset from "@/assets/companions/bramble.png.asset.json";
import pipAsset from "@/assets/companions/pip.png.asset.json";
import marlowAsset from "@/assets/companions/marlow.png.asset.json";
import codaAsset from "@/assets/companions/coda.png.asset.json";
import fernAsset from "@/assets/companions/fern.png.asset.json";
import ziggyAsset from "@/assets/companions/ziggy.png.asset.json";
import ridgeAsset from "@/assets/companions/ridge.png.asset.json";

const COMPANION_URLS: Record<string, string> = {
  sunny: sunnyAsset.url,
  bramble: brambleAsset.url,
  pip: pipAsset.url,
  marlow: marlowAsset.url,
  coda: codaAsset.url,
  fern: fernAsset.url,
  ziggy: ziggyAsset.url,
  ridge: ridgeAsset.url,
};

// Returns the real mascot image URL for a companion id.
export function companionArtUrl(companionId: string): string | undefined {
  return COMPANION_URLS[companionId];
}

// Per-kid avatar override (kid.id → companion id or URL). Empty by default;
// kids without an override render the vector companion face.
export const AVATAR_MAP: Record<string, string> = {};

export function companionImageUrl(seed: string): string | undefined {
  const v = AVATAR_MAP[seed];
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return COMPANION_URLS[v];
}
