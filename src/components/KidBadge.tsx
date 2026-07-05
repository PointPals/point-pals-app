import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { CompanionAvatar } from "./CompanionAvatar";

// A kid, shown as their chosen companion avatar with a live point-total badge
// that scale-bounces + colour-flashes whenever it changes (§2), and an optional
// streak flame (§4).
export function KidBadge({
  kid,
  selected = false,
  onClick,
  size = "md",
  streak = 0,
}: {
  kid: Kid;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  streak?: number;
}) {
  const dim = { sm: 44, md: 60, lg: 80 }[size];
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(kid.points);

  useEffect(() => {
    if (kid.points === prev.current) return;
    const dir = kid.points > prev.current ? "up" : "down";
    prev.current = kid.points;
    setFlash(dir);
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [kid.points]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <div className="relative">
        <div
          className={`rounded-full flex items-center justify-center transition-all overflow-hidden
            ${selected ? "ring-4 ring-foreground ring-offset-2 ring-offset-background scale-105" : "group-hover:scale-105 group-active:scale-95"}
            shadow-[0_6px_14px_-6px_rgba(120,110,90,0.35)]`}
          style={{ width: dim, height: dim, backgroundColor: PASTEL_HEX[kid.color] }}
        >
          <CompanionAvatar seed={kid.id} color={kid.color} size={dim} companionId={kid.companionId} />
        </div>

        {/* streak flame */}
        {streak >= 2 && (
          <div
            className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow-md border border-border"
            title={`${streak}-day streak`}
          >
            <Flame className="w-3 h-3 text-orange-500 animate-flame" fill="currentColor" />
            <span className="text-[10px] font-bold leading-none text-orange-600">{streak}</span>
          </div>
        )}
      </div>

      <div className="text-xs font-semibold text-foreground/80">{kid.name}</div>
      {size !== "sm" && (
        <div
          className={`font-display text-lg font-bold leading-none -mt-1 rounded-full px-2 transition-colors ${
            flash === "up"
              ? "animate-badge-bounce bg-sage/70"
              : flash === "down"
                ? "animate-badge-bounce-neg bg-destructive/15"
                : ""
          }`}
        >
          {kid.points}
        </div>
      )}
    </button>
  );
}
