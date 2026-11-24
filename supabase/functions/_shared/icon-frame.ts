// Shared framing for custom icons (upload-icon and generate-icon).
//
// Both functions end with a transparent PNG whose drawing may sit in a wide
// empty margin — a photo's background, or the padding the image model leaves
// around a generated icon. Cropping to the drawing and re-centring it on a
// tight square makes custom icons the same size as the built-in set.

// @ts-ignore — pngjs loaded via npm: specifier for Deno compat
import pngjs from "npm:pngjs@7.0.0";

/** Margin around the drawing, as a fraction of its size on each side. The
 *  built-in icons are drawn almost edge to edge, so keep this small. */
export const ICON_PADDING = 0.06;

/**
 * Crop the subject to its bounding box, then re-center on a padded square
 * canvas so uploaded/photo icons fill roughly the same proportion as the
 * pre-made icon library (subject ≈80 % of tile width/height).
 *
 * Without this, a portrait photo ends up as a small floating head in a sea
 * of transparent pixels — looks much smaller than the square pre-made icons.
 */
export function cropAndPadToSquare(raw: Uint8Array, paddingFrac = ICON_PADDING): Uint8Array {
  try {
    const png = pngjs.PNG.sync.read(raw);
    const { width, height, data } = png;

    // ── 1. Find bounding box of non‑transparent pixels ────────────────
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let opaquePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 30) { // 30 = nearly-transparent threshold
          opaquePixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If no opaque pixels or already fills most of the canvas, skip
    if (opaquePixels < 50) return raw;
    const fillRatio = opaquePixels / (width * height);
    if (fillRatio > 0.65) return raw; // already fills enough space

    // ── 2. Expand bounding box by padding ─────────────────────────────
    const subjectW = maxX - minX + 1;
    const subjectH = maxY - minY + 1;
    const padX = Math.max(Math.round(subjectW * paddingFrac), 4);
    const padY = Math.max(Math.round(subjectH * paddingFrac), 4);

    const cropLeft = Math.max(0, minX - padX);
    const cropTop = Math.max(0, minY - padY);
    const cropRight = Math.min(width - 1, maxX + padX);
    const cropBottom = Math.min(height - 1, maxY + padY);
    const cropW = cropRight - cropLeft + 1;
    const cropH = cropBottom - cropTop + 1;

    // ── 3. Create new square canvas, center the cropped subject ───────
    const size = Math.max(cropW, cropH);
    const out = new pngjs.PNG({ width: size, height: size });
    const outData = out.data;
    // Initialise to fully transparent (already zeroed by pngjs constructor)

    const offsetX = Math.floor((size - cropW) / 2);
    const offsetY = Math.floor((size - cropH) / 2);

    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcIdx = ((cropTop + y) * width + (cropLeft + x)) * 4;
        const dstIdx = ((offsetY + y) * size + (offsetX + x)) * 4;
        outData[dstIdx] = data[srcIdx];
        outData[dstIdx + 1] = data[srcIdx + 1];
        outData[dstIdx + 2] = data[srcIdx + 2];
        outData[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    return pngjs.PNG.sync.write(out);
  } catch {
    return raw;
  }
}
