import { useEffect, useRef, useState } from "react";
import { playClink, playChime } from "@/lib/feedback";
import { type Kid, type PointEvent } from "@/lib/mock-data";

// The marble jar — PointPals' emotional centrepiece (§3).
//
// A soft-rendered glass jar that fills with coloured marbles as the family's
// shared pool grows. Every new point drops a marble that falls, bounces gently
// and settles into a *loose* pile (a tiny real physics sim, not a grid), with a
// glassy clink. Fill level is an honest read of pool / target. When it fills,
// the caller is told via onFull so it can fire confetti + fanfare + the reward
// flow.
//
// Rendered on a single <canvas> so marble clipping, stacking and the drop
// animation stay smooth and off the React commit path.

type Marble = {
  id: string; // stable id derived from the originating event (Phase 1)
  kidId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  hue: string; // lighter highlight tint
  active: boolean;
  // Dissolve animation state: when a marble's contributing event is undone
  // (negative point removed a marble), it fades and shrinks over ~600ms
  // before being spliced out — leaving space for the remaining marbles to
  // roll into (§3 phase 2). null = not dissolving.
  dissolveStart: number | null;
};

// Slightly saturated versions of PASTEL_HEX so marbles read as coloured glass
// against the cream background rather than washed-out pastels.
const MARBLE_TINT: Record<string, [string, string]> = {
  sky: ["#8FC7EA", "#C3E2F5"],
  butter: ["#F1D36A", "#F8E6A6"],
  sage: ["#9CD08C", "#C6E7BC"],
  blush: ["#EDA6B2", "#F6CBD3"],
  lilac: ["#B79BE0", "#D7C7F0"],
  sand: ["#E0B673", "#F0D6A8"],
  foam: ["#84CFCB", "#B8E5E2"],
  orange: ["#F0A858", "#F8CCA0"],
};

const DEFAULT_TINT: [string, string] = ["#B79BE0", "#D7C7F0"];
const DISSOLVE_MS = 600;

// Synthetic marble set for callers (marketing hero) that don't have a real
// event log. New marbles get the tint from the latest pending drop (if any)
// so the bubble colour matches the marble that falls into the jar.
function buildSynthetic(
  value: number,
  target: number,
  perMarble: number,
  cap: number,
  delta: number,
  newDropTint?: string,
) {
  const count = Math.min(
    Math.round(Math.max(0, value) / perMarble),
    Math.round(target / perMarble),
    cap,
  );
  const palette = Object.values(MARBLE_TINT);
  const list: { id: string; kidId: string; color: string; hue: string }[] = [];
  const newTint = newDropTint ? MARBLE_TINT[newDropTint] ?? DEFAULT_TINT : null;

  for (let i = 0; i < count; i++) {
    // The last `delta` marbles get the new drop colour. Earlier entries recycle
    // through the palette — they already exist in `marbles.current` so the
    // reconciliation skips them and their runtime colour is preserved.
    if (newTint && i >= count - delta) {
      list.push({ id: `syn-${i}`, kidId: "syn", color: newTint[0], hue: newTint[1] });
    } else {
      const t = palette[i % palette.length];
      list.push({ id: `syn-${i}`, kidId: "syn", color: t[0], hue: t[1] });
    }
  }
  return list;
}

