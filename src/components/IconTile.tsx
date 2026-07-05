import type { PastelKey } from "@/lib/mock-data";
import { PASTEL_HEX, PASTEL_MUTED } from "@/lib/mock-data";
import { iconUrl, isIconKey } from "@/lib/icons";

// A tappable icon tile: a transparent PNG illustration layered over a
// CSS-driven coloured rounded-square background (§0 — colour comes from here,
// not baked into the image).
export function IconTile({
  icon,
  label,
  color,
  points,
  muted = false,
  onClick,
  size = "md",
  selected = false,
}: {
  icon: string;
  label: string;
  color: PastelKey;
  points?: number;
  muted?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}) {
  const bg = muted ? PASTEL_MUTED[color] : PASTEL_HEX[color];
  const dim = { sm: "w-16", md: "w-24", lg: "w-28" }[size];
  const iconSize = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl" }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dim} group flex flex-col items-center gap-1.5 focus:outline-none`}
    >
      <div className="relative aspect-square w-full">
        <div
          className={`absolute inset-0 rounded-3xl flex items-center justify-center transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${selected ? "ring-4 ring-foreground scale-95" : "group-hover:scale-105 group-active:scale-90"}
            shadow-[0_6px_16px_-6px_rgba(120,110,90,0.35)]`}
          style={{ backgroundColor: bg }}
        >
          {isIconKey(icon) ? (
            <img
              src={iconUrl(icon)}
              alt=""
              aria-hidden
              className="w-[86%] h-[86%] object-contain select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(60,47,38,0.15)]"
              draggable={false}
            />
          ) : (
            <span className={`${iconSize} leading-none`} aria-hidden>
              {icon}
            </span>
          )}
        </div>

        {points !== undefined && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full font-display font-bold text-sm flex items-center justify-center shadow-sm ${
              points >= 0
                ? "bg-foreground text-background"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {points > 0 ? `+${points}` : points}
          </span>
        )}
      </div>
      <div className="text-xs font-medium text-center leading-tight text-foreground/80">
        {label}
      </div>
    </button>
  );
}
