import { useId, type CSSProperties, type ReactNode } from "react";
import { resolvePal, type PalDef, type PalId, type PalMood } from "@/lib/pals";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CHEEK, INK, SHADOW, WHITE_THREAD, mix } from "./palette";

/**
 * <Pal> — vector render of a PointPals character, drawn the way the plush is
 * sewn (see docs/PLUSH-SPEC.md):
 *
 *   back appendages (sewn into the top / side seams)
 *   → body (front panel, matte minky shading, side-seam + base-gusset creases)
 *   → arms + feet (shared nubs, sewn into the side seam / base gusset)
 *   → belly appliqué (felt, top-stitched edge, embroidered motif)
 *   → embroidered face (satin eyes + stitched highlight, cheeks, backstitch mouth)
 *
 * Class hooks for CSS/GSAP (API-frozen): .pal-body-group .pal-eyes .pal-ear-l
 * .pal-ear-r .pal-crest .pal-sprout .pal-tail .pal-belly .pal-face, plus the
 * one-shot .pal-hop. Accepts new ids ("lumi") and legacy ids ("sunny") alike.
 */

export type PalCrop = "full" | "bust";
export type PalDetail = "auto" | "full" | "simple";

export type PalProps = {
  /** Pal id — new ("orbit") or legacy ("pip"). Unknown ids hash from `seed`. */
  id?: string | null;
  /** Stable seed for unknown ids (usually the kid id). */
  seed?: string;
  size?: number | string;
  mood?: PalMood;
  /** Idle life: breathing, blinking, appendage sway. Off for reduced motion. */
  animate?: boolean;
  /** Accessible name. Omit for decorative use (aria-hidden). */
  title?: string;
  /** Draw the soft ground shadow (ignored for the bust crop). */
  shadow?: boolean;
  /**
   * "bust" frames the face + signature appendage — use it for avatars at
   * 48px and below, where the full body makes the face too small to read.
   */
  crop?: PalCrop;
  /**
   * "simple" drops seams, stitching and fabric texture (tiny sizes). "full"
   * forces the fabric texture on. "auto" picks from a numeric `size`.
   */
  detail?: PalDetail;
  className?: string;
  style?: CSSProperties;
};

type Ctx = {
  pal: PalDef;
  ids: Record<
    "puff" | "form" | "edge" | "floor" | "clip" | "tex" | "satin" | "fuzz" | "rim" | "ground",
    string
  >;
  /** Seams, stitching, fuzz. */
  stitched: boolean;
  /** Minky texture + satin-stitch sheen (big renders only). */
  fine: boolean;
  mood: PalMood;
  c: Colors;
};

type Colors = {
  body: string;
  light: string;
  back: string;
  deep: string;
  tint: string;
  accent: string;
  thread: string;
  cheek: string;
  /** Hue-shifted shadow (shade pushed toward aubergine) — never grey/mud. */
  shadow: string;
};

