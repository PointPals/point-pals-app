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

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

// bucket path helper — public objects live at /storage/v1/object/public/<bucket>/<path>
export function assetUrl(path: string): string | undefined {
  if (!SUPABASE_URL) return undefined;
  return `${SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
}

// Companion id → descriptive filename in the `assets` bucket. These match the
// mascot names in mock-data (COMPANIONS). Fill/adjust once the bucket is
// reachable and confirmed; leaving a companion out simply keeps the vector art.
export const COMPANION_FILES: Record<string, string> = {
  // sunny: "sunny.png",
  // bramble: "bramble.png",
  // pip: "pip.png",
  // ...
};

// Per-kid avatar override (kid.id → filename or URL). Empty by default.
export const AVATAR_MAP: Record<string, string> = {};

// Returns a real mascot image URL for a companion id, if wired.
export function companionArtUrl(companionId: string): string | undefined {
  const file = COMPANION_FILES[companionId];
  return file ? assetUrl(file) : undefined;
}

// Returns a real avatar image URL for a kid seed, if wired.
export function companionImageUrl(seed: string): string | undefined {
  const v = AVATAR_MAP[seed];
  if (!v) return undefined;
  return v.startsWith("http") ? v : assetUrl(v);
}
