// The picture a visit sends home: a 4:5 card (fits a text message or a
// WhatsApp chat nicely) showing what a visiting friend did and the points
// they earned, for their own parent to add to whatever system they use.

import { companionArtUrl } from "./companion-assets";
import { iconUrl, isIconKey } from "./icons";
import { PASTEL_HEX } from "./mock-data";
import { TINT_HEX } from "./companion-tints";
import {
  downloadBlob,
  ensureFonts,
  fitText,
  loadImage,
  roundRect,
  slug,
  tint,
} from "./printable-chart";
import { reportTotal, type VisitReport } from "./visitors";

const W = 1080;
const H = 1350;
const INK = "#231B33";
const INK_SOFT = "#6B6380";
const CREAM = "#FBF6EE";
const DISPLAY = '"Fraunces Variable", Georgia, serif';
const SANS = '"Figtree Variable", system-ui, sans-serif';
const MAX_ROWS = 7;

/** "The Harper Family" → "the Harper Family’s place" (for "at … today"). */
export function hostPlace(host: string): string {
  const h = host.trim();
  if (!h) return "a friend’s place";
  return `${h.replace(/^The\s/, "the ")}’s place`;
}

function formatDay(iso: string): string {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(251,246,238,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function marble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, tint(color, 0.7));
  g.addColorStop(0.55, color);
  g.addColorStop(1, tint(color, -0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderVisitCard(report: VisitReport): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const wash = PASTEL_HEX[report.color ?? "sky"] ?? PASTEL_HEX.sky;
  const accent = TINT_HEX[report.color ?? "sky"] ?? TINT_HEX.sky;
  const total = reportTotal(report);

  // Cream page with soft marble-colour light — no dark surfaces.
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  blob(ctx, 120, 140, 520, "rgba(165,123,240,0.28)");
  blob(ctx, 980, 260, 480, "rgba(57,195,216,0.24)");
  blob(ctx, 540, 1320, 620, "rgba(245,184,65,0.22)");

  // Header: wordmark + day
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `600 46px ${DISPLAY}`;
  ctx.textAlign = "left";
  ctx.fillText("PointPals", 72, 104);
  marble(ctx, 72 + ctx.measureText("Point").width - 2, 60, 9, "#F5B841");
  ctx.font = `600 26px ${SANS}`;
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = "right";
  ctx.fillText(formatDay(report.date), W - 72, 100);

  // Character on their colour
  const cx = W / 2;
  const cy = 330;
  const cr = 150;
  ctx.save();
  ctx.shadowColor = "rgba(35,27,51,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const art = report.companionId ? companionArtUrl(report.companionId) : undefined;
  if (art) {
    try {
      const img = await loadImage(art);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.clip();
      const s = cr * 2 * 0.92;
      ctx.drawImage(img, cx - s / 2, cy - s / 2 + 10, s, s);
      ctx.restore();
    } catch {
      /* no art — the coloured circle still reads as their badge */
    }
  }

  // Headline
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `600 76px ${DISPLAY}`;
  ctx.fillText(fitText(ctx, `${report.friend} was a star!`, W - 144), cx, 590);
  ctx.font = `500 32px ${SANS}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(fitText(ctx, `Points earned at ${hostPlace(report.host)}`, W - 160), cx, 642);

  // Points pill
  const pillText = `+${total} ${total === 1 ? "point" : "points"}`;
  ctx.font = `700 44px ${SANS}`;
  const pw = ctx.measureText(pillText).width + 140;
  const px = cx - pw / 2;
  const py = 682;
  ctx.save();
  ctx.shadowColor = "rgba(35,27,51,0.16)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  const pg = ctx.createLinearGradient(px, py, px + pw, py);
  pg.addColorStop(0, "#7B4FD6");
  pg.addColorStop(1, "#3F5BD9");
  ctx.fillStyle = pg;
  roundRect(ctx, px, py, pw, 92, 46);
  ctx.fill();
  ctx.restore();
  marble(ctx, px + 52, py + 46, 18, accent);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.fillText(pillText, px + 86, py + 62);

  // What they did
  const listX = 72;
  const listY = 812;
  const rowH = 62;
  const rows = report.lines.slice(0, MAX_ROWS);
  const more = report.lines.length - rows.length;
  const listH = 40 + rows.length * rowH + (more > 0 ? 44 : 0) + 16;
  ctx.save();
  ctx.shadowColor = "rgba(35,27,51,0.10)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, listX, listY, W - listX * 2, listH, 36);
  ctx.fill();
  ctx.restore();

  const icons = await Promise.all(
    rows.map((r) => {
      const url = isIconKey(r.icon) ? iconUrl(r.icon) : undefined;
      return url ? loadImage(url).catch(() => null) : null;
    }),
  );
  rows.forEach((r, i) => {
    const y = listY + 28 + i * rowH;
    const midY = y + rowH / 2;
    ctx.fillStyle = tint(wash, 0.35);
    roundRect(ctx, listX + 28, y + 6, 50, 50, 14);
    ctx.fill();
    const icon = icons[i];
    if (icon) {
      ctx.drawImage(icon, listX + 31, y + 9, 44, 44);
    } else {
      ctx.font = `30px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = INK;
      ctx.fillText(isIconKey(r.icon) ? "⭐" : r.icon, listX + 53, midY + 11);
    }
    ctx.textAlign = "right";
    ctx.font = `700 30px ${SANS}`;
    ctx.fillStyle = INK;
    const pts = `+${r.points * r.count}`;
    ctx.fillText(pts, W - listX - 32, midY + 10);
    const right = W - listX - 32 - ctx.measureText(pts).width - 24;
    ctx.textAlign = "left";
    ctx.font = `600 30px ${SANS}`;
    const label = r.count > 1 ? `${r.name}  ×${r.count}` : r.name;
    ctx.fillText(fitText(ctx, label, right - (listX + 98)), listX + 98, midY + 10);
  });
  if (more > 0) {
    ctx.font = `600 26px ${SANS}`;
    ctx.fillStyle = INK_SOFT;
    ctx.textAlign = "left";
    ctx.fillText(
      `+ ${more} more good ${more === 1 ? "thing" : "things"}`,
      listX + 98,
      listY + 28 + rows.length * rowH + 32,
    );
  }

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `600 34px ${DISPLAY}`;
  ctx.fillText(fitText(ctx, `Add them to ${report.friend}’s jar at home`, W - 160), cx, H - 112);
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText("pointpals.co.nz · free for every family", cx, H - 66);

  return canvas;
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/** Share the card (with the link in the message) through the phone's share
 * sheet; where file sharing isn't supported, download the picture instead. */
export async function shareVisitCard(report: VisitReport, url: string): Promise<ShareResult> {
  const canvas = await renderVisitCard(report);
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not draw the card"))),
      "image/png",
    ),
  );
  const filename = `${slug(report.friend)}-visit-${report.date || "today"}.png`;
  const total = reportTotal(report);
  const text = `${report.friend} earned ${total} ${total === 1 ? "point" : "points"} at ${hostPlace(report.host)} today! See what they did: ${url}`;
  const file = new File([png], filename, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: `${report.friend}’s visit` });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Fall through to a download if the share sheet failed for another reason.
    }
  }
  downloadBlob(png, filename);
  return "downloaded";
}
