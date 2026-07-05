import { useEffect, useRef } from "react";

// A short pastel confetti burst (§3 — the jar-full celebration). Fixed overlay,
// canvas-based, self-clearing. Pass a `fireKey` that changes each time you want
// a new burst; render nothing between bursts by keying/unmounting.

const PASTELS = ["#F1D36A", "#EDA6B2", "#B79BE0", "#9CD08C", "#8FC7EA", "#E0B673", "#84CFCB"];

export function Confetti({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vr: number;
      s: number;
      c: string;
      shape: number;
    };
    const parts: P[] = [];
    const cx = W / 2;
    const cy = H * 0.32;
    const N = 140;
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (2 + Math.random() * 9) * dpr;
      parts.push({
        x: cx + (Math.random() - 0.5) * 80 * dpr,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 6 * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        s: (5 + Math.random() * 6) * dpr,
        c: PASTELS[i % PASTELS.length],
        shape: Math.random() < 0.5 ? 0 : 1,
      });
    }

    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.22 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const fade = Math.max(0, 1 - elapsed / 2200);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.c;
        if (p.shape === 0) {
          ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (elapsed < 2300) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
        done.current?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="fixed inset-0 z-[60] pointer-events-none" aria-hidden />;
}
