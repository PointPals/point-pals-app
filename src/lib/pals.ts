/**
 * The Pals — PointPals' character cast (v2, "plush line").
 *
 * Six characters, each championing one family value. Designed together as a
 * manufacturable plush family: one shared embroidered face system, a body
 * built from a single sewable base pattern, and ONE signature appendage each
 * (ears / crest / antennae / sprout / gills) so every Pal reads instantly as a
 * silhouette — from across a room, on a 40 px avatar, or on a shop shelf.
 *
 * Back-compat: kids saved before the redesign store an old companion id
 * (sunny, pip, bramble, …) in `kids.avatar_key`. `resolvePalId()` maps every
 * legacy id onto its closest new Pal, so existing families see the new cast
 * with no database migration. New picks store the new id.
 */

import type { PastelKey } from "./mock-data";

export type PalId = "lumi" | "tumble" | "ember" | "orbit" | "moss" | "ripple";

export type PalMood = "idle" | "happy" | "wow" | "sleepy";

export type PalDef = {
  id: PalId;
  name: string;
  /** The family value this Pal champions. */
  value: string;
  /** Kid-facing one-liner (reads well aloud to a 5-year-old). */
  tagline: string;
  /** Parent-facing two-sentence bio. */
  bio: string;
  /** Main body colour (minky plush fabric). */
  color: string;
  /** Deeper shade — appendages, underside, stitch lines. */
  shade: string;
  /** Pale tint — belly patch, inner ears, soft backgrounds. */
  tint: string;
  /** Accent used for a single contrasting detail (bobbles, gills, motif). */
  accent: string;
  /** Nearest legacy kid colour key — drives marble tint for this Pal. */
  pastelKey: PastelKey;
  /** Belly embroidery motif, in words (for the plush spec + alt text). */
  motif: string;
  /** Plush silhouette summary, in words. */
  silhouette: string;
  /** Old companion ids that now resolve to this Pal. */
  legacyIds: string[];
};

export const PALS: PalDef[] = [
  {
    id: "lumi",
    name: "Lumi",
    value: "Kindness",
    tagline: "A kind thing makes the whole jar glow.",
    bio: "Lumi notices when someone needs a hand before they ask. Those long ears hear everything — especially a thank-you.",
    color: "#A57BF0",
    shade: "#7C56D3",
    tint: "#EEE5FF",
    accent: "#F27DAE",
    pastelKey: "lilac",
    motif: "Embroidered heart with three short glow rays",
    silhouette: "Soft pear body with two long floppy ears",
    legacyIds: ["sunny"],
  },
  {
    id: "tumble",
    name: "Tumble",
    value: "Teamwork",
    tagline: "The jar fills faster when we all pitch in.",
    bio: "Tumble is happiest in the middle of a family pile-up. Round, warm and always first to say 'let's do it together'.",
    color: "#F5B841",
    shade: "#D8930F",
    tint: "#FFF2D1",
    accent: "#5B7CFA",
    pastelKey: "butter",
    motif: "Three linked marbles",
    silhouette: "Wide round dumpling with little bear ears and stubby arms",
    legacyIds: ["marlow"],
  },
  {
    id: "ember",
    name: "Ember",
    value: "Courage",
    tagline: "Hard things get easier every time you try.",
    bio: "Ember's crest puffs up whenever something feels big and scary — then Ember tries anyway. Brave isn't 'not scared'.",
    color: "#FF7F5C",
    shade: "#E0573A",
    tint: "#FFE4DA",
    accent: "#F5B841",
    pastelKey: "orange",
    motif: "Little flame",
    silhouette: "Upright egg with a three-bump soft crest and a short tail",
    legacyIds: ["ridge", "bramble"],
  },
  {
    id: "orbit",
    name: "Orbit",
    value: "Curiosity",
    tagline: "Every question is a tiny adventure.",
    bio: "Orbit's antennae wiggle at anything new — a bug, a book, a 'why?'. Learning is just being curious on purpose.",
    color: "#5B7CFA",
    shade: "#3E5AD8",
    tint: "#E2E8FF",
    accent: "#F5B841",
    pastelKey: "sky",
    motif: "Ringed planet",
    silhouette: "Round ball body with two bobble antennae",
    legacyIds: ["pip", "ziggy"],
  },
  {
    id: "moss",
    name: "Moss",
    value: "Little habits",
    tagline: "Small things, every day, grow big.",
    bio: "Moss started as a seed and grew one tiny step at a time. Brush, tidy, water the plants — little habits, big Pal.",
    color: "#3DBE8B",
    shade: "#23986A",
    tint: "#DBF5E9",
    accent: "#F5B841",
    pastelKey: "sage",
    motif: "Leaf with a centre vein",
    silhouette: "Gumdrop body with a two-leaf sprout on top",
    legacyIds: ["fern"],
  },
  {
    id: "ripple",
    name: "Ripple",
    value: "Calm",
    tagline: "Big feelings pass like waves. Breathe with me.",
    bio: "When things get loud, Ripple floats. Slow breath in, slow breath out — then try again. Calm is a superpower.",
    color: "#39C3D8",
    shade: "#1E9CB2",
    tint: "#DAF5F9",
    accent: "#F27DAE",
    pastelKey: "foam",
    motif: "Two rolling waves",
    silhouette: "Low, wide axolotl body with frilly gill fronds each side",
    legacyIds: ["coda"],
  },
];

const BY_ID = new Map<string, PalDef>(PALS.map((p) => [p.id, p]));
for (const p of PALS) for (const legacy of p.legacyIds) BY_ID.set(legacy, p);

/** Deterministic fallback so unknown/missing ids still get a stable Pal. */
function hashToPal(seed: string): PalDef {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return PALS[Math.abs(h) % PALS.length];
}

/**
 * Resolve any stored companion id (new or legacy) to a Pal. Unknown or empty
 * ids fall back to a stable hash of `seed` (usually the kid id) so a child's
 * Pal never flickers between renders.
 */
export function resolvePal(id: string | null | undefined, seed = "pointpals"): PalDef {
  if (id) {
    const hit = BY_ID.get(id.toLowerCase());
    if (hit) return hit;
  }
  return hashToPal(id || seed);
}

export function resolvePalId(id: string | null | undefined, seed?: string): PalId {
  return resolvePal(id, seed).id;
}

export function isPalId(id: string | null | undefined): id is PalId {
  return !!id && PALS.some((p) => p.id === id);
}
