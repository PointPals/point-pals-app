/**
 * Centralised Supabase Storage URLs for all assets.
 *
 * Single source of truth — import these constants instead of
 * .asset.json files or local image imports.
 */

const BUCKET =
  "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets";

// ── Brand ──────────────────────────────────────────────────────────────────
export const LOGO_URL = `${BUCKET}/pointpals.logo.png`;
export const LOGO_POINTS_URL = `${BUCKET}/pointpals-logo-points.png`;
export const APP_ICON_URL = `${BUCKET}/pointpals-app-icon.png`;
// Social share / OpenGraph card (1200×630). Served from the app's own
// /public so it deploys with the site — replace public/pp-share.png to change it.
export const HERO_IMAGE_URL = "https://pointpals.co.nz/pp-share.png";

// ── Marketing ───────────────────────────────────────────────────────────────
export const ABOUT_HERO = `${BUCKET}/about-hero.jpg`;
export const FAQ_HERO = `${BUCKET}/faq-hero.jpg`;
export const BLOG_CHARACTERS = `${BUCKET}/blog-characters.jpg`;
export const BLOG_HERO = `${BUCKET}/blog-hero.jpg`;
export const BLOG_AGE_CHORES = `${BUCKET}/blog-age-chores.jpg`;
export const BLOG_CHORES_FUN = `${BUCKET}/blog-chores-fun.jpg`;
export const BLOG_MARBLE_JAR = `${BUCKET}/blog-marble-jar.jpg`;
export const BLOG_RESEARCH = `${BUCKET}/blog-research.jpg`;
export const BLOG_SCREEN_TIME = `${BUCKET}/blog-screen-time.jpg`;

// ── Companion mascots ───────────────────────────────────────────────────────
export const COMPANION_URLS: Record<string, string> = {
  sunny:   `${BUCKET}/sunny.png`,
  bramble: `${BUCKET}/bramble.png`,
  pip:     `${BUCKET}/pip.png`,
  marlow:  `${BUCKET}/marlow.png`,
  coda:    `${BUCKET}/coda.png`,
  fern:    `${BUCKET}/fern.png`,
  ziggy:   `${BUCKET}/ziggy.png`,
  ridge:   `${BUCKET}/ridge.png`,
};

/**
 * Returns the mascot image URL for a companion id, or undefined.
 */
export function companionArtUrl(companionId: string): string | undefined {
  return COMPANION_URLS[companionId];
}
