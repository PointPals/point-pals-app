import { PALS, type PalId } from "@/lib/pals";

/**
 * Marble palette for the marketing page — the Pals' colours plus
 * rose. Each entry carries a light / base / deep triple so SVG marbles can be
 * shaded like glass without runtime colour maths.
 */
export type MarbleTone = { id: string; light: string; base: string; deep: string };

function mix(hex: string, withHex: string, amount: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(withHex.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export const MARBLE_TONES: MarbleTone[] = [
  ...PALS.map((p) => ({
    id: p.id,
    light: mix(p.color, "#ffffff", 0.55),
    base: p.color,
    deep: p.shade,
  })),
  { id: "rose", light: "#FBC4DA", base: "#F27DAE", deep: "#D2558A" },
];

export const PAL_BY_ID = Object.fromEntries(PALS.map((p) => [p.id, p])) as Record<
  PalId,
  (typeof PALS)[number]
>;

/** Index into MARBLE_TONES for a Pal id. */
export function toneIndex(id: string) {
  const i = MARBLE_TONES.findIndex((t) => t.id === id);
  return i < 0 ? 0 : i;
}

/** Small deterministic PRNG (mulberry32) — same marbles on server and client. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