export function Pal({
  id,
  seed,
  size = 120,
  mood = "idle",
  animate = false,
  title,
  shadow = true,
  crop = "full",
  detail = "auto",
  className,
  style,
}: PalProps) {
  const pal = resolvePal(id, seed);
  const { reducedMotion } = useSettings();
  // Pal id is part of every defs id: if two separate React roots ever reuse a
  // useId value, a clash can only point at an identical Pal's (identical) defs.
  const uid = `${pal.id}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shape = SHAPES[pal.id];
  const numeric = typeof size === "number" ? size : null;
  const simple = detail === "simple" || (detail === "auto" && numeric !== null && numeric <= 56);
  const fine = !simple && (detail === "full" || (numeric !== null && numeric >= 180));
  const live = animate && !reducedMotion;
  const bust = crop === "bust";

  const ids = {
    puff: `pp-${uid}-puff`,
    form: `pp-${uid}-form`,
    edge: `pp-${uid}-edge`,
    floor: `pp-${uid}-floor`,
    clip: `pp-${uid}-clip`,
    tex: `pp-${uid}-tex`,
    satin: `pp-${uid}-satin`,
    fuzz: `pp-${uid}-fuzz`,
    rim: `pp-${uid}-rim`,
    ground: `pp-${uid}-ground`,
  };
  const c: Colors = {
    body: pal.color,
    light: mix(pal.color, "#FFFFFF", 0.24),
    back: mix(pal.color, pal.shade, 0.42),
    deep: pal.shade,
    tint: pal.tint,
    accent: pal.accent,
    thread: mix(pal.shade, INK, 0.28),
    cheek: CHEEK[pal.id],
    shadow: SHADOW[pal.id],
  };
  const ctx: Ctx = { pal, ids, stitched: !simple, fine, mood, c };

  // De-sync idle loops so a row of Pals never breathes in lock-step.
  const phase = hash(`${pal.id}${seed ?? ""}`) % 1000;
  const [bx, by, bs] = shape.bust;

  return (
    <svg
      viewBox={bust ? `${bx - bs / 2} ${by - bs / 2} ${bs} ${bs}` : "0 0 200 200"}
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn(
        "pal select-none",
        bust ? "overflow-hidden" : "overflow-visible",
        live && "pal-animate",
        `pal-${pal.id}`,
        className,
      )}
      style={{ ...({ "--pal-phase": `${phase / 1000}` } as CSSProperties), ...style }}
      data-pal={pal.id}
      data-mood={mood}
    >
      <defs>
        {/* Appendage volume: soft key light top-left, aubergine wrap shadow at the rim. */}
        <radialGradient id={ids.puff} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.78" stopColor={INK} stopOpacity="0" />
          <stop offset="1" stopColor={INK} stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id={ids.form} cx="38%" cy="26%" r="72%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.edge} cx="47%" cy="38%" r="66%">
          <stop offset="0.58" stopColor={c.shadow} stopOpacity="0" />
          <stop offset="1" stopColor={c.shadow} stopOpacity="0.34" />
        </radialGradient>
        <linearGradient id={ids.floor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.68" stopColor={c.shadow} stopOpacity="0" />
          <stop offset="1" stopColor={c.shadow} stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={ids.fuzz} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="1" stopColor={mix(c.body, c.deep, 0.45)} />
        </linearGradient>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0.66" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.24" />
        </linearGradient>
        <radialGradient id={ids.ground}>
          <stop offset="0" stopColor={INK} stopOpacity="0.2" />
          <stop offset="0.55" stopColor={INK} stopOpacity="0.1" />
          <stop offset="1" stopColor={INK} stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.clip}>
          <path d={shape.body} />
        </clipPath>
        {fine && (
          <>
            {/* Short-pile minky: fine noise, soft-light blended inside the body. */}
            <filter id={ids.tex} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0" intercept="0.5" />
              </feComponentTransfer>
            </filter>
            {/* Satin-stitch sheen for embroidered fills. */}
            <pattern
              id={ids.satin}
              width="1.6"
              height="1.6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-38)"
            >
              <rect width="1.6" height="0.45" fill="#fff" opacity="0.075" />
            </pattern>
          </>
        )}
      </defs>

      {shadow && !bust && (
        <g className="pal-ground">
          <ellipse
            cx="100"
            cy="188.5"
            rx={shape.groundRx + 6}
            ry="8"
            fill={`url(#${ids.ground})`}
          />
        </g>
      )}

      <g className="pal-body-group">
        {shape.back(ctx)}
        <Body ctx={ctx} shape={shape} />
        {shape.limbs !== false && <Limbs ctx={ctx} shape={shape} />}
        <Belly ctx={ctx} {...shape.belly} />
        {shape.front?.(ctx)}
        <Face ctx={ctx} y={shape.faceY} spread={shape.eyeSpread} />
      </g>
    </svg>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Ellipse as a path (so every sewn piece can share the same <Puff>). */
function ell(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
}

/** One stuffed fabric piece: flat fabric colour + soft matte volume. */
function Puff({
  ctx,
  d,
  fill,
  transform,
  className,
  style,
}: {
  ctx: Ctx;
  d: string;
  fill: string;
  transform?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <g transform={transform} className={className} style={style}>
      <path d={d} fill={fill} />
      <path d={d} fill={`url(#${ctx.ids.puff})`} />
    </g>
  );
}

/** A pressed seam: soft valley + crisp crease. Purely visual (no thread). */
function Seam({ ctx, d, strength = 1 }: { ctx: Ctx; d: string; strength?: number }) {
  if (!ctx.stitched) return null;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={INK} strokeOpacity={0.07 * strength} strokeWidth="3.6" />
      <path d={d} stroke={INK} strokeOpacity={0.2 * strength} strokeWidth="0.9" />
      <path
        d={d}
        stroke="#fff"
        strokeOpacity={0.16 * strength}
        strokeWidth="0.8"
        transform="translate(0.9 0.7)"
      />
    </g>
  );
}

/** Visible top-stitch (thread) — belly edge, leaf veins, gill veins. */
function Stitch({
  ctx,
  d,
  color,
  width = 1.3,
  opacity = 0.85,
}: {
  ctx: Ctx;
  d: string;
  color: string;
  width?: number;
  opacity?: number;
}) {
  if (!ctx.stitched) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeDasharray={`${width * 2} ${width * 1.7}`}
      strokeLinecap="round"
    />
  );
}

