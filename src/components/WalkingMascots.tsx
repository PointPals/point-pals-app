import { memo, useEffect, useRef, useState } from "react";
import sunnyAsset from "@/assets/companions/sunny.png.asset.json";
import pipAsset from "@/assets/companions/pip.png.asset.json";
import brambleAsset from "@/assets/companions/bramble.png.asset.json";

/**
 * Full-width overlay: the PointPals mascots walk slowly across the bottom
 * of the hero section and occasionally emit a +N point bubble that floats
 * up-and-right toward the jar. Each landed bubble calls onPointsLand(n).
 */

const MASCOTS = [
  { src: sunnyAsset.url, alt: "Sunny", dur: "38s", delay: "0s" },
  { src: pipAsset.url, alt: "Pip", dur: "46s", delay: "-16s" },
  { src: brambleAsset.url, alt: "Bramble", dur: "54s", delay: "-32s" },
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
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Walking mascots along the ground */}
      {MASCOTS.map((m, i) => (
        <div
          key={i}
          className="absolute bottom-2 sm:bottom-4"
          style={{
            width: 88,
            height: 88,
            animation: `pp-walk ${m.dur} linear infinite`,
            animationDelay: m.delay,
          }}
        >
          <div
            style={{ animation: "pp-bob 1s ease-in-out infinite" }}
            className="w-full h-full"
          >
            <img
              src={m.src}
              alt={m.alt}
              draggable={false}
              className="w-full h-full object-contain select-none drop-shadow-[0_10px_18px_rgba(236,72,153,0.35)]"
            />
          </div>
        </div>
      ))}

      {/* Point bubbles floating up toward the jar */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-24 sm:bottom-28"
          style={{
            left: `${b.leftPct}%`,
            animation: `pp-float-to-jar ${FLY_MS}ms cubic-bezier(0.25, 0.55, 0.35, 1) forwards`,
          }}
        >
          <div
            className="rounded-2xl px-3 py-1 font-display text-base sm:text-lg font-extrabold text-white shadow-lg"
            style={{ background: b.color }}
          >
            +{b.value}
          </div>
        </div>
      ))}
    </div>
  );
});