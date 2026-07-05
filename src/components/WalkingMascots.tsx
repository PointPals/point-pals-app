import { memo, useEffect, useRef, useState } from "react";
import sunnyAsset from "@/assets/companions/sunny.png.asset.json";
import pipAsset from "@/assets/companions/pip.png.asset.json";
import brambleAsset from "@/assets/companions/bramble.png.asset.json";
import ziggyAsset from "@/assets/companions/ziggy.png.asset.json";
import ridgeAsset from "@/assets/companions/ridge.png.asset.json";
import codaAsset from "@/assets/companions/coda.png.asset.json";
import fernAsset from "@/assets/companions/fern.png.asset.json";
import marlowAsset from "@/assets/companions/marlow.png.asset.json";

/**
 * Full-width overlay: the PointPals mascots walk slowly across the bottom
 * of the hero section and occasionally emit a +N point bubble that floats
 * up-and-right toward the jar. Each landed bubble calls onPointsLand(n).
 */

// All 8 companions parade across in sequence. Same 26s duration keeps the pace
// even; delays are spread evenly across the full cycle (26 / 8 ≈ 3.25s apart)
// so there's always at least one on screen and they never bunch up. Sizes vary
// within a range for a lively, non-uniform feel.
const MASCOTS = [
  { src: sunnyAsset.url, alt: "Sunny", dur: "26s", delay: "0s", size: 156, bottom: "6%" },
  { src: pipAsset.url, alt: "Pip", dur: "26s", delay: "-3.25s", size: 132, bottom: "4%" },
  { src: brambleAsset.url, alt: "Bramble", dur: "26s", delay: "-6.5s", size: 150, bottom: "5%" },
  { src: ziggyAsset.url, alt: "Ziggy", dur: "26s", delay: "-9.75s", size: 138, bottom: "7%" },
  { src: ridgeAsset.url, alt: "Ridge", dur: "26s", delay: "-13s", size: 160, bottom: "4%" },
  { src: codaAsset.url, alt: "Coda", dur: "26s", delay: "-16.25s", size: 134, bottom: "6%" },
  { src: fernAsset.url, alt: "Fern", dur: "26s", delay: "-19.5s", size: 146, bottom: "5%" },
  { src: marlowAsset.url, alt: "Marlow", dur: "26s", delay: "-22.75s", size: 152, bottom: "7%" },
];

const BUBBLE_COLORS = ["#EC4899", "#F59E0B", "#10B981", "#60A5FA", "#A78BFA"];
const TICK_MS = 1800; // one point-bubble every 1.8s (slow, calm pace)
const FLY_MS = 2800; // 2.8s to arc up to the jar

type Bubble = { id: number; value: number; color: string; leftPct: number };

export const WalkingMascots = memo(function WalkingMascots({
  paused = false,
  onPointsLand,
}: {
  paused?: boolean;
  onPointsLand: (n: number) => void;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextId = useRef(1);
  const cb = useRef(onPointsLand);
  cb.current = onPointsLand;

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      const inc = 1 + Math.floor(Math.random() * 3); // +1..+3
      const id = nextId.current++;
      const color = BUBBLE_COLORS[id % BUBBLE_COLORS.length];
      const leftPct = 8 + Math.floor(Math.random() * 55); // start left/middle so it can arc right
      setBubbles((b) => [...b, { id, value: inc, color, leftPct }]);
      window.setTimeout(() => {
        cb.current(inc);
        setBubbles((b) => b.filter((x) => x.id !== id));
      }, FLY_MS);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {/* Walking mascots along the ground */}
      {MASCOTS.map((m, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            // Smaller on phones (so they don't cover the jar), full size on desktop.
            width: `clamp(56px, 11vw, ${m.size}px)`,
            height: `clamp(56px, 11vw, ${m.size}px)`,
            bottom: m.bottom,
            animation: `pp-walk ${m.dur} linear infinite`,
            animationDelay: m.delay,
          }}
        >
          <div
            style={{ animation: `pp-bob ${0.8 + i * 0.15}s ease-in-out infinite` }}
            className="w-full h-full"
          >
            <img
              src={m.src}
              alt={m.alt}
              draggable={false}
              className="w-full h-full object-contain select-none drop-shadow-[0_12px_18px_rgba(236,72,153,0.35)] sm:drop-shadow-[0_18px_28px_rgba(236,72,153,0.35)]"
            />
          </div>
        </div>
      ))}

      {/* Point bubbles floating up toward the jar */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-32 sm:bottom-40"
          style={{
            left: `${b.leftPct}%`,
            animation: `pp-float-to-jar ${FLY_MS}ms cubic-bezier(0.25, 0.55, 0.35, 1) forwards`,
          }}
        >
          <div
            className="rounded-2xl px-3.5 py-1.5 font-display text-lg sm:text-xl font-extrabold text-white shadow-lg"
            style={{ background: b.color }}
          >
            +{b.value}
          </div>
        </div>
      ))}
    </div>
  );
});
