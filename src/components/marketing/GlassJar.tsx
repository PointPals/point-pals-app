import { useId, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/utils";
import { MARBLE_TONES, seeded } from "./palette";

/**
 * The marketing glass jar — a deterministic SVG (not the in-app canvas
 * physics jar) so scroll-scrubbed scenes can pour marbles in AND back out
 * frame-perfectly, and the server renders the exact same pile the client does.
 *
 * Every marble is `<g translate(slot)><g.jar-marble data-i>…</g></g>`: the
 * outer group parks it in its slot, the inner `.jar-marble` is free for GSAP
 * to tween (x/y relative to the slot). Marbles are clipped to the glass
 * interior, so anything parked above the mouth is invisible until it drops.
 */

export const JAR_VIEW = { w: 240, h: 300 } as const;
/** Where marbles enter, in viewBox units (just above the clipped interior). */
export const JAR_MOUTH = { x: 120, y: 14 } as const;

const OUTER =
  "M78 28 L78 50 C78 66 22 70 22 106 L22 246 C22 272 42 286 68 286 L172 286 C198 286 218 272 218 246 L218 106 C218 70 162 66 162 50 L162 28 Z";
const INTERIOR =
  "M84 26 L84 52 C84 72 28 76 28 108 L28 244 C28 266 46 280 70 280 L170 280 C194 280 212 266 212 244 L212 108 C212 76 156 72 156 52 L156 26 Z";

export type JarSlot = { x: number; y: number; r: number; tone: number };

const slotCache = new Map<string, JarSlot[]>();

function packWith(r: number, seed: number): JarSlot[] {
  const rand = seeded(seed);
  const out: JarSlot[] = [];
  const dy = r * Math.sqrt(3) * 0.97;
  const hw = 92;
  let y = 280 - r - 0.5;
  let row = 0;
  while (y - r >= 98) {
    const span = 2 * (hw - r);
    const n = Math.floor(span / (2 * r)) + 1 - (row % 2);
    const start = 120 - (n - 1) * r;
    const rowSlots: JarSlot[] = [];
    for (let i = 0; i < n; i++) {
      const x = start + i * 2 * r;
      // Trim the rounded bottom corners of the jar.
      if (y > 244) {
        const cx = x < 120 ? 70 : 170;
        const dx = x < 120 ? Math.min(0, x - cx) : Math.max(0, x - cx);
        const ex = dx / (42 - r);
        const ey = (y - 244) / (36 - r);
        if (ex * ex + ey * ey > 1) continue;
      }
      rowSlots.push({
        x: x + (rand() - 0.5) * r * 0.22,
        y: y + (rand() - 0.5) * r * 0.18,
        r: r * (0.94 + rand() * 0.1),
        tone: Math.floor(rand() * MARBLE_TONES.length),
      });
    }
    // Fill each row in a shuffled order so a part-filled jar reads as a
    // loose pile, not a typed line.
    for (let i = rowSlots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rowSlots[i], rowSlots[j]] = [rowSlots[j], rowSlots[i]];
    }
    out.push(...rowSlots);
    y -= dy;
    row++;
  }
  return out;
}

/** Bottom-up marble slots for a jar holding `capacity` marbles. */
export function jarSlots(capacity: number, seed = 7): JarSlot[] {
  const key = `${capacity}:${seed}`;
  const hit = slotCache.get(key);
  if (hit) return hit;
  let r = 16;
  let slots = packWith(r, seed);
  while (slots.length < capacity && r > 3) {
    r -= 0.25;
    slots = packWith(r, seed);
  }
  const result = slots.slice(0, capacity);
  slotCache.set(key, result);
  return result;
}

export type GlassJarProps = {
  capacity?: number;
  /** Marbles visible in the resting (SSR / reduced-motion) state. */
  filled?: number;
  /** Optional per-slot tone overrides (index into MARBLE_TONES). */
  tones?: (number | undefined)[];
  seed?: number;
  title?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<SVGSVGElement>;
  /** CSS transition on marble opacity (used when a jar empties). */
  fadeMarbles?: boolean;
};

