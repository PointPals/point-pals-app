import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { TINT_HEX } from "@/lib/companion-tints";
import { useSettings } from "@/lib/settings";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { cn } from "@/lib/utils";

/**
 * A child on the Home screen: their character floating on their colour,
 * their name and points. The whole card is the tap target that opens the
 * award sheet. Points pop when they change so a child sees their marble land.
 */
export function KidCard({
  kid,
  points,
  onClick,
  disabled = false,
  badge,
}: {
  kid: Kid;
  points: number;
  onClick: () => void;
  disabled?: boolean;
  /** Small tag in the top-left corner, e.g. "Visiting". */
  badge?: string;
}) {
  const { reducedMotion } = useSettings();
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(points);

  useEffect(() => {
    if (points === prev.current) return;
    setFlash(points > prev.current ? "up" : "down");
    prev.current = points;
    const t = window.setTimeout(() => setFlash(null), 650);
    return () => window.clearTimeout(t);
  }, [points]);

  const wash = PASTEL_HEX[kid.color];
  const marble = TINT_HEX[kid.color];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${kid.name}${badge ? ` (${badge.toLowerCase()})` : ""}, ${points} points. Give points`}
      className="kid-card tap group relative flex h-full w-full flex-col items-center overflow-hidden rounded-[1.75rem] p-4 pb-4 text-center shadow-clay transition-shadow duration-300 hover:shadow-lift disabled:cursor-default disabled:opacity-90"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, ${wash} 85%, white), color-mix(in oklab, ${wash} 35%, white) 70%)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/35 blur-xl"
      />
      {badge && (
        <span
          aria-hidden
          className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-soft shadow-clay-sm"
        >
          {badge}
        </span>
      )}
      <span
        className={cn(
          "relative block h-[6.5rem] w-[6.5rem] rounded-full transition-transform duration-500 ease-spring group-hover:-translate-y-1 group-active:scale-95 sm:h-28 sm:w-28",
          !reducedMotion && "kid-float",
        )}
        style={{ "--float-delay": `${(kid.id.charCodeAt(0) % 7) * -0.4}s` } as CSSProperties}
      >
        <span
          className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_-6px_14px_rgba(0,0,0,0.06),0_10px_22px_-12px_rgba(35,27,51,0.45)]"
          style={{ backgroundColor: wash }}
        >
          <CompanionAvatar
            seed={kid.id}
            color={kid.color}
            size={112}
            companionId={kid.companionId}
          />
        </span>
      </span>

      <span className="mt-3 block max-w-full truncate font-display text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {kid.name}
      </span>
      <span
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-sm font-semibold text-ink shadow-clay-sm transition-transform duration-300",
          flash === "up" && "animate-badge-bounce",
          flash === "down" && "animate-badge-bounce-neg",
        )}
      >
        <span
          aria-hidden
          className="marble h-3 w-3"
          style={{ "--marble": marble } as CSSProperties}
        />
        <span className="tabular-nums">{points}</span>
        <span className="font-medium text-ink-soft">{points === 1 ? "point" : "points"}</span>
      </span>
    </button>
  );
}
