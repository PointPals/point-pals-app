import type { PastelKey } from "@/lib/mock-data";
import { PASTEL_HEX, PASTEL_MUTED } from "@/lib/mock-data";
import { iconUrl, isIconKey } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Renders a chore/behaviour icon: a registry key, image URL, or emoji. */
export function TileIcon({ icon, className }: { icon: string; className?: string }) {
  return isIconKey(icon) || icon.startsWith("http") || icon.startsWith("/") ? (
    <img
      src={isIconKey(icon) ? iconUrl(icon) : icon}
      alt=""
      aria-hidden
      className={cn(
        "object-contain select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(60,47,38,0.15)]",
        className,
      )}
      draggable={false}
    />
  ) : (
    <span className={cn("leading-none", className)} aria-hidden>
      {icon}
    </span>
  );
}

// A tappable icon tile: a transparent PNG illustration layered over a
// CSS-driven coloured rounded-square background (§0 — colour comes from here,
// not baked into the image). Soft clay depth, a points badge, and a squishy
// press so every tap feels like it did something.
export function IconTile({
  icon,
  label,
  color,
  points,
  muted = false,
  onClick,
  size = "md",
  selected = false,
  count,
  bottomOverlay,
}: {
  icon: string;
  label: string;
  color: PastelKey;
  points?: number;
  muted?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  /** How many times this tile is in the award tray (shows a little counter). */
  count?: number;
  bottomOverlay?: React.ReactNode;
}) {
  const bg = muted ? PASTEL_MUTED[color] : PASTEL_HEX[color];
  const dim = { sm: "w-16", md: "w-full max-w-[7.5rem]", lg: "w-28" }[size];
  const emoji = { sm: "text-2xl", md: "text-[2.6rem]", lg: "text-5xl" }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}${points !== undefined ? `, ${points > 0 ? "+" : ""}${points} points` : ""}`}
      className={cn(dim, "group flex flex-col items-center gap-2 focus:outline-none")}
    >
      <div className="relative aspect-square w-full">
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-[1.6rem] transition-transform duration-200 ease-spring",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-4px_0_rgba(35,27,51,0.06),0_10px_20px_-12px_rgba(35,27,51,0.45)]",
            selected
              ? "ring-4 ring-ink ring-offset-2 ring-offset-card scale-95"
              : "group-hover:-translate-y-0.5 group-active:scale-90",
            "group-focus-visible:ring-4 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
          )}
          style={{ backgroundColor: bg }}
        >
          <TileIcon icon={icon} className={cn("h-[82%] w-[82%]", emoji, muted && "opacity-80")} />
        </div>

        {points !== undefined && (
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-display text-sm font-semibold shadow-clay-sm",
              points >= 0
                ? "bg-white text-ink ring-1 ring-ink/10"
                : "bg-[oklch(0.62_0.12_30)] text-white",
            )}
          >
            {points > 0 ? `+${points}` : points}
          </span>
        )}
        {count !== undefined && count > 0 && (
          <span
            key={count}
            className="animate-pop-in absolute -left-1.5 -top-1.5 grid h-7 min-w-7 place-items-center rounded-full bg-jade px-1.5 font-display text-sm font-semibold text-ink shadow-clay-sm"
            aria-hidden
          >
            ×{count}
          </span>
        )}
        {bottomOverlay && <div className="absolute -bottom-1 -left-1">{bottomOverlay}</div>}
      </div>
      <div className="text-[0.8rem] font-semibold leading-tight text-center text-ink/85">
        {label}
      </div>
    </button>
  );
}
