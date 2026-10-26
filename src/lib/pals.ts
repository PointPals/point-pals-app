/**
 * The Pals — PointPals' character cast.
 *
 * Eight characters, each championing one family value. The source of truth
 * for names, traits, motifs and quotes is COMPANIONS in mock-data (what
 * kids' `avatar_key` stores); this module layers on the presentation details
 * the marketing site and app chrome need — body colours for washes and
 * marbles, a short bio, and a silhouette note.
 *
 * Art: each Pal is a finished illustration (COMPANION_URLS), rendered by
 * <Pal>. Colours below are sampled from that art.
 */

import { COMPANIONS, type PastelKey } from "./mock-data";

export type PalId = "sunny" | "pip" | "bramble" | "ziggy" | "ridge" | "coda" | "fern" | "marlow";

export type PalMood = "idle" | "happy" | "wow" | "sleepy";

export type PalDef = {
  id: PalId;
  name: string;
  /** The family value this Pal champions. */
  value: string;
  /** Kid-facing one-liner (the companion's quote). */
  tagline: string;
  /** Parent-facing short bio. */
  bio: string;
  /** Main body colour, sampled from the art. */
  color: string;
  /** Deeper shade of the body colour. */
  shade: string;
  /** Pale tint — washes and soft backgrounds. */
  tint: string;
  /** The contrasting detail colour in the art (motif, hair, hands…). */
  accent: string;
  /** Kid colour key the companion maps to (marble tint, avatar circle). */
  pastelKey: PastelKey;
  /** Chest motif, in words. */
  motif: string;
  /** Silhouette summary, in words. */
  silhouette: string;
};

type Look = Omit<PalDef, "id" | "name" | "value" | "tagline" | "pastelKey" | "motif">;

const LOOK: Record<PalId, Look> = {
  sunny: {
    bio: "Sunny spots a kind moment from across the room — and glows about it for the rest of the day.",
    color: "#F3D375",
    shade: "#D9AE45",
    tint: "#FFF4CF",
    accent: "#F08A8A",
    silhouette: "Round honey bear with little ears",
  },
  pip: {
    bio: "Pip always has a book open and a question ready. Learning is just being curious, one page at a time.",
    color: "#8FC7EA",
    shade: "#5D9FD1",
    tint: "#E3F2FC",
    accent: "#9B6B4A",
    silhouette: "Round blue friend with bobble antennae",
  },
  bramble: {
    bio: "Bramble sets a goal, does the next small thing, and collects a star for every one finished.",
    color: "#9CD08C",
    shade: "#6EAE5E",
    tint: "#E4F4DE",
    accent: "#F1C24B",
    silhouette: "Round green sprout with a two-leaf shoot",
  },
  ziggy: {
    bio: "Ziggy's head is full of swirls and ideas. Every creative mess is a wonderful thing on its way.",
    color: "#D8B48A",
    shade: "#B48A5D",
    tint: "#F6E9D8",
    accent: "#B79BE0",
    silhouette: "Cosy round body with a cloud of purple curls",
  },
  ridge: {
    bio: "Ridge doesn't climb the mountain all at once — just the next step, and then the next.",
    color: "#55698B",
    shade: "#36465F",
    tint: "#DFE5EF",
    accent: "#E9EEF5",
    silhouette: "Sturdy navy body with snow-capped mountain peaks",
  },
  coda: {
    bio: "Coda loves doing it 'all by myself' — one brave step at a time, golden footprint first.",
    color: "#B79BE0",
    shade: "#8E6CC9",
    tint: "#EFE7FB",
    accent: "#F1C24B",
    silhouette: "Round lilac body with a bold magenta tuft",
  },
  fern: {
    bio: "Fern knows every leaf started as a bud. Little habits, every day, grow into big ones.",
    color: "#84CFCB",
    shade: "#55AFAA",
    tint: "#DEF4F2",
    accent: "#5E8F6E",
    silhouette: "Mint friend with leafy ears and a curly sprout",
  },
  marlow: {
    bio: "Marlow is happiest when everyone pitches in — the jar fills faster when we do it together.",
    color: "#F2A7B8",
    shade: "#D97B92",
    tint: "#FCE4EA",
    accent: "#7FC8A9",
    silhouette: "Round pink friend with puffball ears",
  },
};

function isKnown(id: string): id is PalId {
  return Object.prototype.hasOwnProperty.call(LOOK, id);
}

export const PALS: PalDef[] = COMPANIONS.flatMap((c) =>
  isKnown(c.id)
    ? [
        {
          id: c.id,
          name: c.name,
          value: c.trait,
          tagline: c.quote,
          pastelKey: c.color,
          motif: c.motif,
          ...LOOK[c.id],
        },
      ]
    : [],
);

const BY_ID = new Map<string, PalDef>(PALS.map((p) => [p.id, p]));

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
 * Resolve a stored companion id to a Pal. Unknown or empty ids fall back to a
 * stable hash of `seed` (usually the kid id) so a child's Pal never flickers.
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
  return !!id && BY_ID.has(id);
}