/** Satin sheen over an embroidered fill (fine detail only). */
function Satin({ ctx, children }: { ctx: Ctx; children: ReactNode }) {
  if (!ctx.fine) return null;
  return <g fill={`url(#${ctx.ids.satin})`}>{children}</g>;
}

/* ───────────────────────── body ───────────────────────── */

function Body({ ctx, shape }: { ctx: Ctx; shape: Shape }) {
  const { ids, c } = ctx;
  const [cx, cy] = shape.center;
  return (
    <g className="pal-body">
      {ctx.fine && (
        // Minky fuzz: two broken outlines of pile tufts at different pitches, so
        // the silhouette softens without reading as a beaded border.
        <g fill="none" stroke={`url(#${ids.fuzz})`} strokeLinecap="round">
          <path d={shape.body} strokeWidth="1.3" strokeDasharray="0.01 1.9" />
          <path
            d={shape.body}
            strokeWidth="0.9"
            strokeDasharray="0.01 1.13"
            strokeDashoffset="0.6"
          />
        </g>
      )}
      <path d={shape.body} fill={c.body} />
      <path d={shape.body} fill={`url(#${ids.form})`} />
      <path d={shape.body} fill={`url(#${ids.edge})`} />
      <path d={shape.body} fill={`url(#${ids.floor})`} />
      <g clipPath={`url(#${ids.clip})`}>
        {ctx.fine && (
          <rect
            x="0"
            y="0"
            width="200"
            height="200"
            filter={`url(#${ids.tex})`}
            opacity="0.22"
            style={{ mixBlendMode: "soft-light" }}
          />
        )}
        {/* Side seam rolls just inside the silhouette; base gusset along the bottom. */}
        <g transform={`translate(${cx} ${cy}) scale(${shape.seamScale}) translate(${-cx} ${-cy})`}>
          <Seam ctx={ctx} d={shape.body} strength={0.38} />
        </g>
        <Seam ctx={ctx} d={shape.gusset} />
        {/* Rim light from behind — keeps the Pal lifted off dark backgrounds. */}
        <path
          d={shape.body}
          fill="none"
          stroke={`url(#${ids.rim})`}
          strokeWidth="3.6"
          transform="translate(-1.4 0.6)"
        />
      </g>
    </g>
  );
}

/* Shared arm + foot nubs (one pattern piece each, sewn into side seam / base). */
function Limbs({ ctx, shape }: { ctx: Ctx; shape: Shape }) {
  const { c } = ctx;
  const [ax, ay, aAngle] = shape.arm;
  const [fx, fy] = shape.foot;
  const sole = mix(c.body, c.tint, 0.38);
  return (
    <g className="pal-limbs">
      {[-1, 1].map((side) => {
        const x = 100 + side * ax;
        return (
          <g key={`a${side}`} className={side < 0 ? "pal-arm-l" : "pal-arm-r"}>
            <g transform={`rotate(${side * aAngle} ${x} ${ay - 8})`}>
              <Puff ctx={ctx} d={ell(x, ay, 7.6, 11.5)} fill={c.body} />
              <Seam
                ctx={ctx}
                d={`M${x - 5.5} ${ay - 7.5} Q${x} ${ay - 11.5} ${x + 5.5} ${ay - 7.5}`}
                strength={0.8}
              />
            </g>
          </g>
        );
      })}
      {[-1, 1].map((side) => {
        const x = 100 + side * fx;
        return (
          <g key={`f${side}`}>
            <Puff ctx={ctx} d={ell(x, fy, 13.5, 9)} fill={c.body} />
            <ellipse cx={x} cy={fy + 1.4} rx="8" ry="5.2" fill={sole} />
            <Stitch
              ctx={ctx}
              d={ell(x, fy + 1.4, 8, 5.2)}
              color={c.thread}
              width={0.9}
              opacity={0.35}
            />
          </g>
        );
      })}
    </g>
  );
}

/* ───────────────────────── shared face (embroidered) ───────────────────────── */