// Build the deterministic desired marble list from the event log. Walking
// chronologically means the marble stack ends up in the same order every time
// the component re-renders — critical for stable ids so the diff below can
// tell "this marble is new" from "this marble was already here". Positive
// events push kid-coloured marbles; negatives pop them, preferring one of
// that kid's own marbles first (§3 phase 1 — "who contributed").
//
// If the event log's implied pool falls short of `fallbackValue`, the gap is
// filled with neutral-colour synthetic marbles so the jar always represents
// the actual sharedPool — even after a browser storage clear or data reset.
function buildDesired(
  events: PointEvent[],
  kids: Kid[],
  target: number,
  perMarble: number,
  cap: number,
  fallbackValue?: number,
): { id: string; kidId: string; color: string; hue: string }[] {
  // Marble tint is the kid's chosen background colour (PastelKey), not the
  // companion's colour story — two kids with different backgrounds should
  // have visibly distinct marbles even if they chose the same companion.
  const kidTintKey = new Map<string, string>();
  for (const k of kids) {
    kidTintKey.set(k.id, k.color);
  }

  // Oldest first
  const asc = [...events].sort((a, b) => a.at - b.at);

  let pool = 0;
  const list: { id: string; kidId: string; color: string; hue: string }[] = [];

  for (const e of asc) {
    const beforeCount = Math.round(pool / perMarble);
    pool = Math.max(0, pool + e.points);
    const afterCount = Math.min(
      Math.round(pool / perMarble),
      Math.round(target / perMarble),
    );
    let diff = afterCount - beforeCount;

    const key = kidTintKey.get(e.kidId) ?? "lilac";
    const tint = MARBLE_TINT[key] ?? DEFAULT_TINT;

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        list.push({
          id: `${e.id}-${i}`,
          kidId: e.kidId,
          color: tint[0],
          hue: tint[1],
        });
      }
    } else if (diff < 0) {
      let toRemove = -diff;
      while (toRemove > 0 && list.length > 0) {
        let idx = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].kidId === e.kidId) {
            idx = i;
            break;
          }
        }
        if (idx < 0) idx = list.length - 1;
        list.splice(idx, 1);
        toRemove--;
      }
    }
  }

  // If the fallback value indicates the jar should have fewer marbles than the
  // event log builds (e.g. after a reward cycle reset), trim the list so the jar
  // empties truthfully. Trim from the START (oldest events) so newly-earned
  // marbles (from the current reward cycle) survive — this keeps the visible
  // marble colours aligned with personalPool / sharedPool.
  const desiredCount = Math.min(
    Math.round(Math.max(0, fallbackValue ?? pool) / perMarble),
    Math.round(target / perMarble),
    cap,
  );
  if (list.length > desiredCount) {
    list.splice(0, list.length - desiredCount);
  }

  // Fill any remaining gap with synthetic neutral marbles so the jar always
  // has the right number of marbles even when history is sparse.
  const neutral = MARBLE_TINT.sand ?? DEFAULT_TINT;
  while (list.length < desiredCount) {
    list.push({
      id: `gap-${list.length}`,
      kidId: "gap",
      color: neutral[0],
      hue: neutral[1],
    });
  }

  // Cap: keep the newest `cap` marbles so an old jar full of ancient events
  // doesn't stall the physics.
  if (list.length > cap) list.splice(0, list.length - cap);
  return list;
}

