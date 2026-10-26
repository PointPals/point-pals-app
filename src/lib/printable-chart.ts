// Printable weekly chore chart — the app's offline companion.
//
// Design note: an earlier prototype ("printChart") leaned on window.print(), which
// only opens a browser dialog and never hands the user an actual file — useless on
// mobile. This module instead draws the whole A4 sheet onto a high-resolution
// <canvas> and wraps that image in a minimal, hand-written PDF, so the result is a
// real, shareable/downloadable .pdf.
//
// Why canvas rather than html2canvas: the app's palette is defined in oklch()/
// color-mix(), which html2canvas cannot rasterise. Drawing directly with the Canvas
// 2D API lets us use the plain hex values in PASTEL_HEX and keep total control over
// the one-page A4 layout.

import { COMPANIONS, PASTEL_HEX, type Chore, type Companion, type Kid } from "./mock-data";
import { iconUrl, isIconKey } from "./icons";
import { companionArtUrl } from "./companion-assets";
import { orderChores } from "./chore-order";
import { addDays, format, startOfWeek } from "date-fns";

// Cache images so repeated renders don't refetch.
const imageCache = new Map<string, HTMLImageElement>();
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached);

  // Fetch the image as a blob, then create a same-origin blob URL. This avoids
  // canvas taint entirely — the blob URL is same-origin so the canvas doesn't
  // need CORS, even though the original URL is cross-origin. Supabase public
  // bucket URLs are publicly readable, so fetch() should succeed.
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${url} (HTTP ${resp.status})`);
  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      URL.revokeObjectURL(blobUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to decode ${url}`));
    };
    img.src = blobUrl;
  });
}

// A4 portrait, in PDF points (72 per inch) and in canvas pixels (~192 DPI for crisp text).
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
const CANVAS_W = 1587;
const CANVAS_H = 2245;

const INK = "#231B33"; // deep aubergine ink — the app never uses pure black
const INK_SOFT = "#6B6380";
const CREAM = "#FBF6EE";
const DISPLAY = '"Fraunces Variable", Georgia, serif';
const SANS = '"Figtree Variable", system-ui, sans-serif';
const PALETTE_ORDER: (keyof typeof PASTEL_HEX)[] = [
  "sky",
  "butter",
  "sage",
  "blush",
  "lilac",
  "sand",
  "foam",
  "orange",
];

export type ChartResult = {
  status: "shared" | "downloaded" | "cancelled";
  truncated: boolean;
  shown: number;
  total: number;
};

/**
 * The companion mascot shown on a kid's chart. Companions are avatars only
 * (no unlock mechanic): use the kid's chosen companion, falling back to a
 * stable hash of the kid's id so the sheet always has a friendly face.
 */
