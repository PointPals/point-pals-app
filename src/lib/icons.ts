// Icon registry — transparent-background PNG tiles hosted in the Supabase
// `assets` bucket. Icons are referenced throughout the app by their filename
// key (e.g. "make-bed.png") so chores/skills stay JSON-safe. Chore records
// may also store a full https URL (legacy) — those pass through unchanged
// via the `startsWith("http")` branch in consumers.

const SUPABASE_ASSET_BASE =
  "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets";

// Ordered: chores/kid behaviours first, then positive/needs-work skills,
// with the adult-tagged icons grouped at the end.
const ICON_FILES: string[] = [
  // Daily routine
  "make-bed.png",
  "brushteeth-morning-bed.png",
  "brushteeth-night-bed.png",
  "flossed-teeth.png",
  "brush-hair.png",
  "washed-hands.png",
  "bath-or-shower.png",
  "get-dressed.png",
  "get-ready-for-bed.png",
  "went-to-bed-by-yourself.png",
  "stayed-in-bed-all-night.png",
  "woke-up-on-time.png",
  "getting-out-the-door-on-time.png",
  // Meals
  "ate-breakfast.png",
  "ate-lunch.png",
  "finished-dinner.png",
  "made-a-snack.png",
  "take-vitamins_medicine.png",
  // School / activities
  "packed-bag.png",
  "did-homework.png",
  "music-practise.png",
  "exercised.png",
  "journalling.png",
  "relaxed.png",
  // Household chores
  "tidied-room.png",
  "tidied-up.png",
  "put-things-away.png",
  "put-clothes-away.png",
  "put-shoes-away.png",
  "hung-up-coat.png",
  "groceries-away.png",
  "set-the-table.png",
  "emptied-or-loaded-dishwasher.png",
  "swept-the-room.png",
  "mopped-the-floor.png",
  "vacuumn.png",
  "take-out-rubbish.png",
  "sorted-recycling.png",
  "watered-plants.png",
  "fed-pets.png",
  // Positive skills
  "being-independent.png",
  "being-respectful.png",
  "helped-without-being-asked.png",
  "including-others.png",
  "sharing-toys.png",
  "showing-empathy.png",
  "using-manners.png",
  "used-kindwords.png",
  "followed-directions.png",
  "waiting-paitently.png",
  "calmed-down-after-getting-mad.png",
  "tried-your-best.png",
  "done.png",
  // Needs work
  "argued.png",
  "didn't-listen.png",
  "did-not-follow-instructions.png",
  "hit-or-pushed.png",
  "threw-things.png",
  "yelled-or-screamed.png",
  "tantrum.png",
  "ran-away.png",
  "refused-to-share.png",
  "made-a-mess.png",
  "not-yet.png",
  // Adult
  "adult-ate healthy.png",
  "adult-bed-before-targettime.png",
  "adult-drank-21L-water.png",
  "adult-exercised-30min.png",
  "adult-folded-and-put-away-on-same-day.png",
  "adult-journalling.png",
  "adult-meditated.png",
  "adult-no doom scrolling.png",
  "adult-no-phone.png",
  "adult-paid-a-bill.png",
  "adult-took-a-lunchbreak.png",
];

// Cache-buster: bump this whenever the Supabase bucket re-uploads existing
// filenames (e.g. transparent-background refresh). Browsers/CDNs cache the
// old bytes under the same URL otherwise.
const ASSET_VERSION = "3";

const REGISTRY: Record<string, string> = Object.fromEntries(
  ICON_FILES.map((f) => [
    f,
    `${SUPABASE_ASSET_BASE}/${encodeURIComponent(f)}?v=${ASSET_VERSION}`,
  ]),
);

export function iconUrl(key: string): string | undefined {
  return REGISTRY[key];
}

export function isIconKey(key: string): boolean {
  return key in REGISTRY;
}

export const ICON_KEYS = ICON_FILES.slice();

// ─── User-uploaded icon helpers ──────────────────────────────────────────

/**
 * Returns the public storage URL for a user-uploaded icon given its
 * storage_path (e.g. "uploads/{householdId}/{uuid}.png").
 * Pass through the icon value directly — if it's already a full URL the
 * callers (IconTile) treat it as-is.
 */
export function storageUrl(storagePath: string): string {
  return `${SUPABASE_ASSET_BASE}/${encodeURIComponent(storagePath)}`;
}
