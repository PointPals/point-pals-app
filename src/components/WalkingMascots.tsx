import { memo, useEffect, useRef, useState } from "react";
import { COMPANION_URLS } from "@/lib/image-urls";
import { companionTintKey, TINT_HEX } from "@/lib/companion-tints";

/**
 * Full-width overlay: the PointPals mascots walk slowly across the bottom
 * of the hero section and occasionally emit a +N point bubble that floats
 * up-and-right toward the jar. Each landed bubble calls onPointsLand(n).
 */

// Each companion has a marble tint key from the shared companion-tints map
// so their point bubbles (and the marble that drops) share the same colour.
const MASCOTS = [
  { src: COMPANION_URLS.sunny, alt: "Sunny", tint: companionTintKey("sunny"), dur: "26s", delay: "0s", size: 156, bottom: "6%" },
  { src: COMPANION_URLS.pip, alt: "Pip", tint: companionTintKey("pip"), dur: "26s", delay: "-3.25s", size: 132, bottom: "4%" },
  { src: COMPANION_URLS.bramble, alt: "Bramble", tint: companionTintKey("bramble"), dur: "26s", delay: "-6.5s", size: 150, bottom: "5%" },
  { src: COMPANION_URLS.ziggy, alt: "Ziggy", tint: companionTintKey("ziggy"), dur: "26s", delay: "-9.75s", size: 138, bottom: "7%" },
  { src: COMPANION_URLS.ridge, alt: "Ridge", tint: companionTintKey("ridge"), dur: "26s", delay: "-13s", size: 160, bottom: "4%" },
  { src: COMPANION_URLS.coda, alt: "Coda", tint: companionTintKey("coda"), dur: "26s", delay: "-16.25s", size: 134, bottom: "6%" },
  { src: COMPANION_URLS.fern, alt: "Fern", tint: companionTintKey("fern"), dur: "26s", delay: "-19.5s", size: 146, bottom: "5%" },
  { src: COMPANION_URLS.marlow, alt: "Marlow", tint: companionTintKey("marlow"), dur: "26s", delay: "-22.75s", size: 152, bottom: "7%" },
];

const TICK_MS = 1800; // one point-bubble every 1.8s (slow, calm pace)
const FLY_MS = 2800; // 2.8s to arc up to the jar

type Bubble = { id: number; value: number; color: string; tint: string; leftPct: number };

export const WalkingMascots = memo(function WalkingMascots({
  paused = false,
  onPointsLand,
}: {
  paused?: boolean;
  onPointsLand: (n: number, tint: string) => void;
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
      // Pick a random mascot and use its colour
      const mascot = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
      const tint = mascot.tint;
      const color = TINT_HEX[tint] ?? "#B79BE0";
      const leftPct = 8 + Math.floor(Math.random() * 55); // start left/middle so it can arc right
      setBubbles((b) => [...b, { id, value: inc, color, tint, leftPct }]);
      window.setTimeout(() => {
        cb.current(inc, tint);
        setBubbles((b) => b.filter((x) => x.id !== id));
      }, FLY_MS);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <div aria-hidden className="pointer-events-none overflow-visible lg:overflow-hidden z-40 lg:absolute lg:inset-0 relative min-h-[140px] lg:min-h-0">
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
              alt=""
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
          className="absolute bottom-10 lg:bottom-40"
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
