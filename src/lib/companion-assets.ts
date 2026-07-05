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

// Companion mascot art — real AI-generated plush illustrations, served from
// the Lovable CDN via .asset.json pointers.
import { SUPABASE_ASSET_BASE } from "./mock-data";

// Real mascot art served from the Supabase Storage `assets` bucket.
const COMPANION_URLS: Record<string, string> = {
  sunny: `${SUPABASE_ASSET_BASE}/Sunny.png`,
  bramble: `${SUPABASE_ASSET_BASE}/Bramble.png`,
  pip: `${SUPABASE_ASSET_BASE}/Pip.png`,
  marlow: `${SUPABASE_ASSET_BASE}/Marlow.png`,
  coda: `${SUPABASE_ASSET_BASE}/Coda.png`,
  fern: `${SUPABASE_ASSET_BASE}/Fern.png`,
  ziggy: `${SUPABASE_ASSET_BASE}/Ziggy.png`,
  ridge: `${SUPABASE_ASSET_BASE}/Ridge.png`,
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