export function MarbleJar({
  value,
  target,
  events,
  kids,
  size = 260,
  reducedMotion = false,
  pendingDrops,
  onFull,
  className,
  suppressDissolveChime = false,
  suppressClink = false,
}: {
  value: number;
  target: number;
  events?: PointEvent[];
  kids?: Kid[];
  size?: number;
  reducedMotion?: boolean;
  /** Marketing-hero drops only: each entry is one bubble's worth of tinted
   *  points that should colour the newly-added marbles. Cleared automatically
   *  after consumption. */
  pendingDrops?: { n: number; tint: string }[];
  onFull?: () => void;
  className?: string;
  /** Marketing hero recycles the jar to 0 when full — that mass-dissolve is
   *  a celebration reset, not a negative event, so don't play the dull chime. */
  suppressDissolveChime?: boolean;
  /** Marketing hero: replace the glassy clink with a positive chime
   *  when fresh marbles land. */
  suppressClink?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const marbles = useRef<Marble[]>([]);
  const raf = useRef<number | null>(null);
  const firedFull = useRef(false);
  const clinkAt = useRef(0);
  // Guard so the initial hydration doesn't announce every pre-existing marble
  // as a fresh drop (would spam the dull chime on page load).
  const primed = useRef(false);
  // Track the previous marble count so we know how many are genuinely new
  // when pendingDrops arrive for the marketing hero.
  const prevSynCount = useRef(0);

  // Effective render size: capped to the container width so the jar never
  // overflows a narrow screen, and re-measured on resize / orientation change
  // (§3d) so the canvas backing store stays crisp instead of stretched-blurry.
  const [renderSize, setRenderSize] = useState(size);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") {
      setRenderSize(size);
      return;
    }
    const measure = () => {
      const w = wrap.clientWidth || size;
      setRenderSize(Math.max(80, Math.min(size, Math.round(w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // Orientation change can also swap devicePixelRatio; re-measure on resize.
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [size]);

  // How many marbles the jar shows — honest fraction of target, capped so the
  // jar can physically hold them. Each marble == one point up to the cap, then
  // marbles represent proportional chunks so a full jar still means "reached".
  // Cap is 100 (the default reward target) so the common case maps one marble
  // to one point exactly — below the cap, `perMarble` is 1 and no rounding can
  // drop a marble (e.g. 8 points showed 7 marbles when the cap was 90).
  const cap = 100;
  const perMarble = target > cap ? target / cap : 1;
  const full = value >= target;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = renderSize;
    const H = Math.round(renderSize * 1.18);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // ---- Jar interior geometry (logical px) ----
    const neckTop = H * 0.1;
    const rimH = H * 0.06;
    const left = W * 0.15;
    const right = W * 0.85;
    const bottom = H * 0.9;
    const top = H * 0.2; // marbles live below the neck
    const br = W * 0.16; // bottom corner radius
    const innerW = right - left;

    // Marble radius sized so `target` marbles fill to the top.
    const totalTarget = Math.round(target / perMarble);
    const jarArea = innerW * (bottom - top);
    // packing efficiency ~0.72 for loose circles
    const rFit = Math.sqrt((jarArea * 0.72) / (Math.max(totalTarget, 1) * Math.PI));
    const R = Math.max(4, Math.min(rFit, innerW / 5));

    function spawn(m: { id: string; kidId: string; color: string; hue: string }) {
      marbles.current.push({
        id: m.id,
        kidId: m.kidId,
        x: (left + right) / 2 + (Math.random() - 0.5) * innerW * 0.35,
        y: top - R,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.5,
        r: R * (0.92 + Math.random() * 0.16),
        color: m.color,
        hue: m.hue,
        active: true,
        dissolveStart: null,
      });
    }

    // Reconcile marbles against the desired set. Diff by stable id so we know
    // which marbles are genuinely new (→ drop) vs which vanished (→ dissolve).
    // When callers don't supply real events (marketing hero), synthesize a
    // stable set from `value` so the jar still fills honestly.
    //
    // For the synthetic path, compute how many marbles are new since the last
    // render so the corresponding tint from pendingDrops colours them.
    const synCount = Math.min(
      Math.round(Math.max(0, value) / perMarble),
      Math.round(target / perMarble),
      cap,
    );
    const synDelta = synCount - prevSynCount.current;
    prevSynCount.current = synCount;
    const latestDropTint =
      Array.isArray(pendingDrops) && pendingDrops.length > 0
        ? pendingDrops[pendingDrops.length - 1].tint
        : undefined;
    const desired = events && kids
      ? buildDesired(events, kids, target, perMarble, cap, value)
      : buildSynthetic(value, target, perMarble, cap, synDelta, latestDropTint);
    const desiredIds = new Set(desired.map((d) => d.id));
    const currentIds = new Set(marbles.current.map((m) => m.id));

    // Mark disappeared marbles for dissolve — do NOT splice yet; they animate
    // out over DISSOLVE_MS. If we're not yet primed (first render), remove
    // silently so we don't dull-chime every historical marble.
    let dissolvedThisPass = 0;
    for (const m of marbles.current) {
      if (!desiredIds.has(m.id) && m.dissolveStart === null) {
        if (!primed.current || reducedMotion) {
          m.dissolveStart = performance.now() - DISSOLVE_MS; // instant
        } else {
          m.dissolveStart = performance.now();
          dissolvedThisPass++;
        }
      }
    }
    if (dissolvedThisPass > 0 && !suppressDissolveChime) {
      // Dull "needs work" chime plays once per event batch — the marble is
      // visibly dissolving to reinforce the same beat.
      playChime("needs-work");
    }

    // Spawn new marbles in the order they appear in `desired`. Preserve the
    // existing marbles' physics state; only the fresh ones drop from the top.
    for (const d of desired) {
      if (currentIds.has(d.id)) continue;
      if (reducedMotion || !primed.current) {
        // Place directly in the pile — no animation on initial hydration.
        marbles.current.push({
          id: d.id,
          kidId: d.kidId,
          x: (left + right) / 2 + (Math.random() - 0.5) * innerW * 0.7,
          y: bottom - R - Math.random() * (bottom - top) * 0.6,
          vx: 0,
          vy: 0,
          r: R * (0.92 + Math.random() * 0.16),
          color: d.color,
          hue: d.hue,
          active: true,
          dissolveStart: null,
        });
      } else {
        spawn(d);
      }
    }
    primed.current = true;

    function resolveWalls(m: Marble) {
      const rest = 0.34;
      if (m.x < left + m.r) {
        m.x = left + m.r;
        m.vx = Math.abs(m.vx) * rest;
      }
      if (m.x > right - m.r) {
        m.x = right - m.r;
        m.vx = -Math.abs(m.vx) * rest;
      }
      if (m.x > left + br && m.x < right - br) {
        if (m.y > bottom - m.r) {
          m.y = bottom - m.r;
          m.vy = -Math.abs(m.vy) * rest;
        }
      } else {
        const cx = m.x < left + br ? left + br : right - br;
        const cy = bottom - br;
        const dx = m.x - cx;
        const dy = m.y - cy;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const maxD = br - m.r;
        if (dy > 0 && dist > maxD) {
          const nx = dx / dist;
          const ny = dy / dist;
          m.x = cx + nx * maxD;
          m.y = cy + ny * maxD;
          const vn = m.vx * nx + m.vy * ny;
          if (vn > 0) {
            m.vx -= (1 + rest) * vn * nx;
            m.vy -= (1 + rest) * vn * ny;
          }
        }
      }
    }

    function step() {
      const list = marbles.current;
      const g = 0.34; // gentler gravity — marbles float down calmly
      let energy = 0;

      // Prune fully-dissolved marbles before physics — leaves a gap so the
      // marbles above roll down naturally (§3 phase 2).
      const now = performance.now();
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m.dissolveStart !== null && now - m.dissolveStart >= DISSOLVE_MS) {
          list.splice(i, 1);
        }
      }

      for (const m of list) {
        m.vy += g;
        m.x += m.vx;
        m.y += m.vy;
        resolveWalls(m);
      }
      // pairwise separation (simple, stable positional relaxation)
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.0001;
            const min = a.r + b.r;
            if (d < min) {
              const nx = dx / d;
              const ny = dy / d;
              const push = (min - d) / 2;
              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;
              const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (rvn < 0) {
                const imp = rvn * 0.5;
                a.vx += imp * nx;
                a.vy += imp * ny;
                b.vx -= imp * nx;
                b.vy -= imp * ny;
              }
            }
          }
          resolveWalls(list[i]);
        }
      }
      // friction + energy accounting
      for (const m of list) {
        m.vx *= 0.86;
        m.vy *= 0.98;
        energy += m.vx * m.vx + m.vy * m.vy;
        // While dissolving keep the physics energy pot alive so the sim
        // doesn't settle and freeze mid-fade.
        if (m.dissolveStart !== null) energy += 1;
      }
      return energy;
    }

    function drawJar() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // back glass (subtle fill so the jar reads as a vessel even when empty)
      ctx.save();
      jarPath(ctx, left, right, top - (top - neckTop) * 0.5, bottom, br, neckTop, rimH, W);
      const bg = ctx.createLinearGradient(0, top, 0, bottom);
      bg.addColorStop(0, "rgba(255,255,255,0.40)");
      bg.addColorStop(1, "rgba(224,236,244,0.28)");
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      if (!ctx) return;
      drawJar();

      // marbles, clipped to the jar interior
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom - br);
      ctx.arcTo(left, bottom, left + br, bottom, br);
      ctx.lineTo(right - br, bottom);
      ctx.arcTo(right, bottom, right, bottom - br, br);
      ctx.lineTo(right, top);
      ctx.closePath();
      ctx.clip();

      for (const m of marbles.current) {
        // Dissolve: shrink + fade over DISSOLVE_MS, then splice (in step()).
        let alpha = 1;
        let scale = 1;
        if (m.dissolveStart !== null) {
          const t = Math.min(1, (performance.now() - m.dissolveStart) / DISSOLVE_MS);
          alpha = 1 - t;
          scale = 1 - t * 0.4;
        }
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        const rr = m.r * scale;
        const grd = ctx.createRadialGradient(
          m.x - rr * 0.35,
          m.y - rr * 0.4,
          rr * 0.1,
          m.x,
          m.y,
          rr,
        );
        grd.addColorStop(0, m.hue);
        grd.addColorStop(1, m.color);
        ctx.beginPath();
        ctx.arc(m.x, m.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // glossy speck
        ctx.beginPath();
        ctx.arc(m.x - rr * 0.34, m.y - rr * 0.38, rr * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // front glass: rim, outline + shine highlight
      ctx.save();
      // rim / lid — brushed gold band with warm highlights
      const rimX = left - W * 0.03;
      const rimW = innerW + W * 0.06;
      ctx.beginPath();
      ctx.roundRect(rimX, neckTop, rimW, rimH, rimH / 2);
      const rim = ctx.createLinearGradient(rimX, neckTop, rimX + rimW, neckTop);
      rim.addColorStop(0, "#B8862F"); // deep gold shadow
      rim.addColorStop(0.25, "#E8C86A");
      rim.addColorStop(0.5, "#FBF3C4"); // bright highlight
      rim.addColorStop(0.75, "#D4A84A");
      rim.addColorStop(1, "#8F6B23"); // deep gold shadow
      ctx.fillStyle = rim;
      ctx.fill();
      // rim top highlight (thin bright band)
      ctx.beginPath();
      ctx.roundRect(rimX, neckTop, rimW, rimH * 0.35, rimH / 2);
      const rimTop = ctx.createLinearGradient(0, neckTop, 0, neckTop + rimH * 0.35);
      rimTop.addColorStop(0, "rgba(255,248,210,0.9)");
      rimTop.addColorStop(1, "rgba(255,248,210,0)");
      ctx.fillStyle = rimTop;
      ctx.fill();
      // rim bottom shadow (subtle depth)
      ctx.beginPath();
      ctx.rect(rimX, neckTop + rimH * 0.75, rimW, rimH * 0.25);
      const rimBot = ctx.createLinearGradient(0, neckTop + rimH * 0.75, 0, neckTop + rimH);
      rimBot.addColorStop(0, "rgba(90,60,20,0)");
      rimBot.addColorStop(1, "rgba(90,60,20,0.35)");
      ctx.fillStyle = rimBot;
      ctx.fill();
      // rim outline
      ctx.beginPath();
      ctx.roundRect(rimX, neckTop, rimW, rimH, rimH / 2);
      ctx.strokeStyle = "rgba(120,85,20,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // body outline
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom - br);
      ctx.arcTo(left, bottom, left + br, bottom, br);
      ctx.lineTo(right - br, bottom);
      ctx.arcTo(right, bottom, right, bottom - br, br);
      ctx.lineTo(right, top);
      ctx.lineTo(right, neckTop + rimH);
      ctx.moveTo(left, top);
      ctx.lineTo(left, neckTop + rimH);
      ctx.strokeStyle = "rgba(150,170,185,0.55)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // vertical shine highlight
      ctx.beginPath();
      ctx.roundRect(
        left + innerW * 0.12,
        top + (bottom - top) * 0.06,
        innerW * 0.1,
        (bottom - top) * 0.7,
        innerW * 0.05,
      );
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
      ctx.restore();
    }

    let settleFrames = 0;
    function loop() {
      const energy = step();
      draw();
      // soft clink when a fast-moving marble first touches down
      const now = performance.now();
      if (!reducedMotion && now - clinkAt.current > 90) {
        for (const m of marbles.current) {
          if (m.dissolveStart === null && m.y > bottom - m.r * 1.4 && Math.abs(m.vy) > 2.2) {
            if (suppressClink) {
              playChime("positive");
            } else {
              playClink((Math.random() - 0.5) * 260);
            }
            clinkAt.current = now;
            break;
          }
        }
      }
      if (energy < 0.05) {
        settleFrames++;
      } else {
        settleFrames = 0;
      }
      if (settleFrames < 8) {
        raf.current = requestAnimationFrame(loop);
      } else {
        raf.current = null;
        draw();
      }
    }

    // (re)start the sim
    if (raf.current == null) {
      raf.current = requestAnimationFrame(loop);
    } else {
      // already running; the new marbles will be picked up next frame
    }

    return () => {
      if (raf.current != null) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };
  }, [events, kids, renderSize, target, perMarble, reducedMotion, value, pendingDrops, suppressDissolveChime]);

  // Fire the "full" celebration exactly once when we cross the target.
  useEffect(() => {
    if (full && !firedFull.current) {
      firedFull.current = true;
      onFull?.();
    }
    if (!full) firedFull.current = false;
  }, [full, onFull]);

  return (
    <div ref={wrapRef} className={"relative " + (className ?? "")}>
      {/* Soft aurora halo behind the jar */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[40%]"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 55%, rgba(251,207,232,0.75), transparent 70%)," +
            "radial-gradient(45% 40% at 50% 45%, rgba(191,219,254,0.55), transparent 70%)," +
            "radial-gradient(35% 30% at 60% 30%, rgba(253,230,138,0.6), transparent 70%)",
          filter: "blur(6px)",
          animation: "pp-jar-halo 6s ease-in-out infinite",
        }}
      />
      <div className="relative" style={{ animation: "pp-jar-float 5s ease-in-out infinite" }}>
        <canvas
          ref={canvasRef}
          className={full ? "animate-jar-glow rounded-3xl" : "rounded-3xl"}
          aria-hidden
        />
        {/* Diagonal shine sweep across the glass */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          style={{ mixBlendMode: "screen" }}
        >
          <div
            className="absolute -inset-y-8 -left-1/2 w-1/3"
            style={{
              background:
                "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
              filter: "blur(8px)",
              animation: "pp-jar-shine 4.5s ease-in-out infinite",
            }}
          />
        </div>
        {/* Twinkling sparkles around the rim */}
        {[
          { top: "6%", left: "12%", d: "0s", s: 10 },
          { top: "10%", left: "78%", d: "-1.2s", s: 8 },
          { top: "22%", left: "92%", d: "-2s", s: 6 },
          { top: "72%", left: "4%", d: "-0.6s", s: 7 },
          { top: "88%", left: "88%", d: "-1.8s", s: 9 },
        ].map((s, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute rounded-full bg-white"
            style={{
              top: s.top,
              left: s.left,
              width: s.s,
              height: s.s,
              boxShadow: "0 0 12px 3px rgba(255,255,255,0.85)",
              animation: `pp-sparkle 2.4s ease-in-out ${s.d} infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Shared jar silhouette path (used for the translucent back fill).
function jarPath(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number,
  br: number,
  neckTop: number,
  rimH: number,
  W: number,
) {
  const innerW = right - left;
  ctx.beginPath();
  ctx.moveTo(left, neckTop + rimH);
  ctx.lineTo(left, bottom - br);
  ctx.arcTo(left, bottom, left + br, bottom, br);
  ctx.lineTo(right - br, bottom);
  ctx.arcTo(right, bottom, right, bottom - br, br);
  ctx.lineTo(right, neckTop + rimH);
  ctx.closePath();
  void innerW;
  void top;
  void W;
}
