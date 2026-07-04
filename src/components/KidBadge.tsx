import { PASTEL_HEX, type Kid } from "@/lib/mock-data";

export function KidBadge({
  kid,
  selected = false,
  onClick,
  size = "md",
}: {
  kid: Kid;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const dim = { sm: 44, md: 60, lg: 80 }[size];
  const initial = kid.name[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <div
        className={`rounded-full flex items-center justify-center font-display font-bold transition-all
          ${selected ? "ring-4 ring-foreground ring-offset-2 ring-offset-background scale-105" : "group-hover:scale-105 group-active:scale-95"}
          shadow-[0_6px_14px_-6px_rgba(120,110,90,0.35)]`}
        style={{
          width: dim,
          height: dim,
          backgroundColor: PASTEL_HEX[kid.color],
          fontSize: dim * 0.42,
          color: "#3C2F26",
        }}
      >
        {initial}
      </div>
      <div className="text-xs font-semibold text-foreground/80">{kid.name}</div>
      {size !== "sm" && (
        <div className="font-display text-lg font-bold leading-none -mt-1">{kid.points}</div>
      )}
    </button>
  );
}
