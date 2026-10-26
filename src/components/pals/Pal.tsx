import { useState, type CSSProperties } from "react";
import { COMPANION_URLS } from "@/lib/image-urls";
import { resolvePal, type PalMood } from "@/lib/pals";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * <Pal> — one of the PointPals characters, drawn from its finished
 * illustration (COMPANION_URLS) and brought to life with CSS: a soft breath
 * when idle, a happy bob, a "wow" lift, a slow sleepy sway. `.pal-hop` (added
 * by callers) is a one-shot squash-and-hop for taps.
 *
 * Motion respects both the OS reduced-motion preference (CSS) and the app's
 * own Reduced motion setting.
 */

export type PalCrop = "full" | "bust";

export type PalProps = {
  /** Companion id ("sunny", "pip", …). Unknown ids hash from `seed`. */
  id?: string | null;
  /** Stable seed for unknown ids (usually the kid id). */
  seed?: string;
  /** Pixel size, or any CSS length (e.g. "100%" to fill the parent's width). */
  size?: number | string;
  mood?: PalMood;
  /** Idle life: breathing, bobbing. Off for reduced motion. */
  animate?: boolean;
  /** Accessible name. Omit for decorative use (aria-hidden). */
  title?: string;
  /** Draw the soft ground shadow. */
  shadow?: boolean;
  /** "bust" zooms in on the face — for avatars at 48px and below. */
  crop?: PalCrop;
  className?: string;
  style?: CSSProperties;
};

// Stable per-Pal animation offset so a row of Pals never breathes in sync.
function phaseFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

export function Pal({
  id,
  seed,
  size = 120,
  mood = "idle",
  animate = false,
  title,
  shadow = true,
  crop = "full",
  className,
  style,
}: PalProps) {
  const pal = resolvePal(id, seed);
  const { reducedMotion } = useSettings();
  const [failed, setFailed] = useState(false);
  const live = animate && !reducedMotion;
  const url = COMPANION_URLS[pal.id];
  const dim = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-pal={pal.id}
      data-mood={mood}
      className={cn(
        "pal relative inline-block shrink-0 select-none align-middle",
        live && "pal-animate",
        `pal-mood-${mood}`,
        className,
      )}
      style={
        {
          width: dim,
          aspectRatio: "1 / 1",
          containerType: "inline-size",
          "--pal-phase": phaseFor(`${pal.id}${seed ?? ""}`),
          ...style,
        } as CSSProperties
      }
    >
      {shadow && crop === "full" && (
        <span
          aria-hidden
          className="pal-ground pointer-events-none absolute bottom-[3%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%]"
          style={{
            background: "radial-gradient(closest-side, oklch(0.235 0.045 300 / 0.18), transparent)",
          }}
        />
      )}
      <span className="pal-body-group absolute inset-0 block overflow-visible">
        {url && !failed ? (
          <img
            src={url}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="pointer-events-none h-full w-full object-contain"
            style={
              crop === "bust"
                ? { transform: "scale(1.42) translateY(9%)", transformOrigin: "50% 30%" }
                : undefined
            }
          />
        ) : (
          // Offline / art unavailable: a soft body-colour blob with the
          // Pal's initial, so the layout never collapses into a broken icon.
          <span
            className="grid h-full w-full place-items-center rounded-[46%] font-display font-semibold text-white"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${pal.tint}, ${pal.color} 60%, ${pal.shade})`,
              fontSize: "38cqw",
            }}
          >
            {pal.name[0]}
          </span>
        )}
      </span>
    </span>
  );
}
