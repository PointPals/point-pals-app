import { useEffect, useRef } from "react";
import { playClink } from "@/lib/feedback";

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
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  hue: string; // lighter highlight tint
  active: boolean;
};

const MARBLE_PALETTE: [string, string][] = [
  ["#8FC7EA", "#C3E2F5"], // sky
  ["#F1D36A", "#F8E6A6"], // butter
  ["#9CD08C", "#C6E7BC"], // sage
  ["#EDA6B2", "#F6CBD3"], // blush
  ["#B79BE0", "#D7C7F0"], // lilac
  ["#E0B673", "#F0D6A8"], // sand
  ["#84CFCB", "#B8E5E2"], // foam
];

export function MarbleJar({
  value,
  target,
  size = 260,
  reducedMotion = false,
  onFull,
  className,
}: {
  value: number;
  target: number;
  size?: number;
  reducedMotion?: boolean;
  onFull?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marbles = useRef<Marble[]>([]);
  const raf = useRef<number | null>(null);
  const lastCount = useRef(0);
  const firedFull = useRef(false);
  const clinkAt = useRef(0);

  // How many marbles the jar shows — honest fraction of target, capped so the
  // jar can physically hold them. Each marble ≈ one point until the cap, then
  // marbles represent proportional chunks so a full jar still means "reached".
  const cap = 90;
  const perMarble = target > cap ? target / cap : 1;
  const shown = Math.min(Math.round(value / perMarble), Math.round(target / perMarble));
  const full = value >= target;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = size;
    const H = Math.round(size * 1.18);
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

    function spawn(color: [string, string]) {
      marbles.current.push({
        x: (left + right) / 2 + (Math.random() - 0.5) * innerW * 0.35,
        y: top - R,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.5,
        r: R * (0.92 + Math.random() * 0.16),
        color: color[0],
        hue: color[1],
        active: true,
      });
    }

    // Reconcile marble count with `shown`.
    const diff = shown - lastCount.current;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const c = MARBLE_PALETTE[(lastCount.current + i) % MARBLE_PALETTE.length];
        if (reducedMotion) {
          // Place directly near the resting pile without animating.
          marbles.current.push({
            x: (left + right) / 2 + (Math.random() - 0.5) * innerW * 0.7,
            y:
              bottom -
              R -
              Math.random() * (bottom - top) * (lastCount.current / Math.max(totalTarget, 1)),
            vx: 0,
            vy: 0,
            r: R * (0.92 + Math.random() * 0.16),
            color: c[0],
            hue: c[1],
            active: true,
          });
        } else {
          spawn(c);
        }
      }
    } else if (diff < 0) {
      marbles.current.splice(shown);
    }
    lastCount.current = shown;

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
        const grd = ctx.createRadialGradient(
          m.x - m.r * 0.35,
          m.y - m.r * 0.4,
          m.r * 0.1,
          m.x,
          m.y,
          m.r,
        );
        grd.addColorStop(0, m.hue);
        grd.addColorStop(1, m.color);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // glossy speck
        ctx.beginPath();
        ctx.arc(m.x - m.r * 0.34, m.y - m.r * 0.38, m.r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
      }
      ctx.restore();

      // front glass: rim, outline + shine highlight
      ctx.save();
      // rim / lid
      ctx.beginPath();
      ctx.roundRect(left - W * 0.03, neckTop, innerW + W * 0.06, rimH, rimH / 2);
      const rim = ctx.createLinearGradient(0, neckTop, 0, neckTop + rimH);
      rim.addColorStop(0, "rgba(255,255,255,0.85)");
      rim.addColorStop(1, "rgba(210,224,232,0.7)");
      ctx.fillStyle = rim;
      ctx.fill();

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
          if (m.y > bottom - m.r * 1.4 && Math.abs(m.vy) > 2.2) {
            playClink((Math.random() - 0.5) * 260);
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
  }, [shown, size, target, perMarble, reducedMotion]);

  // Fire the "full" celebration exactly once when we cross the target.
  useEffect(() => {
    if (full && !firedFull.current) {
      firedFull.current = true;
      onFull?.();
    }
    if (!full) firedFull.current = false;
  }, [full, onFull]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className={full ? "animate-jar-glow rounded-3xl" : "rounded-3xl"}
        aria-hidden
      />
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