function Face({ ctx, y, spread }: { ctx: Ctx; y: number; spread: number }) {
  const { mood, c } = ctx;
  const lx = 100 - spread;
  const rx = 100 + spread;
  const cheekY = y + 11;
  const cheekX = spread + 11;
  const tongue = "#F27D93";

  return (
    <g className="pal-face">
      {/* cheeks — satin-stitch ovals */}
      {[100 - cheekX, 100 + cheekX].map((x) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={cheekY}
            rx={mood === "happy" ? 7.4 : 6.6}
            ry={mood === "happy" ? 4.4 : 3.9}
            fill={c.cheek}
          />
          <Satin ctx={ctx}>
            <ellipse cx={x} cy={cheekY} rx="6.6" ry="3.9" />
          </Satin>
        </g>
      ))}

      {mood === "happy" ? (
        <g className="pal-eyes" fill="none" stroke={INK} strokeWidth="3.9" strokeLinecap="round">
          <path d={`M${lx - 6.6} ${y + 2.4} Q${lx} ${y - 6.4} ${lx + 6.6} ${y + 2.4}`} />
          <path d={`M${rx - 6.6} ${y + 2.4} Q${rx} ${y - 6.4} ${rx + 6.6} ${y + 2.4}`} />
        </g>
      ) : mood === "sleepy" ? (
        <g className="pal-eyes" fill="none" stroke={INK} strokeLinecap="round">
          {[lx, rx].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x - 6.6} ${y + 0.5} Q${x} ${y + 6} ${x + 6.6} ${y + 0.5}`}
                strokeWidth="3.6"
              />
              {/* two stitched lashes at the outer corner */}
              <path
                d={
                  i === 0
                    ? `M${x - 6.4} ${y + 1.6} l-3.2 2.4 M${x - 4.6} ${y + 3.8} l-2.2 3`
                    : `M${x + 6.4} ${y + 1.6} l3.2 2.4 M${x + 4.6} ${y + 3.8} l2.2 3`
                }
                strokeWidth="1.7"
              />
            </g>
          ))}
        </g>
      ) : (
        <g className="pal-eyes">
          {[lx, rx].map((x) => {
            const wow = mood === "wow";
            const erx = wow ? 7.8 : 6.6;
            const ery = wow ? 9.6 : 8.6;
            return (
              <g key={x}>
                <ellipse cx={x} cy={y} rx={erx} ry={ery} fill={INK} />
                <Satin ctx={ctx}>
                  <ellipse cx={x} cy={y} rx={erx} ry={ery} />
                </Satin>
                {/* stitched highlight: a satin teardrop + a single French-knot dot */}
                <ellipse
                  cx={x - erx * 0.34}
                  cy={y - ery * 0.36}
                  rx={wow ? 2.9 : 2.4}
                  ry={wow ? 3.5 : 2.9}
                  fill={WHITE_THREAD}
                  transform={`rotate(-20 ${x - erx * 0.34} ${y - ery * 0.36})`}
                />
                <circle
                  cx={x + erx * 0.34}
                  cy={y + ery * 0.42}
                  r={wow ? 1.35 : 1.1}
                  fill={WHITE_THREAD}
                  opacity="0.9"
                />
              </g>
            );
          })}
        </g>
      )}

      {/* brows — only when the mood needs them */}
      {mood === "wow" && (
        <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d={`M${lx - 5} ${y - 14.5} Q${lx} ${y - 17.5} ${lx + 5} ${y - 15}`} />
          <path d={`M${rx - 5} ${y - 15} Q${rx} ${y - 17.5} ${rx + 5} ${y - 14.5}`} />
        </g>
      )}

      {/* mouth — backstitch, or a satin fill when open */}
      {mood === "wow" ? (
        <g>
          <ellipse cx="100" cy={y + 13.5} rx="4.4" ry="5.2" fill={INK} />
          <ellipse cx="100" cy={y + 16.2} rx="2.6" ry="1.8" fill={tongue} />
        </g>
      ) : mood === "happy" ? (
        <g>
          <path
            d={`M91.5 ${y + 9.5} Q100 ${y + 11} 108.5 ${y + 9.5} Q108 ${y + 20} 100 ${y + 20} Q92 ${y + 20} 91.5 ${y + 9.5} Z`}
            fill={INK}
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d={`M95.2 ${y + 17.4} Q100 ${y + 13.8} 104.8 ${y + 17.4} Q102.8 ${y + 19.4} 100 ${y + 19.4} Q97.2 ${y + 19.4} 95.2 ${y + 17.4} Z`}
            fill={tongue}
          />
        </g>
      ) : mood === "sleepy" ? (
        <path
          d={`M96.5 ${y + 12.5} Q100 ${y + 14.8} 103.5 ${y + 12.5}`}
          fill="none"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M94.5 ${y + 10.8} Q100 ${y + 16.2} 105.5 ${y + 10.8}`}
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/* ───────────────────────── belly appliqué + motif ───────────────────────── */

function Belly({
  ctx,
  cx,
  cy,
  rx,
  ry,
}: {
  ctx: Ctx;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  const { pal, c } = ctx;
  return (
    <g className="pal-belly">
      {/* felt thickness */}
      <ellipse cx={cx} cy={cy + 1.3} rx={rx} ry={ry} fill={INK} opacity="0.1" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c.tint} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${ctx.ids.puff})`} opacity="0.55" />
      <Stitch
        ctx={ctx}
        d={ell(cx, cy, rx - 3.2, ry - 3.2)}
        color={c.thread}
        width={1.2}
        opacity={0.6}
      />
      <g transform={`translate(${cx} ${cy}) scale(${Math.min(rx / 30, ry / 23)})`}>
        {MOTIFS[pal.id](ctx)}
      </g>
    </g>
  );
}

const MOTIFS: Record<PalDef["id"], (ctx: Ctx) => ReactNode> = {
  lumi: (ctx) => {
    const heart =
      "M0 10 C -9 4 -14 -1 -14 -6.5 C -14 -11.5 -10.5 -14.5 -6.5 -14.5 C -3.5 -14.5 -1.2 -12.6 0 -10.4 C 1.2 -12.6 3.5 -14.5 6.5 -14.5 C 10.5 -14.5 14 -11.5 14 -6.5 C 14 -1 9 4 0 10 Z";
    return (
      <g>
        <g transform="translate(0 3)">
          <path d={heart} fill={ctx.c.accent} />
          <Satin ctx={ctx}>
            <path d={heart} />
          </Satin>
        </g>
        <g stroke="#F5B841" strokeWidth="2.4" strokeLinecap="round">
          <path d="M0 -16 V -20.5" />
          <path d="M-13.5 -12.5 L-16.8 -15.8" />
          <path d="M13.5 -12.5 L16.8 -15.8" />
        </g>
      </g>
    );
  },
  tumble: (ctx) => (
    <g>
      {(
        [
          [-8.5, 3.5, "#5B7CFA"],
          [8.5, 3.5, "#3DBE8B"],
          [0, -7.5, "#F2846B"],
        ] as const
      ).map(([x, y, col]) => (
        <g key={col}>
          <circle cx={x} cy={y} r="7.4" fill={col} />
          <Satin ctx={ctx}>
            <circle cx={x} cy={y} r="7.4" />
          </Satin>
          <circle cx={x - 2.4} cy={y - 2.4} r="1.9" fill={WHITE_THREAD} />
        </g>
      ))}
    </g>
  ),
  ember: (ctx) => {
    const outer =
      "M0 -16 C 6 -8 12 -4 12 4 C 12 11 6 15 0 15 C -6 15 -12 11 -12 4 C -12 -2 -7 -5 -5 -10 C -3 -6 -2 -4 0 -3 C 1 -7 0 -12 0 -16 Z";
    return (
      <g>
        <path d={outer} fill={ctx.c.accent} />
        <path
          d="M0 1 C 3.5 4.5 5.5 7 5.5 10 C 5.5 13 3 14.4 0 14.4 C -3 14.4 -5.5 13 -5.5 10 C -5.5 7 -2.5 4.5 0 1 Z"
          fill={ctx.c.body}
        />
        <Satin ctx={ctx}>
          <path d={outer} />
        </Satin>
      </g>
    );
  },
  orbit: (ctx) => (
    <g>
      <path
        d="M-16.6 2.4 A 17.5 5.6 -16 0 1 15.4 -7.6"
        fill="none"
        stroke={ctx.c.deep}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle r="9.6" fill={ctx.c.accent} />
      <Satin ctx={ctx}>
        <circle r="9.6" />
      </Satin>
      <path
        d="M16.6 -2.4 A 17.5 5.6 -16 0 1 -15.4 7.6"
        fill="none"
        stroke={ctx.c.deep}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="-3.2" cy="-3.4" r="2.2" fill={WHITE_THREAD} />
    </g>
  ),
  moss: (ctx) => {
    const leaf = "M0 -16 C 10 -10 12 2 0 15 C -12 2 -10 -10 0 -16 Z";
    return (
      <g transform="rotate(-18)">
        <path d={leaf} fill={ctx.c.deep} />
        <Satin ctx={ctx}>
          <path d={leaf} />
        </Satin>
        <g stroke={ctx.c.tint} strokeWidth="1.7" strokeLinecap="round" fill="none">
          <path d="M0 -11 V 11" />
          <path d="M0 -2 L 5 -6.5 M0 4.5 L -5 0" />
        </g>
      </g>
    );
  },
  ripple: (ctx) => (
    <g fill="none" strokeWidth="3" strokeLinecap="round">
      <path d="M-15 -4 q 5 -6 10 0 t 10 0 t 10 0" stroke={ctx.c.deep} />
      <path d="M-15 5.5 q 5 -6 10 0 t 10 0 t 10 0" stroke={ctx.c.accent} />
    </g>
  ),
};

/* ───────────────────────── silhouettes ───────────────────────── */

type Shape = {
  body: string;
  /** Visual centre of the body (for the side-seam inset). */
  center: [number, number];
  seamScale: number;
  /** Base-gusset crease along the bottom. */
  gusset: string;
  faceY: number;
  eyeSpread: number;
  belly: { cx: number; cy: number; rx: number; ry: number };
  /** [x offset from centre, y, angle] for the shared arm nub. */
  arm: [number, number, number];
  /** [x offset from centre, y] for the shared foot nub. */
  foot: [number, number];
  limbs?: false;
  groundRx: number;
  /** Bust crop: [centre x, centre y, square size]. */
  bust: [number, number, number];
  back: (ctx: Ctx) => ReactNode;
  front?: (ctx: Ctx) => ReactNode;
};

type Part = "l" | "r" | "crest" | "sprout" | "tail";

/**
 * Mood poses, in degrees. Applied on an inner group so the hooked outer group
 * (.pal-ear-l etc.) stays free for CSS idle life and GSAP.
 */
const POSES: Partial<Record<PalId, Partial<Record<PalMood, Partial<Record<Part, number>>>>>> = {
  lumi: { sleepy: { l: -16, r: 10 }, wow: { l: 5, r: -7 }, happy: { l: -4, r: 4 } },
  tumble: { sleepy: { l: -7, r: 7 }, wow: { l: 4, r: -4 } },
  ember: { sleepy: { tail: 16 }, wow: { tail: -12 }, happy: { tail: -8 } },
  orbit: { sleepy: { l: -24, r: 24 }, wow: { l: 7, r: -7 }, happy: { l: -5, r: 5 } },
  moss: { sleepy: { sprout: 18 }, wow: { sprout: -5 }, happy: { sprout: -7 } },
  ripple: { sleepy: { l: -13, r: 13, tail: 10 }, wow: { l: 9, r: -9 }, happy: { l: 4, r: -4 } },
};

function Hook({
  ctx,
  part,
  origin,
  children,
}: {
  ctx: Ctx;
  part: Part;
  origin: [number, number];
  children: ReactNode;
}) {
  const cls = {
    l: "pal-ear-l",
    r: "pal-ear-r",
    crest: "pal-crest",
    sprout: "pal-sprout",
    tail: "pal-tail",
  }[part];
  const deg = POSES[ctx.pal.id]?.[ctx.mood]?.[part] ?? 0;
  const [ox, oy] = origin;
  return (
    <g className={cls} style={{ transformOrigin: `${ox}px ${oy}px` }}>
      {deg ? <g transform={`rotate(${deg} ${ox} ${oy})`}>{children}</g> : children}
    </g>
  );
}

const SHAPES: Record<PalId, Shape> = {
  // Kindness — soft pear; two long ears, the right one bent and flopped.
  lumi: {
    body: "M100 66 C 135 66 158 98 161 132 C 164 165 146 184 114 185 L 86 185 C 54 184 36 165 39 132 C 42 98 65 66 100 66 Z",
    center: [100, 128],
    seamScale: 0.955,
    gusset: "M62 178 Q100 186 138 178",
    faceY: 108,
    eyeSpread: 20,
    belly: { cx: 100, cy: 150, rx: 27, ry: 22 },
    arm: [47, 142, 30],
    foot: [27, 181],
    groundRx: 56,
    bust: [100, 92, 132],
    back: (ctx) => (
      <g>
        <Hook ctx={ctx} part="l" origin={[86, 76]}>
          <Puff
            ctx={ctx}
            d="M80 80 C 68 66 52 40 54 19 C 55 6 69 2 76 14 C 85 30 93 52 95 74 Z"
            fill={ctx.c.back}
          />
          <path
            d="M82 70 C 72 58 62 40 62 24 C 62 15 69 13 73 21 C 79 33 85 50 87 66 Z"
            fill={ctx.c.tint}
          />
          <Seam ctx={ctx} d="M80 79 Q 87 73 95 74" />
        </Hook>
        <Hook ctx={ctx} part="r" origin={[114, 76]}>
          {/* one sewn piece, lightly stuffed below the knee so the top half flops */}
          <Puff
            ctx={ctx}
            d="M105 77 C 105 60 109 44 118 34 C 126 25 138 21 149 25 C 160 29 169 42 172 54 C 174 63 167 68 161 63 C 153 56 146 50 139 48 C 135 56 128 68 121 80 Z"
            fill={ctx.c.back}
          />
          <path
            d="M111 70 C 112 58 115 49 121 42 C 125 41 130 43 133 46 C 130 54 125 62 118 72 Z"
            fill={ctx.c.tint}
          />
          {/* flopped half shows the back of the ear, catching the light */}
          <Puff
            ctx={ctx}
            d="M118 34 C 126 25 138 21 149 25 C 160 29 169 42 172 54 C 174 63 167 68 161 63 C 153 56 146 50 139 48 C 132 44 125 40 118 34 Z"
            fill={ctx.c.body}
          />
          <Seam ctx={ctx} d="M119 35 C 126 40 132 44 139 48" strength={1.1} />
          <Seam ctx={ctx} d="M105 76 Q 112 74 121 80" />
        </Hook>
      </g>
    ),
  },

  // Teamwork — wide bear-dumpling with round felt-lined ears.
  tumble: {
    body: "M100 74 C 150 74 175 104 175 138 C 175 170 152 185 122 185 L 78 185 C 48 185 25 170 25 138 C 25 104 50 74 100 74 Z",
    center: [100, 132],
    seamScale: 0.96,
    gusset: "M52 178 Q100 187 148 178",
    faceY: 117,
    eyeSpread: 23,
    belly: { cx: 100, cy: 156, rx: 31, ry: 20 },
    arm: [64, 148, 28],
    foot: [34, 181],
    groundRx: 68,
    bust: [100, 106, 140],
    back: (ctx) => (
      <g>
        {([-1, 1] as const).map((side) => {
          const x = 100 + side * 45;
          return (
            <Hook key={side} ctx={ctx} part={side < 0 ? "l" : "r"} origin={[100 + side * 40, 90]}>
              <Puff ctx={ctx} d={ell(x, 79, 18.5, 17.5)} fill={ctx.c.back} />
              <ellipse cx={x} cy={79} rx="10" ry="9.4" fill={ctx.c.tint} />
              <ellipse
                cx={x}
                cy={79}
                rx="10"
                ry="9.4"
                fill={`url(#${ctx.ids.puff})`}
                opacity="0.5"
              />
              <Stitch
                ctx={ctx}
                d={ell(x, 79, 7.6, 7)}
                color={ctx.c.thread}
                width={1}
                opacity={0.45}
              />
            </Hook>
          );
        })}
      </g>
    ),
  },

  // Courage — upright egg; one three-lobed soft crest + a stubby tail.
  ember: {
    body: "M100 56 C 140 56 160 100 160 134 C 160 165 142 184 114 185 L 86 185 C 58 184 40 165 40 134 C 40 100 60 56 100 56 Z",
    center: [100, 124],
    seamScale: 0.955,
    gusset: "M62 178 Q100 186 138 178",
    faceY: 106,
    eyeSpread: 20,
    belly: { cx: 100, cy: 150, rx: 27, ry: 23 },
    arm: [47, 142, 28],
    foot: [27, 181],
    groundRx: 56,
    bust: [100, 92, 136],
    back: (ctx) => (
      <g>
        <Hook ctx={ctx} part="tail" origin={[150, 170]}>
          <Puff
            ctx={ctx}
            d="M140 158 C 156 162 171 158 180 146 C 186 138 193 142 190 153 C 186 170 166 183 138 183 Z"
            fill={ctx.c.back}
          />
        </Hook>
        <Hook ctx={ctx} part="crest" origin={[100, 64]}>
          <Puff
            ctx={ctx}
            d="M70 76 C 63 64 66 50 77 47 C 84 45 89 50 90 55 C 88 41 94 30 104 30 C 114 30 118 40 115 51 C 119 43 129 41 135 47 C 141 54 139 66 132 74 Z"
            fill={ctx.c.deep}
          />
          <Seam ctx={ctx} d="M89 56 Q 92 62 92 68 M115 52 Q 112 60 113 68" strength={0.9} />
        </Hook>
      </g>
    ),
  },

  // Curiosity — round ball; two stuffed-tube antennae with fabric bobbles.
  orbit: {
    body: "M100 64 C 136 64 162 92 162 126 C 162 160 140 185 112 185 L 88 185 C 60 185 38 160 38 126 C 38 92 64 64 100 64 Z",
    center: [100, 124],
    seamScale: 0.955,
    gusset: "M62 179 Q100 187 138 179",
    faceY: 113,
    eyeSpread: 21,
    belly: { cx: 100, cy: 154, rx: 26, ry: 20 },
    arm: [50, 144, 28],
    foot: [26, 181],
    groundRx: 56,
    bust: [100, 92, 148],
    back: (ctx) => (
      <g>
        {([-1, 1] as const).map((side) => {
          const bx = 100 + side * 39;
          return (
            <Hook key={side} ctx={ctx} part={side < 0 ? "l" : "r"} origin={[100 + side * 16, 70]}>
              {/* stuffed tube, 10.5 units (~16 mm at Hero scale) wide */}
              <path
                d={`M${100 + side * 16} 72 C ${100 + side * 18} 54 ${100 + side * 28} 40 ${bx} 31`}
                fill="none"
                stroke={ctx.c.back}
                strokeWidth="10.5"
                strokeLinecap="round"
              />
              <path
                d={`M${100 + side * 13.5} 68 C ${100 + side * 15.5} 54 ${100 + side * 25} 42 ${bx - side * 2.5} 33`}
                fill="none"
                stroke="#fff"
                strokeOpacity="0.16"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Puff ctx={ctx} d={ell(bx + side * 2, 24, 14, 13.5)} fill={ctx.c.accent} />
              {/* bobble = gathered fabric ball; pucker where it meets the tube */}
              <Seam
                ctx={ctx}
                d={`M${bx - side * 4} 34.5 Q ${bx - side * 0.5} 37.5 ${bx + side * 3.5} 35.5`}
                strength={0.9}
              />
            </Hook>
          );
        })}
      </g>
    ),
  },

  // Little habits — gumdrop with a stuffed two-leaf sprout.
  moss: {
    body: "M100 60 C 126 60 168 108 168 140 C 168 168 148 185 120 185 L 80 185 C 52 185 32 168 32 140 C 32 108 74 60 100 60 Z",
    center: [100, 130],
    seamScale: 0.96,
    gusset: "M56 179 Q100 187 144 179",
    faceY: 115,
    eyeSpread: 21,
    belly: { cx: 100, cy: 156, rx: 28, ry: 20 },
    arm: [54, 148, 28],
    foot: [30, 181],
    groundRx: 62,
    bust: [100, 94, 150],
    back: (ctx) => (
      <Hook ctx={ctx} part="sprout" origin={[100, 62]}>
        <path
          d="M100 66 C 100 54 101 46 103 38"
          fill="none"
          stroke={ctx.c.deep}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <Puff ctx={ctx} d="M103 40 C 91 23 69 21 59 30 C 69 45 91 49 103 40 Z" fill={ctx.c.deep} />
        <Stitch
          ctx={ctx}
          d="M99 39 C 88 34 76 31 66 31"
          color={ctx.c.tint}
          width={1.1}
          opacity={0.7}
        />
        <Puff
          ctx={ctx}
          d="M103 38 C 112 18 136 13 147 22 C 138 37 117 44 103 38 Z"
          fill={ctx.c.body}
        />
        <Stitch
          ctx={ctx}
          d="M107 36 C 118 29 129 25 140 23.5"
          color={ctx.c.tint}
          width={1.1}
          opacity={0.8}
        />
      </Hook>
    ),
  },

  // Calm — low, wide axolotl; one three-lobed gill fan each side + a fin tail.
  ripple: {
    body: "M100 84 C 148 84 172 112 172 142 C 172 170 150 185 122 185 L 78 185 C 50 185 28 170 28 142 C 28 112 52 84 100 84 Z",
    center: [100, 136],
    seamScale: 0.96,
    gusset: "M52 179 Q100 187 148 179",
    faceY: 122,
    eyeSpread: 23,
    belly: { cx: 100, cy: 164, rx: 25, ry: 14.5 },
    arm: [62, 154, 28],
    foot: [34, 182],
    groundRx: 66,
    bust: [100, 120, 150],
    back: (ctx) => {
      const vein = mix(ctx.c.accent, INK, 0.3);
      return (
        <g>
          <Hook ctx={ctx} part="tail" origin={[160, 176]}>
            <Puff
              ctx={ctx}
              d="M148 162 C 164 167 179 163 188 151 C 191 146 198 147 197 155 C 195 171 178 184 148 185 Z"
              fill={ctx.c.back}
            />
          </Hook>
          {([-1, 1] as const).map((side) => (
            <Hook key={side} ctx={ctx} part={side < 0 ? "l" : "r"} origin={[100 + side * 56, 114]}>
              <g transform={side < 0 ? undefined : "translate(200 0) scale(-1 1)"}>
                <Puff
                  ctx={ctx}
                  d="M50 106 C 40 98 32 86 24 82 C 15 78 10 86 15 93 C 19 98 28 100 36 104 C 26 103 14 104 10 111 C 7 118 14 123 21 120 C 28 117 34 115 42 116 C 33 120 23 127 22 134 C 21 141 29 143 34 138 C 40 131 44 126 50 124 Z"
                  fill={ctx.c.accent}
                />
                <Stitch
                  ctx={ctx}
                  d="M46 106 C 38 99 30 92 22 88"
                  color={vein}
                  width={1}
                  opacity={0.55}
                />
                <Stitch
                  ctx={ctx}
                  d="M45 113 C 35 112 24 112 16 113"
                  color={vein}
                  width={1}
                  opacity={0.55}
                />
                <Stitch
                  ctx={ctx}
                  d="M46 120 C 38 125 32 130 28 136"
                  color={vein}
                  width={1}
                  opacity={0.55}
                />
              </g>
            </Hook>
          ))}
        </g>
      );
    },
  },
};
