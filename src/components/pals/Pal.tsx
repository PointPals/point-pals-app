import { useId, type CSSProperties, type ReactNode } from "react";
import { resolvePal, type PalDef, type PalMood } from "@/lib/pals";
import { cn } from "@/lib/utils";

/**
 * <Pal> — vector render of a PointPals character.
 *
 * Built in layers that mirror how the plush is sewn: appendages behind,
 * body (one base pattern + sheen/shade), belly patch with stitched edge and
 * embroidered motif, appendages in front, then the shared embroidered face.
 * Layers carry class hooks (pal-body, pal-eyes, pal-ear-l …) so CSS/GSAP can
 * breathe, blink and wiggle them.
 *
 * Accepts new ids ("lumi") and legacy companion ids ("sunny") alike.
 */

const INK = "#2A2138";

export type PalProps = {
  /** Pal id — new ("orbit") or legacy ("pip"). Unknown ids hash from `seed`. */
  id?: string | null;
  /** Stable seed for unknown ids (usually the kid id). */
  seed?: string;
  size?: number | string;
  mood?: PalMood;
  /** Idle life: breathing, blinking, appendage wiggle. Off for reduced motion. */
  animate?: boolean;
  /** Accessible name. Omit for decorative use (aria-hidden). */
  title?: string;
  /** Draw the soft ground shadow. */
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Pal({
  id,
  seed,
  size = 120,
  mood = "idle",
  animate = false,
  title,
  shadow = true,
  className,
  style,
}: PalProps) {
  const pal = resolvePal(id, seed);
  const uid = useId().replace(/:/g, "");
  const shape = SHAPES[pal.id];
  const sheen = `pal-sheen-${uid}`;
  const shade = `pal-shade-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn(
        "pal select-none overflow-visible",
        animate && "pal-animate",
        `pal-${pal.id}`,
        className,
      )}
      style={style}
      data-pal={pal.id}
      data-mood={mood}
    >
      <defs>
        <radialGradient id={sheen} cx="34%" cy="26%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shade} cx="68%" cy="92%" r="70%">
          <stop offset="0%" stopColor={INK} stopOpacity="0.22" />
          <stop offset="70%" stopColor={INK} stopOpacity="0" />
        </radialGradient>
      </defs>

      {shadow && (
        <ellipse
          className="pal-ground"
          cx="100"
          cy="190"
          rx={shape.groundRx}
          ry="6"
          fill={INK}
          opacity="0.12"
        />
      )}

      <g className="pal-body-group">
        {shape.back(pal)}
        <path className="pal-body" d={shape.body} fill={pal.color} />
        <path d={shape.body} fill={`url(#${shade})`} />
        <path d={shape.body} fill={`url(#${sheen})`} />
        <Belly pal={pal} cx={100} cy={shape.bellyY} rx={shape.bellyRx} ry={shape.bellyRy} />
        {shape.front(pal)}
        <Face pal={pal} y={shape.faceY} mood={mood} spread={shape.eyeSpread} />
      </g>
    </svg>
  );
}

/* ───────────────────────── shared face (embroidered) ───────────────────────── */

function Face({ pal, y, mood, spread }: { pal: PalDef; y: number; mood: PalMood; spread: number }) {
  const lx = 100 - spread;
  const rx = 100 + spread;
  const cheek = pal.id === "lumi" || pal.id === "ripple" ? "#FF9EC4" : "#FF8FA3";
  return (
    <g className="pal-face">
      {/* cheeks — embroidered satin ovals */}
      <ellipse cx={lx - 13} cy={y + 13} rx="9" ry="5.5" fill={cheek} opacity="0.5" />
      <ellipse cx={rx + 13} cy={y + 13} rx="9" ry="5.5" fill={cheek} opacity="0.5" />

      {mood === "happy" ? (
        <g className="pal-eyes" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round">
          <path d={`M${lx - 7} ${y + 2} Q${lx} ${y - 7} ${lx + 7} ${y + 2}`} />
          <path d={`M${rx - 7} ${y + 2} Q${rx} ${y - 7} ${rx + 7} ${y + 2}`} />
        </g>
      ) : mood === "sleepy" ? (
        <g className="pal-eyes" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d={`M${lx - 7} ${y} Q${lx} ${y + 6} ${lx + 7} ${y}`} />
          <path d={`M${rx - 7} ${y} Q${rx} ${y + 6} ${rx + 7} ${y}`} />
        </g>
      ) : (
        <g className="pal-eyes">
          {[lx, rx].map((x) => (
            <g key={x}>
              <ellipse
                cx={x}
                cy={y}
                rx={mood === "wow" ? 9 : 7.5}
                ry={mood === "wow" ? 11 : 10}
                fill={INK}
              />
              <circle cx={x - 2.6} cy={y - 3.8} r="2.8" fill="#fff" />
              <circle cx={x + 2.4} cy={y + 3.6} r="1.2" fill="#fff" opacity="0.85" />
            </g>
          ))}
        </g>
      )}

      {/* mouth */}
      {mood === "wow" ? (
        <ellipse cx="100" cy={y + 16} rx="4.5" ry="5.5" fill={INK} />
      ) : mood === "happy" ? (
        <path
          d={`M92 ${y + 12} Q100 ${y + 22} 108 ${y + 12} Z`}
          fill={INK}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d={`M93 ${y + 13} Q100 ${y + 19} 107 ${y + 13}`}
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/* ───────────────────────── belly patch + motif ───────────────────────── */

function Belly({
  pal,
  cx,
  cy,
  rx,
  ry,
}: {
  pal: PalDef;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  return (
    <g className="pal-belly">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={pal.tint} />
      {/* stitched edge */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx - 3.5}
        ry={ry - 3.5}
        fill="none"
        stroke={pal.shade}
        strokeOpacity="0.45"
        strokeWidth="1.6"
        strokeDasharray="3.2 4"
        strokeLinecap="round"
      />
      <g transform={`translate(${cx} ${cy})`}>{MOTIFS[pal.id](pal)}</g>
    </g>
  );
}

const MOTIFS: Record<PalDef["id"], (p: PalDef) => ReactNode> = {
  lumi: (p) => (
    <g>
      <path
        d="M0 9 C -10 2 -14 -3 -14 -8 C -14 -13 -10 -16 -6 -16 C -3 -16 -1 -14 0 -12 C 1 -14 3 -16 6 -16 C 10 -16 14 -13 14 -8 C 14 -3 10 2 0 9 Z"
        fill={p.accent}
        transform="translate(0 3)"
      />
      <g stroke={p.accent} strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <path d="M0 -19 V -23" />
        <path d="M-15 -15 L-18 -18" />
        <path d="M15 -15 L18 -18" />
      </g>
    </g>
  ),
  tumble: () => (
    <g>
      <circle cx="-9" cy="3" r="7" fill="#5B7CFA" />
      <circle cx="9" cy="3" r="7" fill="#3DBE8B" />
      <circle cx="0" cy="-8" r="7" fill="#FF7F5C" />
      {[
        [-11, 1],
        [7, 1],
        [-2, -10],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#fff" opacity="0.8" />
      ))}
    </g>
  ),
  ember: (p) => (
    <g>
      <path
        d="M0 -16 C 6 -8 12 -4 12 4 C 12 11 6 15 0 15 C -6 15 -12 11 -12 4 C -12 -2 -7 -5 -5 -10 C -3 -6 -2 -4 0 -3 C 1 -7 0 -12 0 -16 Z"
        fill={p.accent}
      />
      <path
        d="M0 2 C 3 5 5 7 5 10 C 5 13 3 14 0 14 C -3 14 -5 13 -5 10 C -5 7 -2 5 0 2 Z"
        fill={p.color}
        opacity="0.85"
      />
    </g>
  ),
  orbit: (p) => (
    <g>
      <circle r="10" fill={p.accent} />
      <circle cx="-3" cy="-3" r="3" fill="#fff" opacity="0.6" />
      <ellipse
        rx="17"
        ry="5.5"
        fill="none"
        stroke={p.shade}
        strokeWidth="2.6"
        transform="rotate(-18)"
      />
    </g>
  ),
  moss: (p) => (
    <g transform="rotate(-20)">
      <path d="M0 -16 C 10 -10 12 2 0 15 C -12 2 -10 -10 0 -16 Z" fill={p.shade} />
      <path d="M0 -12 V 12" stroke={p.tint} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M0 -2 L 5 -6 M0 4 L -5 0" stroke={p.tint} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),
  ripple: (p) => (
    <g fill="none" stroke={p.shade} strokeWidth="3" strokeLinecap="round">
      <path d="M-15 -4 q 5 -6 10 0 t 10 0 t 10 0" />
      <path d="M-15 6 q 5 -6 10 0 t 10 0 t 10 0" stroke={p.accent} />
    </g>
  ),
};

/* ───────────────────────── silhouettes ───────────────────────── */

type Shape = {
  body: string;
  faceY: number;
  eyeSpread: number;
  bellyY: number;
  bellyRx: number;
  bellyRy: number;
  groundRx: number;
  back: (p: PalDef) => ReactNode;
  front: (p: PalDef) => ReactNode;
};

const none = () => null;

const SHAPES: Record<PalDef["id"], Shape> = {
  // Kindness — soft pear with long floppy ears.
  lumi: {
    body: "M100 64 C 138 64 160 98 162 132 C 164 166 138 186 100 186 C 62 186 36 166 38 132 C 40 98 62 64 100 64 Z",
    faceY: 106,
    eyeSpread: 21,
    bellyY: 150,
    bellyRx: 30,
    bellyRy: 25,
    groundRx: 52,
    back: (p) => (
      <g>
        <g className="pal-ear-l" style={{ transformOrigin: "78px 74px" }}>
          <path
            d="M80 76 C 66 70 46 44 48 22 C 50 6 66 6 74 20 C 82 34 88 56 86 72 Z"
            fill={p.color}
          />
          <path
            d="M78 66 C 68 60 56 42 57 26 C 58 16 66 16 70 25 C 76 37 80 52 79 64 Z"
            fill={p.tint}
          />
        </g>
        <g className="pal-ear-r" style={{ transformOrigin: "122px 74px" }}>
          <path
            d="M120 76 C 134 70 154 44 152 22 C 150 6 134 6 126 20 C 118 34 112 56 114 72 Z"
            fill={p.color}
          />
          <path
            d="M122 66 C 132 60 144 42 143 26 C 142 16 134 16 130 25 C 124 37 120 52 121 64 Z"
            fill={p.tint}
          />
        </g>
      </g>
    ),
    front: (p) => (
      <g fill={p.shade} opacity="0.55">
        <ellipse cx="76" cy="182" rx="14" ry="6" />
        <ellipse cx="124" cy="182" rx="14" ry="6" />
      </g>
    ),
  },
  // Teamwork — wide dumpling, round bear ears, stubby arms.
  tumble: {
    body: "M100 72 C 150 72 174 104 174 138 C 174 170 144 186 100 186 C 56 186 26 170 26 138 C 26 104 50 72 100 72 Z",
    faceY: 116,
    eyeSpread: 24,
    bellyY: 156,
    bellyRx: 34,
    bellyRy: 22,
    groundRx: 64,
    back: (p) => (
      <g>
        <g className="pal-ear-l" style={{ transformOrigin: "60px 88px" }}>
          <circle cx="58" cy="82" r="17" fill={p.color} />
          <circle cx="58" cy="82" r="9" fill={p.tint} />
        </g>
        <g className="pal-ear-r" style={{ transformOrigin: "140px 88px" }}>
          <circle cx="142" cy="82" r="17" fill={p.color} />
          <circle cx="142" cy="82" r="9" fill={p.tint} />
        </g>
      </g>
    ),
    front: (p) => (
      <g fill={p.shade} opacity="0.9">
        <ellipse
          className="pal-arm-l"
          cx="34"
          cy="146"
          rx="9"
          ry="13"
          transform="rotate(18 34 146)"
        />
        <ellipse
          className="pal-arm-r"
          cx="166"
          cy="146"
          rx="9"
          ry="13"
          transform="rotate(-18 166 146)"
        />
      </g>
    ),
  },
  // Courage — upright egg, soft three-bump crest, short tail.
  ember: {
    body: "M100 54 C 140 54 160 100 160 134 C 160 166 134 186 100 186 C 66 186 40 166 40 134 C 40 100 60 54 100 54 Z",
    faceY: 104,
    eyeSpread: 21,
    bellyY: 150,
    bellyRx: 29,
    bellyRy: 26,
    groundRx: 54,
    back: (p) => (
      <g>
        <path
          className="pal-tail"
          d="M148 166 C 164 166 176 158 182 146 C 184 160 174 178 152 182 Z"
          fill={p.shade}
          style={{ transformOrigin: "150px 172px" }}
        />
        <g className="pal-crest" fill={p.shade} style={{ transformOrigin: "100px 62px" }}>
          <path d="M70 70 C 66 56 74 46 84 48 C 90 50 92 58 90 64 Z" />
          <path d="M88 60 C 86 42 96 32 106 36 C 114 40 114 50 110 58 Z" />
          <path d="M108 60 C 112 46 124 42 132 50 C 136 56 134 64 128 68 Z" />
        </g>
      </g>
    ),
    front: (p) => (
      <g fill={p.shade} opacity="0.6">
        <ellipse cx="78" cy="183" rx="13" ry="5.5" />
        <ellipse cx="122" cy="183" rx="13" ry="5.5" />
      </g>
    ),
  },
  // Curiosity — round ball, two bobble antennae.
  orbit: {
    body: "M100 62 C 136 62 162 90 162 124 C 162 160 136 186 100 186 C 64 186 38 160 38 124 C 38 90 64 62 100 62 Z",
    faceY: 112,
    eyeSpread: 22,
    bellyY: 154,
    bellyRx: 29,
    bellyRy: 23,
    groundRx: 54,
    back: (p) => (
      <g>
        <g className="pal-ear-l" style={{ transformOrigin: "82px 68px" }}>
          <path
            d="M84 68 C 80 50 70 38 62 28"
            fill="none"
            stroke={p.shade}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="60" cy="25" r="11" fill={p.accent} />
          <circle cx="56.5" cy="21.5" r="3.4" fill="#fff" opacity="0.7" />
        </g>
        <g className="pal-ear-r" style={{ transformOrigin: "118px 68px" }}>
          <path
            d="M116 68 C 120 50 130 38 138 28"
            fill="none"
            stroke={p.shade}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="140" cy="25" r="11" fill={p.accent} />
          <circle cx="136.5" cy="21.5" r="3.4" fill="#fff" opacity="0.7" />
        </g>
      </g>
    ),
    front: none,
  },
  // Little habits — gumdrop with a two-leaf sprout.
  moss: {
    body: "M100 58 C 124 58 168 108 168 140 C 168 170 138 186 100 186 C 62 186 32 170 32 140 C 32 108 76 58 100 58 Z",
    faceY: 114,
    eyeSpread: 22,
    bellyY: 156,
    bellyRx: 31,
    bellyRy: 22,
    groundRx: 60,
    back: (p) => (
      <g className="pal-sprout" style={{ transformOrigin: "100px 60px" }}>
        <path
          d="M100 62 C 100 50 101 42 103 34"
          fill="none"
          stroke={p.shade}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M102 38 C 90 22 70 22 62 30 C 72 42 92 44 102 38 Z" fill={p.shade} />
        <path d="M103 36 C 112 18 134 14 144 22 C 136 36 116 42 103 36 Z" fill={p.color} />
        <path
          d="M104 35 C 116 27 128 23 138 23"
          fill="none"
          stroke={p.tint}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    ),
    front: (p) => (
      <g fill={p.shade} opacity="0.55">
        <ellipse cx="76" cy="183" rx="14" ry="5.5" />
        <ellipse cx="124" cy="183" rx="14" ry="5.5" />
      </g>
    ),
  },
  // Calm — low, wide axolotl with frilly gills.
  ripple: {
    body: "M100 82 C 148 82 172 112 172 142 C 172 170 142 186 100 186 C 58 186 28 170 28 142 C 28 112 52 82 100 82 Z",
    faceY: 124,
    eyeSpread: 24,
    bellyY: 160,
    bellyRx: 32,
    bellyRy: 19,
    groundRx: 64,
    back: (p) => (
      <g>
        <path
          className="pal-tail"
          d="M160 168 C 178 172 192 164 196 150 C 200 168 188 186 160 184 Z"
          fill={p.shade}
          style={{ transformOrigin: "160px 176px" }}
        />
        <g className="pal-ear-l" fill={p.accent} style={{ transformOrigin: "44px 112px" }}>
          <ellipse cx="30" cy="92" rx="7" ry="15" transform="rotate(-40 30 92)" />
          <ellipse cx="22" cy="110" rx="7" ry="15" transform="rotate(-80 22 110)" />
          <ellipse cx="26" cy="128" rx="6.5" ry="13" transform="rotate(-118 26 128)" />
        </g>
        <g className="pal-ear-r" fill={p.accent} style={{ transformOrigin: "156px 112px" }}>
          <ellipse cx="170" cy="92" rx="7" ry="15" transform="rotate(40 170 92)" />
          <ellipse cx="178" cy="110" rx="7" ry="15" transform="rotate(80 178 110)" />
          <ellipse cx="174" cy="128" rx="6.5" ry="13" transform="rotate(118 174 128)" />
        </g>
      </g>
    ),
    front: (p) => (
      <g fill={p.shade} opacity="0.6">
        <ellipse cx="70" cy="183" rx="15" ry="5.5" />
        <ellipse cx="130" cy="183" rx="15" ry="5.5" />
      </g>
    ),
  },
};