export function GlassJar({
  capacity = 100,
  filled = capacity,
  tones,
  seed = 7,
  title,
  className,
  style,
  ref,
  fadeMarbles,
}: GlassJarProps) {
  const uid = useId().replace(/[:«»]/g, "");
  const slots = jarSlots(capacity, seed);
  const id = (s: string) => `${uid}-${s}`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${JAR_VIEW.w} ${JAR_VIEW.h}`}
      className={cn("block h-auto w-full overflow-visible select-none", className)}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {MARBLE_TONES.map((t, i) => (
          <radialGradient key={t.id} id={id(`m${i}`)} cx="36%" cy="30%" r="78%">
            <stop offset="0%" stopColor={t.light} />
            <stop offset="46%" stopColor={t.base} />
            <stop offset="100%" stopColor={t.deep} />
          </radialGradient>
        ))}
        <linearGradient id={id("back")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#fff6e6" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={id("front")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="16%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="82%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.42" />
        </linearGradient>
        {/* light oak, like the real jar's lid */}
        <linearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1DDBD" />
          <stop offset="35%" stopColor="#E2C196" />
          <stop offset="80%" stopColor="#D2AB7B" />
          <stop offset="100%" stopColor="#BD9363" />
        </linearGradient>
        <linearGradient id={id("rimTurn")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6e4623" stopOpacity="0.28" />
          <stop offset="12%" stopColor="#6e4623" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff4de" stopOpacity="0.18" />
          <stop offset="88%" stopColor="#6e4623" stopOpacity="0" />
          <stop offset="100%" stopColor="#6e4623" stopOpacity="0.32" />
        </linearGradient>
        <radialGradient id={id("floor")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#231b33" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#231b33" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("clip")}>
          <path d={INTERIOR} />
        </clipPath>
      </defs>

      <ellipse cx="120" cy="288" rx="112" ry="12" fill={`url(#${id("floor")})`} />

      {/* back wall of the glass */}
      <path d={OUTER} fill={`url(#${id("back")})`} />

      <g clipPath={`url(#${id("clip")})`}>
        {slots.map((s, i) => {
          const tone = tones?.[i] ?? s.tone;
          return (
            <g key={i} transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`}>
              <g
                className="jar-marble"
                data-i={i}
                style={{
                  opacity: i < filled ? 1 : 0,
                  transition: fadeMarbles ? "opacity 600ms ease" : undefined,
                }}
              >
                <circle r={s.r} fill={`url(#${id(`m${tone}`)})`} />
                <ellipse
                  cx={-s.r * 0.34}
                  cy={-s.r * 0.4}
                  rx={s.r * 0.3}
                  ry={s.r * 0.2}
                  fill="#fff"
                  opacity="0.85"
                />
              </g>
            </g>
          );
        })}
      </g>

      {/* wall thickness + front glass */}
      <path d={INTERIOR} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="5" />
      <path d={OUTER} fill={`url(#${id("front")})`} />
      <path d={OUTER} fill="none" stroke="#231b33" strokeOpacity="0.14" strokeWidth="3.2" />
      <path d={OUTER} fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth="1.6" />

      {/* highlights */}
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M40 122 C37 162 37 206 42 250" strokeWidth="7" strokeOpacity="0.8" />
        <path d="M53 132 C51 160 51 186 52 206" strokeWidth="2.4" strokeOpacity="0.55" />
        <path d="M206 128 C208 170 208 212 204 246" strokeWidth="3" strokeOpacity="0.5" />
        <path d="M46 94 C56 84 72 78 86 76" strokeWidth="4" strokeOpacity="0.75" />
        <path d="M50 279 Q120 294 190 279" strokeWidth="2" strokeOpacity="0.55" />
      </g>

      {/* lid — an oak disc a little wider than the neck, with a plug that
          sits in it; marbles drop through its hole from above */}
      <rect x="76" y="27" width="88" height="6" rx="1.5" fill="#B88C5C" />
      <rect x="64" y="12" width="112" height="17" rx="4.5" fill={`url(#${id("rim")})`} />
      <rect x="64" y="12" width="112" height="17" rx="4.5" fill={`url(#${id("rimTurn")})`} />
      <g fill="none" stroke="#8c5c30" strokeWidth="0.7" strokeLinecap="round">
        <path d="M66 16.5 C88 15.2 104 17.8 126 16.4 S160 15.4 174 16.8" strokeOpacity="0.2" />
        <path d="M66 20 C84 21.4 110 18.6 132 20.2 S162 21.2 174 19.6" strokeOpacity="0.26" />
        <path d="M66 23.4 C92 22.2 112 24.6 138 23.2 S164 22.6 174 23.8" strokeOpacity="0.18" />
        <path d="M66 26.2 C90 27.2 118 25.4 142 26.6 S166 26.8 174 26" strokeOpacity="0.22" />
      </g>
      <rect
        x="64"
        y="12"
        width="112"
        height="17"
        rx="4.5"
        fill="none"
        stroke="#784e28"
        strokeOpacity="0.4"
        strokeWidth="0.8"
      />
      <path
        d="M69 13.3 L171 13.3"
        stroke="#fff7e6"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
