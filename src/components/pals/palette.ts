import type { PalId } from "@/lib/pals";

/**
 * Plush palette — the thread and fabric colours the Pal art is drawn with.
 * Mirrors the tables in docs/PLUSH-SPEC.md, so screen and factory agree.
 */

/** Embroidery ink: deep aubergine, never pure black. */
export const INK = "#2A2138";

/** Embroidery white (eye highlights) — a soft warm white, not #fff. */
export const WHITE_THREAD = "#FFF9F0";

/** Cheek satin-stitch thread, tuned per body fabric. */
export const CHEEK: Record<PalId, string> = {
  lumi: "#F59ACB",
  tumble: "#F2846B",
  ember: "#E9506A",
  orbit: "#F59ACB",
  moss: "#F7907F",
  ripple: "#F27DAE",
};

/**
 * Hand-picked shadow hue per fabric. Shadows shift hue (warm → redder, cool →
 * deeper blue) instead of greying, so the minky never reads muddy.
 */
export const SHADOW: Record<PalId, string> = {
  lumi: "#5A3AA8",
  tumble: "#C46A12",
  ember: "#B83A35",
  orbit: "#2B3A9E",
  moss: "#12705A",
  ripple: "#12768E",
};

/** Mix two #rrggbb colours (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
