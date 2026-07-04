// Icon registry — 66 flat-pastel tiles sliced from the PointPals icon pack
// (see src/assets/icons/i00.png … i65.png, 11 cols × 6 rows).
// Icons are referenced by key ("i00".."i65") throughout the app so mock data
// stays JSON-safe and swappable to a real backend later.

const modules = import.meta.glob("../assets/icons/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const REGISTRY: Record<string, string> = {};
for (const path in modules) {
  const m = path.match(/i(\d{2})\.png$/);
  if (m) REGISTRY[`i${m[1]}`] = modules[path];
}

export function iconUrl(key: string): string | undefined {
  return REGISTRY[key];
}

export function isIconKey(key: string): boolean {
  return /^i\d{2}$/.test(key) && key in REGISTRY;
}

export const ICON_KEYS = Object.keys(REGISTRY).sort();
