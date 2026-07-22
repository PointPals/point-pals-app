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
async function loadImage(url: string): Promise<HTMLImageElement> {
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

const INK = "#3C2F26"; // warm charcoal — the app never uses pure black
const INK_SOFT = "#8A7F72";
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
function tint(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

function roundRect(
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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
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
  const eye = "#3C2F26";
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
  ctx.font = '17px "Nunito Sans Variable", system-ui, sans-serif';
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
};

async function ensureFonts() {
  if (!("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load('800 96px "Zain"'),
      document.fonts.load('700 44px "Zain"'),
      document.fonts.load('700 34px "Nunito Sans Variable"'),
      document.fonts.load('400 28px "Nunito Sans Variable"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts if the web fonts can't be forced — text still renders.
  }
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

  // Preload the kid's companion mascot art (the same PNG used in-app). If it
  // can't be reached we fall back to the vector companion so the sheet still
  // has a friendly face.
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

  // cream background
  ctx.fillStyle = "#FDFBF5";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const M = 96;
  const contentX = M;
  const contentW = CANVAS_W - M * 2;

  // ---- header ----
  const mascotSize = 200;
  const headerY = M;
  // Coloured halo behind the avatar uses the kid's palette so the printed
  // sheet visually matches their in-app card.
  const haloCx = contentX + mascotSize / 2;
  const haloCy = headerY - 10 + mascotSize / 2;
  const haloR = mascotSize / 2;
  const halo = ctx.createRadialGradient(haloCx, haloCy - haloR * 0.2, 4, haloCx, haloCy, haloR);
  halo.addColorStop(0, PASTEL_HEX[input.kid.color]);
  halo.addColorStop(1, tint(PASTEL_HEX[input.kid.color], 0.55));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(haloCx, haloCy, haloR, 0, Math.PI * 2);
  ctx.fill();

  if (companionImg) {
    // Clip to a circle so the plush art sits neatly inside the coloured halo.
    ctx.save();
    ctx.beginPath();
    ctx.arc(haloCx, haloCy, haloR - 4, 0, Math.PI * 2);
    ctx.clip();
    const s = (haloR - 4) * 2;
    ctx.drawImage(companionImg, haloCx - s / 2, haloCy - s / 2, s, s);
    ctx.restore();
  } else {
    drawCompanion(ctx, input.companion, contentX, headerY - 10, mascotSize);
  }

  const textX = contentX + mascotSize + 40;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK_SOFT;
  ctx.font = '700 26px "Nunito Sans Variable", system-ui, sans-serif';
  ctx.fillText(input.householdName.toUpperCase(), textX, headerY + 44);

  ctx.fillStyle = INK;
  ctx.font = '800 96px "Zain", "Nunito Sans Variable", sans-serif';
  ctx.fillText(
    fitText(ctx, `${input.kid.name}'s week`, contentW - mascotSize - 60),
    textX,
    headerY + 130,
  );

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  ctx.fillStyle = INK_SOFT;
  ctx.font = '400 30px "Nunito Sans Variable", system-ui, sans-serif';
  ctx.fillText(
    `${format(monday, "d MMM")} – ${format(sunday, "d MMM yyyy")}`,
    textX,
    headerY + 178,
  );

  // ---- grid geometry ----
  const gridTop = headerY + mascotSize + 44;
  const footerH = 120;
  const gridBottom = CANVAS_H - M - footerH;
  const colHeaderH = 66;

  const labelColW = Math.round(contentW * 0.4);
  const daysX = contentX + labelColW;
  const daysW = contentW - labelColW;
  const dayW = daysW / 7;

  const rowsTop = gridTop + colHeaderH;
  const availH = gridBottom - rowsTop;

  const total = input.chores.length;
  const IDEAL_ROW = 104;
  const MIN_ROW = 62;
  let rowH: number;
  let shown: number;
  let truncated = false;

  if (total === 0) {
    rowH = IDEAL_ROW;
    shown = 0;
  } else if (total * IDEAL_ROW <= availH) {
    rowH = Math.min(IDEAL_ROW, availH / total);
    shown = total;
  } else if (total * MIN_ROW <= availH) {
    // Shrink rows to compact everything onto one page.
    rowH = availH / total;
    shown = total;
  } else {
    // Still won't fit even compacted — truncate to the ones that do (daily first).
    rowH = MIN_ROW;
    shown = Math.max(1, Math.floor(availH / MIN_ROW));
    truncated = true;
  }

  const chores = input.chores.slice(0, shown);
  const rowsBottom = rowsTop + chores.length * rowH;

  const dayLabels = Array.from({ length: 7 }, (_, i) => ({
    label: format(addDays(monday, i), "EEE"),
    date: format(addDays(monday, i), "d"),
  }));

  // day column tints (full height behind header + rows)
  for (let d = 0; d < 7; d++) {
    const cx = daysX + d * dayW;
    ctx.fillStyle = tint(PASTEL_HEX[PALETTE_ORDER[d]], 0.62);
    roundRect(ctx, cx + 4, gridTop, dayW - 8, rowsBottom - gridTop, 16);
    ctx.fill();
  }

  // column headers
  ctx.textAlign = "center";
  for (let d = 0; d < 7; d++) {
    const cx = daysX + d * dayW + dayW / 2;
    ctx.fillStyle = INK;
    ctx.font = '700 30px "Nunito Sans Variable", system-ui, sans-serif';
    ctx.fillText(dayLabels[d].label, cx, gridTop + 30);
    ctx.fillStyle = INK_SOFT;
    ctx.font = '400 22px "Nunito Sans Variable", system-ui, sans-serif';
    ctx.fillText(dayLabels[d].date, cx, gridTop + 56);
  }

  // "Chore" label header
  ctx.textAlign = "left";
  ctx.fillStyle = INK_SOFT;
  ctx.font = '700 26px "Nunito Sans Variable", system-ui, sans-serif';
  ctx.fillText("Chore", contentX + 6, gridTop + 42);

  // rows
  const iconSize = Math.min(rowH * 0.5, 46);
  const nameSize = Math.max(20, Math.min(34, Math.round(rowH * 0.28)));
  const boxSize = Math.min(dayW, rowH) * 0.52;

  chores.forEach((c, i) => {
    const ry = rowsTop + i * rowH;
    const rmid = ry + rowH / 2;

    // zebra separator
    if (i > 0) {
      ctx.strokeStyle = "rgba(60,47,38,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentX + 6, ry);
      ctx.lineTo(daysX - 8, ry);
      ctx.stroke();
    }

    // icon — the chore's current illustration (falls back to a plain dot,
    // never the raw icon string, so a broken/loading image never prints a URL)
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const img = iconImages.get(c.icon);
    if (img) {
      ctx.drawImage(img, contentX + 8, rmid - iconSize / 2, iconSize, iconSize);
    } else if (isUrlIcon(c.icon) || isIconKey(c.icon)) {
      // image intended but unavailable (offline) — soft placeholder, not the URL text
      ctx.fillStyle = tint(PASTEL_HEX[c.color], 0.5);
      roundRect(ctx, contentX + 8, rmid - iconSize / 2, iconSize, iconSize, iconSize * 0.28);
      ctx.fill();
    } else {
      // a bare emoji/glyph icon
      ctx.font = `${iconSize}px "Nunito Sans Variable", system-ui, sans-serif`;
      ctx.fillText(c.icon, contentX + 8, rmid);
    }

    // name
    ctx.fillStyle = INK;
    ctx.font = `700 ${nameSize}px "Nunito Sans Variable", system-ui, sans-serif`;
    const nameX = contentX + 8 + iconSize + 18;
    const pointsW = 84;
    ctx.fillText(fitText(ctx, c.name, labelColW - (nameX - contentX) - pointsW), nameX, rmid);

    // points pill
    const pillText = `+${c.points}`;
    ctx.font = `700 ${Math.round(nameSize * 0.72)}px "Nunito Sans Variable", system-ui, sans-serif`;
    const pw = ctx.measureText(pillText).width + 26;
    const ph = nameSize + 8;
    const px = daysX - pw - 12;
    ctx.fillStyle = INK;
    roundRect(ctx, px, rmid - ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = "#FDFBF5";
    ctx.textAlign = "center";
    ctx.fillText(pillText, px + pw / 2, rmid + 1);

    // tick boxes per day
    for (let d = 0; d < 7; d++) {
      const bx = daysX + d * dayW + (dayW - boxSize) / 2;
      const by = rmid - boxSize / 2;
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, bx, by, boxSize, boxSize, boxSize * 0.28);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,47,38,0.35)";
      ctx.lineWidth = 2.5;
      roundRect(ctx, bx, by, boxSize, boxSize, boxSize * 0.28);
      ctx.stroke();
    }
  });

  if (chores.length === 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK_SOFT;
    ctx.font = '400 30px "Nunito Sans Variable", system-ui, sans-serif';
    ctx.fillText("No recurring chores yet — add some in the Library!", CANVAS_W / 2, rowsTop + 80);
  }

  // ---- footer note ----
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const footerY = CANVAS_H - M - footerH / 2;
  ctx.fillStyle = tint(PASTEL_HEX.butter, 0.45);
  roundRect(ctx, contentX, footerY - 42, contentW, 84, 24);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = '700 30px "Nunito Sans Variable", system-ui, sans-serif';
  ctx.fillText(
    "Colour a box in when you do it — a grown-up will pop it into the app.",
    CANVAS_W / 2,
    footerY,
  );

  return { canvas, shown: chores.length, total, truncated };
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function slug(s: string): string {
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