export function companionForKid(kid: Kid): Companion {
  const chosen = kid.companionId && COMPANIONS.find((c) => c.id === kid.companionId);
  if (chosen) return chosen;
  const byColor = COMPANIONS.find((c) => c.color === kid.color);
  if (byColor) return byColor;
  let h = 0;
  for (const ch of kid.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COMPANIONS[h % COMPANIONS.length];
}

/** Chores that belong on a weekly chart: every chore on the household's list.
 * Custom chores default to recurrence "none", and filtering those out made
 * user-created chores silently vanish from the printable PDF.
 *
 * When the parent has set a manual print order (Library → Chores, the "Print
 * order" controls), that order wins — so e.g. morning chores can be made to
 * appear before afternoon ones on the PDF. Chores without a saved position fall
 * back to the default recurrence ranking (daily first, then one-off, then
 * weekly), which also drives which survive if we truncate to fit one page. */
export function weeklyChores(chores: Chore[]): Chore[] {
  const rank = (c: Chore) => (c.recurrence === "daily" ? 0 : c.recurrence === "none" ? 1 : 2);
  // Default ordering first, then apply the saved manual order on top (manual
  // positions win; anything unsaved keeps the recurrence ranking below them).
  const byRecurrence = [...chores].sort((a, b) => rank(a) - rank(b));
  return orderChores(byRecurrence);
}

// ---- colour helpers -------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Lighten a hex toward white by t (0 = original, 1 = white) — used for soft column tints. */
export function tint(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** True when a chore's `icon` field is itself an image URL rather than a
 * registry key ("i00") or a bare emoji glyph. */
function isUrlIcon(icon: string): boolean {
  return icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/");
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// ---- mascot (ported from PlushCompanion, drawn on canvas) -----------------

function companionAccent(color: keyof typeof PASTEL_HEX): string {
  const map: Record<keyof typeof PASTEL_HEX, string> = {
    sky: "#7FA9CE",
    butter: "#D9BE58",
    sage: "#8FB585",
    blush: "#D19AA6",
    lilac: "#B39CD9",
    sand: "#C9A672",
    foam: "#82BEBC",
    orange: "#D48D3C",
  };
  return map[color];
}

function bodyPath(shape: Companion["bodyShape"]): Path2D {
  switch (shape) {
    case "egg":
      return new Path2D(
        "M 80 40 C 45 40 40 90 42 110 C 44 132 60 140 80 140 C 100 140 116 132 118 110 C 120 90 115 40 80 40 Z",
      );
    case "pear":
      return new Path2D(
        "M 80 42 C 60 42 55 62 56 78 C 40 92 40 122 60 134 C 72 141 88 141 100 134 C 120 122 120 92 104 78 C 105 62 100 42 80 42 Z",
      );
    default:
      return new Path2D(
        "M 80 40 C 45 40 34 70 36 96 C 38 124 55 140 80 140 C 105 140 122 124 124 96 C 126 70 115 40 80 40 Z",
      );
  }
}

/** Draw the plush companion into a square box at (x, y) of the given size (px). */
function drawCompanion(
  ctx: CanvasRenderingContext2D,
  companion: Companion,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 160, size / 160); // paths are authored in a 160×160 viewBox

  const bodyFill = PASTEL_HEX[companion.color];
  const eye = INK;
  const body = bodyPath(companion.bodyShape);

  // soft ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(80, 146, 42, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = bodyFill;
  ctx.fill(body);

  // shade (bottom-right) + sheen (top-left)
  const shade = ctx.createRadialGradient(112, 128, 4, 112, 128, 112);
  shade.addColorStop(0, "rgba(0,0,0,0.14)");
  shade.addColorStop(0.8, "rgba(0,0,0,0)");
  ctx.fillStyle = shade;
  ctx.fill(body);
  const sheen = ctx.createRadialGradient(56, 48, 4, 56, 48, 112);
  sheen.addColorStop(0, "rgba(255,255,255,0.55)");
  sheen.addColorStop(0.6, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fill(body);

  if (companion.id === "ridge") {
    ctx.fillStyle = PASTEL_HEX.sand;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(80, 105, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // chest badge + symbol
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(80, 100, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `17px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(companion.symbol, 80, 101);

  // eyes
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.ellipse(66, 72, 7, 9, 0, 0, Math.PI * 2);
  ctx.ellipse(94, 72, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(63, 68, 2.2, 0, Math.PI * 2);
  ctx.arc(91, 68, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = eye;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(74, 87);
  ctx.quadraticCurveTo(80, 90, 86, 87);
  ctx.stroke();

  // little accents for a couple of characters
  if (companion.id === "fern") {
    ctx.fillStyle = companionAccent(companion.color);
    ctx.beginPath();
    ctx.moveTo(80, 32);
    ctx.quadraticCurveTo(76, 22, 82, 18);
    ctx.quadraticCurveTo(88, 24, 80, 32);
    ctx.fill();
  }
  if (companion.id === "bramble") {
    ctx.fillStyle = PASTEL_HEX.sage;
    ctx.beginPath();
    ctx.moveTo(118, 44);
    ctx.quadraticCurveTo(128, 42, 126, 52);
    ctx.quadraticCurveTo(118, 54, 118, 44);
    ctx.fill();
  }

  ctx.restore();
}

// ---- sheet layout ---------------------------------------------------------

type SheetInput = {
  kid: Kid;
  companion: Companion;
  chores: Chore[];
  householdName: string;
  /** Optional goal shown in the header ("Working towards · Movie night"). */
  rewardName?: string | null;
};

export async function ensureFonts() {
  if (!("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`600 108px ${DISPLAY}`),
      document.fonts.load(`600 40px ${DISPLAY}`),
      document.fonts.load(`700 30px ${SANS}`),
      document.fonts.load(`500 28px ${SANS}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts if the web fonts can't be forced — text still renders.
  }
}

/** Canvas letter-spacing where supported (Chromium/Safari); a no-op elsewhere. */
function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${px}px`;
}

/** A glossy marble — the app's signature mark. */
function drawMarble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, tint(hex, 0.25));
  g.addColorStop(1, hex);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A little glass jar with a few marbles in it, for the footer. */
function drawMiniJar(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const w = h * 0.78;
  const neck = h * 0.12;
  ctx.save();
  // marbles inside
  const colours = ["#8FC7EA", "#F1D36A", "#9CD08C", "#EDA6B2", "#B79BE0", "#84CFCB"];
  const mr = w * 0.13;
  const spots: [number, number][] = [
    [0.3, 0.86],
    [0.55, 0.87],
    [0.78, 0.85],
    [0.42, 0.7],
    [0.67, 0.71],
    [0.55, 0.55],
  ];
  spots.forEach(([fx, fy], i) => drawMarble(ctx, x + w * fx, y + h * fy, mr, colours[i]));
  // glass
  ctx.strokeStyle = "rgba(35,27,51,0.55)";
  ctx.lineWidth = 4;
  roundRect(ctx, x + w * 0.04, y + neck, w * 0.92, h - neck, w * 0.22);
  ctx.stroke();
  // lid
  ctx.fillStyle = "#E3B95C";
  roundRect(ctx, x, y, w, neck * 0.9, neck * 0.4);
  ctx.fill();
  // shine
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + neck + h * 0.12);
  ctx.lineTo(x + w * 0.18, y + neck + h * 0.42);
  ctx.stroke();
  ctx.restore();
}

/** Render the sheet to a canvas. Returns the canvas plus what got shown/truncated. */
async function renderSheet(input: SheetInput): Promise<{
  canvas: HTMLCanvasElement;
  shown: number;
  total: number;
  truncated: boolean;
}> {
  await ensureFonts();
  // Preload chore icons, resolved from whatever's LIVE on each chore right now
  // (§7): a registry key ("i00") maps through iconUrl, and anything already a
  // URL (the real Supabase-hosted illustrations) loads directly. Nothing here
  // is cached across chart generations — this map is rebuilt from `input.chores`
  // every call, so editing an icon in the Library shows up on the very next
  // download. A bare emoji/glyph (no URL) falls back to drawing the glyph.
  const iconImages = new Map<string, HTMLImageElement>();
  await Promise.all(
    input.chores.map(async (c) => {
      const url = isIconKey(c.icon) ? iconUrl(c.icon) : isUrlIcon(c.icon) ? c.icon : undefined;
      if (!url) return;
      try {
        iconImages.set(c.icon, await loadImage(url));
      } catch {
        /* image failed to load (offline/broken URL) — falls back to the glyph */
      }
    }),
  );

  // Preload the kid's character art (the same PNG used in-app). If it can't be
  // reached we fall back to the vector companion so the sheet still has a face.
  let companionImg: HTMLImageElement | null = null;
  const companionUrl = companionArtUrl(input.companion.id);
  if (companionUrl) {
    try {
      companionImg = await loadImage(companionUrl);
    } catch {
      companionImg = null;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const kidHex = PASTEL_HEX[input.kid.color];

  // ---- paper ----
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // two soft pools of colour: the child's own up top, lilac at the foot
  const glowA = ctx.createRadialGradient(260, 120, 20, 260, 120, 900);
  glowA.addColorStop(0, tint(kidHex, 0.25));
  glowA.addColorStop(1, "rgba(251,246,238,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const glowB = ctx.createRadialGradient(
    CANVAS_W - 200,
    CANVAS_H - 160,
    20,
    CANVAS_W - 200,
    CANVAS_H - 160,
    800,
  );
  glowB.addColorStop(0, "rgba(215,199,240,0.45)");
  glowB.addColorStop(1, "rgba(251,246,238,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const M = 88;
  const contentX = M;
  const contentW = CANVAS_W - M * 2;
  const total = input.chores.length;

  // ---- fit planning: always ONE A4 page ----
  // Roomy header for typical lists; a compact header + footer for long ones so
  // the rows keep a readable size. Truncate only as a last resort.
  const plan = (compact: boolean) => {
    const avatar = compact ? 150 : 220;
    const headerH = avatar + (compact ? 36 : 48);
    const footerH = compact ? 132 : 168;
    const gridTop = M + headerH;
    const colHeaderH = compact ? 78 : 92;
    const rowsTop = gridTop + colHeaderH;
    const gridBottom = CANVAS_H - M - footerH - 24;
    return {
      compact,
      avatar,
      headerH,
      footerH,
      gridTop,
      colHeaderH,
      rowsTop,
      gridBottom,
      availH: gridBottom - rowsTop,
    };
  };
  const IDEAL_ROW = 126;
  const MIN_ROW = 50;
  let L = plan(false);
  if (total * 76 > L.availH) L = plan(true);

  let rowH: number;
  let shown: number;
  let truncated = false;
  if (total === 0) {
    rowH = IDEAL_ROW;
    shown = 0;
  } else if (total * MIN_ROW <= L.availH) {
    rowH = Math.min(IDEAL_ROW, L.availH / total);
    shown = total;
  } else {
    rowH = MIN_ROW;
    // leave one row's height for the "+N more in the app" note
    shown = Math.max(1, Math.floor((L.availH - 40) / MIN_ROW));
    truncated = true;
  }

  // ---- header ----
  const D = L.avatar;
  const cx0 = contentX + D / 2;
  const cy0 = M + D / 2;
  ctx.save();
  ctx.shadowColor = "rgba(35,27,51,0.22)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx0, cy0, D / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const halo = ctx.createRadialGradient(cx0, cy0 - D * 0.15, 4, cx0, cy0, D / 2);
  halo.addColorStop(0, tint(kidHex, 0.2));
  halo.addColorStop(1, kidHex);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx0, cy0, D / 2 - 8, 0, Math.PI * 2);
  ctx.fill();
  if (companionImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx0, cy0, D / 2 - 8, 0, Math.PI * 2);
    ctx.clip();
    // Contain + inset — matches the in-app avatar so ears/feet aren't clipped.
    const box = (D - 16) * 0.78;
    const iw = companionImg.naturalWidth || 1;
    const ih = companionImg.naturalHeight || 1;
    const sc = Math.min(box / iw, box / ih);
    ctx.drawImage(
      companionImg,
      cx0 - (iw * sc) / 2,
      cy0 - (ih * sc) / 2 + D * 0.02,
      iw * sc,
      ih * sc,
    );
    ctx.restore();
  } else {
    drawCompanion(ctx, input.companion, contentX + 8, M + 8, D - 16);
  }

  const textX = contentX + D + 44;
  const textW = contentW - D - 44;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK_SOFT;
  ctx.font = `700 ${L.compact ? 22 : 25}px ${SANS}`;
  setTracking(ctx, 5);
  ctx.fillText(
    fitText(ctx, input.householdName.toUpperCase(), textW),
    textX,
    M + (L.compact ? 34 : 46),
  );
  setTracking(ctx, 0);

  ctx.fillStyle = INK;
  const titleSize = L.compact ? 84 : 112;
  ctx.font = `600 ${titleSize}px ${DISPLAY}`;
  setTracking(ctx, -2);
  ctx.fillText(fitText(ctx, `${input.kid.name}'s week`, textW), textX, M + (L.compact ? 112 : 150));
  setTracking(ctx, 0);

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const dateText = `${format(monday, "d MMM")} – ${format(sunday, "d MMM yyyy")}`;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 ${L.compact ? 26 : 30}px ${SANS}`;
  const dateY = M + (L.compact ? 150 : 200);
  ctx.fillText(dateText, textX, dateY);

  if (input.rewardName) {
    // "Working towards" pill beside the date
    const dateW = ctx.measureText(dateText).width;
    const label = "Working towards";
    const reward = input.rewardName;
    ctx.font = `700 ${L.compact ? 22 : 25}px ${SANS}`;
    const labelW = ctx.measureText(label + "  ").width;
    ctx.font = `600 ${L.compact ? 26 : 30}px ${DISPLAY}`;
    const maxReward = textW - dateW - labelW - 130;
    const rewardText = fitText(ctx, reward, Math.max(120, maxReward));
    const rw = ctx.measureText(rewardText).width;
    const pillH = L.compact ? 50 : 58;
    const pillW = 44 + labelW + rw + 26;
    const px = Math.min(textX + dateW + 32, contentX + contentW - pillW);
    const py = dateY - pillH * 0.72;
    if (px > textX + dateW + 8) {
      ctx.save();
      ctx.shadowColor = "rgba(35,27,51,0.14)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, px, py, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.restore();
      drawMarble(ctx, px + 26, py + pillH / 2, 10, "#E3A93B");
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK_SOFT;
      ctx.font = `700 ${L.compact ? 22 : 25}px ${SANS}`;
      ctx.fillText(label, px + 46, py + pillH / 2 + 1);
      ctx.fillStyle = INK;
      ctx.font = `600 ${L.compact ? 26 : 30}px ${DISPLAY}`;
      ctx.fillText(rewardText, px + 46 + labelW, py + pillH / 2 + 1);
      ctx.textBaseline = "alphabetic";
    }
  }

  // ---- grid geometry ----
  const labelColW = Math.round(contentW * 0.41);
  const daysX = contentX + labelColW;
  const daysW = contentW - labelColW;
  const dayW = daysW / 7;
  const chores = input.chores.slice(0, shown);
  const rowsBottom = L.rowsTop + Math.max(chores.length, 1) * rowH;

  const dayLabels = Array.from({ length: 7 }, (_, i) => ({
    label: format(addDays(monday, i), "EEE"),
    date: format(addDays(monday, i), "d"),
  }));

  // day columns — soft capsules, full height, each in its own colour
  for (let d = 0; d < 7; d++) {
    const x = daysX + d * dayW;
    const col = PASTEL_HEX[PALETTE_ORDER[d]];
    ctx.fillStyle = tint(col, 0.55);
    roundRect(ctx, x + 5, L.gridTop, dayW - 10, rowsBottom - L.gridTop + 14, 30);
    ctx.fill();
    // header cap
    ctx.fillStyle = tint(col, 0.15);
    roundRect(ctx, x + 5, L.gridTop, dayW - 10, L.colHeaderH - 8, 30);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = `700 ${L.compact ? 25 : 28}px ${SANS}`;
    ctx.fillText(dayLabels[d].label, x + dayW / 2, L.gridTop + (L.compact ? 32 : 38));
    ctx.fillStyle = INK_SOFT;
    ctx.font = `600 ${L.compact ? 24 : 27}px ${DISPLAY}`;
    ctx.fillText(dayLabels[d].date, x + dayW / 2, L.gridTop + (L.compact ? 62 : 72));
  }

  // label column header
  ctx.textAlign = "left";
  ctx.fillStyle = INK_SOFT;
  ctx.font = `700 ${L.compact ? 22 : 24}px ${SANS}`;
  setTracking(ctx, 4);
  ctx.fillText("MY JOBS", contentX + 6, L.gridTop + (L.compact ? 48 : 56));
  setTracking(ctx, 0);

  // rows
  const tile = Math.min(rowH * 0.66, 70);
  const nameSize = Math.max(22, Math.min(34, Math.round(rowH * 0.29)));
  const r = Math.min(dayW, rowH) * 0.27;

  chores.forEach((c, i) => {
    const ry = L.rowsTop + i * rowH;
    const rmid = ry + rowH / 2;

    if (i > 0) {
      ctx.strokeStyle = "rgba(35,27,51,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentX + 6, ry);
      ctx.lineTo(daysX - 12, ry);
      ctx.stroke();
    }

    // icon tile in the chore's colour, holding its illustration
    const tx = contentX + 6;
    const ty = rmid - tile / 2;
    ctx.fillStyle = PASTEL_HEX[c.color];
    roundRect(ctx, tx, ty, tile, tile, tile * 0.3);
    ctx.fill();
    const img = iconImages.get(c.icon);
    if (img) {
      const inset = tile * 0.12;
      ctx.drawImage(img, tx + inset, ty + inset, tile - inset * 2, tile - inset * 2);
    } else if (!(isUrlIcon(c.icon) || isIconKey(c.icon))) {
      // a bare emoji/glyph icon (never print a raw URL)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(tile * 0.6)}px ${SANS}`;
      ctx.fillText(c.icon, tx + tile / 2, rmid + 2);
    }

    // name
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    ctx.font = `700 ${nameSize}px ${SANS}`;
    const nameX = tx + tile + 20;
    const pillReserve = 86;
    ctx.fillText(fitText(ctx, c.name, daysX - nameX - pillReserve), nameX, rmid + 1);

    // points pill
    const pillText = `+${c.points}`;
    ctx.font = `600 ${Math.round(nameSize * 0.78)}px ${DISPLAY}`;
    const pw = ctx.measureText(pillText).width + 28;
    const ph = Math.round(nameSize * 1.2);
    const px = daysX - pw - 18;
    ctx.fillStyle = INK;
    roundRect(ctx, px, rmid - ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.textAlign = "center";
    ctx.fillText(pillText, px + pw / 2, rmid + 2);

    // a marble to colour in, per day
    for (let d = 0; d < 7; d++) {
      const mx = daysX + d * dayW + dayW / 2;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(mx, rmid, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = "rgba(35,27,51,0.42)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, rmid, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // tiny glint so it reads as a marble
      ctx.strokeStyle = "rgba(35,27,51,0.18)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(mx, rmid, r * 0.62, Math.PI * 1.12, Math.PI * 1.42);
      ctx.stroke();
    }
  });

  if (chores.length === 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK_SOFT;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText(
      "No jobs yet — add some in the app!",
      contentX + labelColW / 2,
      L.rowsTop + rowH / 2,
    );
  }

  if (truncated) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK_SOFT;
    ctx.font = `600 24px ${SANS}`;
    ctx.fillText(`+ ${total - shown} more in the app`, contentX + 6, rowsBottom + 28);
  }

  // ---- footer ----
  const fH = L.footerH;
  const fY = CANVAS_H - M - fH;
  ctx.save();
  ctx.shadowColor = "rgba(35,27,51,0.12)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, contentX, fY, contentW, fH, 40);
  ctx.fill();
  ctx.restore();
  const jarH = fH - 44;
  drawMiniJar(ctx, contentX + 34, fY + 22, jarH);
  const ftx = contentX + 34 + jarH * 0.78 + 32;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `600 ${L.compact ? 32 : 38}px ${DISPLAY}`;
  ctx.fillText("Colour in a marble each time you do it.", ftx, fY + fH / 2 - (L.compact ? 4 : 6));
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 ${L.compact ? 23 : 26}px ${SANS}`;
  ctx.fillText(
    "A grown-up pops them into your family jar in the app.",
    ftx,
    fY + fH / 2 + (L.compact ? 34 : 42),
  );
  // brand mark, bottom-right inside the footer
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = `600 ${L.compact ? 30 : 34}px ${DISPLAY}`;
  const brandY = fY + fH - (L.compact ? 26 : 32);
  ctx.fillText("PointPals", contentX + contentW - 34, brandY);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 20px ${SANS}`;
  ctx.fillText("pointpals.co.nz", contentX + contentW - 34, brandY - (L.compact ? 34 : 40));

  return { canvas, shown: chores.length, total, truncated };
}

/** Render the chart to a canvas without downloading (previews, tests). */
export async function renderKidChart(input: SheetInput) {
  return renderSheet(input);
}

// ---- PDF assembly (single-page A4 chart, hand-written) --------------------
//
// (§7 — the sticker sheet used to ship as page 2; that's dropped. This is just
// the weekly chore grid, on its own.)

async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const bin = atob(dataUrl.split(",")[1]);
  const chartJpeg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) chartJpeg[i] = bin.charCodeAt(i);

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const objStart = () => offsets.push(length);

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Object layout: 1 Catalog · 2 Pages · 3 Page · 4 Chart image · 5 Page content
  objStart();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objStart();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objStart();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W_PT} ${A4_H_PT}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );
  objStart();
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${chartJpeg.length} >>\nstream\n`,
  );
  push(chartJpeg);
  push("\nendstream\nendobj\n");
  const content1 = `q\n${A4_W_PT} 0 0 ${A4_H_PT} 0 0 cm\n/Im0 Do\nQ\n`;
  objStart();
  push(`5 0 obj\n<< /Length ${content1.length} >>\nstream\n${content1}endstream\nendobj\n`);

  const xrefStart = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (const off of offsets) xref += String(off).padStart(10, "0") + " 00000 n \n";
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slug(s: string): string {
  return s.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "kid";
}

/**
 * Generate this week's printable chart for a kid and download it as a real PDF
 * file into the browser's Downloads folder. We used to route through the Web
 * Share API on capable devices, but on Android that opens a share sheet — if
 * the user dismisses it or picks an app that can't preview PDFs, nothing ever
 * lands in Downloads and the "Download" button appears to do nothing. A plain
 * anchor download is predictable across every browser (Chrome Android, iOS
 * Safari, desktop) and always produces an openable file.
 */
export async function downloadKidChart(input: SheetInput): Promise<ChartResult> {
  const { canvas, shown, total, truncated } = await renderSheet(input);
  const blob = await canvasToPdfBlob(canvas);
  const filename = `${slug(input.kid.name)}-chart-${format(new Date(), "yyyy-MM-dd")}.pdf`;

  downloadBlob(blob, filename);
  return { status: "downloaded", truncated, shown, total };
}
