import { useEffect, useState, type CSSProperties } from "react";

/**
 * Framing for custom (uploaded / AI-generated) icons that carry a wide empty
 * margin around the drawing — AI icons made before the server started
 * cropping them looked noticeably smaller than the built-in set. We measure
 * where the drawing sits once per image (cached on this device) and zoom the
 * <img> inside its box so the drawing fills it like a built-in icon.
 */

/** Where the drawing sits, as fractions of the (square) image. */
type IconBox = { x: number; y: number; w: number; h: number };

const STORE_KEY = "pointpals.iconFrame.v1";
const MAX_ENTRIES = 200;
// How much of the box the drawing's longer side should fill — the built-in
// icons run almost edge to edge.
const FILL = 0.9;

let cache: Map<string, IconBox | null> | null = null;
const inflight = new Map<string, Promise<IconBox | null>>();

function store(): Map<string, IconBox | null> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, IconBox | null][]) cache.set(k, v);
  } catch {
    /* storage blocked — measure each session */
  }
  return cache;
}

function remember(url: string, box: IconBox | null) {
  const c = store();
  c.set(url, box);
  try {
    const entries = [...c.entries()].slice(-MAX_ENTRIES);
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch {
    /* session-only */
  }
}

function measure(url: string): Promise<IconBox | null> {
  const known = store();
  if (known.has(url)) return Promise.resolve(known.get(url) ?? null);
  const running = inflight.get(url);
  if (running) return running;
  const job = new Promise<IconBox | null>((resolve) => {
    // A separate, CORS-mode image: reading pixels needs it, and if the
    // server won't allow that we simply leave the icon as it is.
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const { naturalWidth: nw, naturalHeight: nh } = img;
        if (!nw || !nh || Math.abs(nw / nh - 1) > 0.02) return resolve(null);
        const N = 96;
        const canvas = document.createElement("canvas");
        canvas.width = N;
        canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, N, N);
        const d = ctx.getImageData(0, 0, N, N).data;
        let minX = N,
          minY = N,
          maxX = -1,
          maxY = -1;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const i = (y * N + x) * 4;
            // Background is transparent, or near-white if knock-out failed.
            const bg = d[i + 3] < 24 || (d[i] > 238 && d[i + 1] > 238 && d[i + 2] > 238);
            if (bg) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        resolve(
          maxX < 0
            ? null
            : { x: minX / N, y: minY / N, w: (maxX - minX + 1) / N, h: (maxY - minY + 1) / N },
        );
      } catch {
        resolve(null); // canvas tainted (no CORS) or decode trouble
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  }).then((box) => {
    inflight.delete(url);
    remember(url, box);
    return box;
  });
  inflight.set(url, job);
  return job;
}

/**
 * Style for an <img> placed inside a square, overflow-hidden box: positions
 * and scales it so the measured drawing fills the box. Null when the icon is
 * already well framed (or couldn't be measured) — render it as usual.
 */
export function useIconFrame(url: string | undefined): CSSProperties | null {
  const [box, setBox] = useState<IconBox | null>(() =>
    url && typeof window !== "undefined" ? (store().get(url) ?? null) : null,
  );
  useEffect(() => {
    if (!url) return;
    let alive = true;
    void measure(url).then((b) => alive && setBox(b));
    return () => {
      alive = false;
    };
  }, [url]);
  if (!box) return null;
  const scale = FILL / Math.max(box.w, box.h);
  if (scale < 1.08) return null; // already fills its box
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    position: "absolute",
    width: `${scale * 100}%`,
    height: `${scale * 100}%`,
    maxWidth: "none",
    left: `${(0.5 - scale * cx) * 100}%`,
    top: `${(0.5 - scale * cy) * 100}%`,
  };
}
