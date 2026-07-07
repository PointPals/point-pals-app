import { useEffect, useRef, useState } from "react";
import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { CompanionAvatar } from "./CompanionAvatar";

// A kid, shown as their chosen companion avatar with a live point bubble
// positioned at the avatar's top-right (§2).
// The bubble number should match the individual jar value when split jars are
// active — the parent passes `points` to control which total is displayed.
export function KidBadge({
  kid,
  selected = false,
  onClick,
  size = "md",
  points,
}: {
  kid: Kid;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  /** Override for the bubble number (e.g. personalPool when split jars on).
   *  Falls back to kid.currentPoints when omitted. */
  points?: number;
}) {
  const dim = { sm: 44, md: 60, lg: 92 }[size];
  const displayPoints = points ?? kid.currentPoints;
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(displayPoints);

  useEffect(() => {
    if (displayPoints === prev.current) return;
    const dir = displayPoints > prev.current ? "up" : "down";
    prev.current = displayPoints;
    setFlash(dir);
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [displayPoints]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap group relative flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <div className="relative">
        <div
          className={`rounded-full flex items-center justify-center transition-all overflow-hidden
            ${selected ? "ring-4 ring-foreground ring-offset-2 ring-offset-background scale-105" : "group-hover:scale-105 group-active:scale-95"}
            shadow-[0_6px_14px_-6px_rgba(120,110,90,0.35)]`}
          style={{ width: dim, height: dim, backgroundColor: PASTEL_HEX[kid.color] }}
        >
          <CompanionAvatar
            seed={kid.id}
            color={kid.color}
            size={dim}
            companionId={kid.companionId}
          />
        </div>

        {/* Point bubble — top-right of the avatar, outside the circle */}
        <div
          className={`absolute -top-1 -right-2 min-w-[24px] h-[24px] rounded-full flex items-center justify-center shadow-sm px-1.5 z-10 transition-transform ${
            flash === "up"
              ? "scale-125"
              : flash === "down"
                ? "scale-90"
                : ""
          }`}
          style={{
            backgroundColor: PASTEL_HEX[kid.color],
            color: "#fff",
          }}
        >
          <span className="font-display text-[11px] font-bold leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
            {displayPoints}
          </span>
        </div>
      </div>

      <div className="text-sm font-semibold text-foreground/80">{kid.name}</div>
    </button>
  );
}
