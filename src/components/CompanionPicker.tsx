import { COMPANIONS } from "@/lib/mock-data";
import { companionArtUrl } from "@/lib/companion-assets";

// Shared mascot picker (used in Library's AddKidForm and the onboarding flow).
// A grid of the 8 companions with the real art (emoji fallback), plus the
// selected companion's quote as a subtitle so the choice feels meaningful.
export function CompanionPicker({
  value,
  onChange,
  label = "Pick a mascot",
}: {
  value: string;
  onChange: (companionId: string) => void;
  label?: string;
}) {
  const selected = COMPANIONS.find((c) => c.id === value);

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="mt-2 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {COMPANIONS.map((c) => {
          const url = companionArtUrl(c.id);
          const isSel = value === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onChange(c.id)}
              className={`tap aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition ${
                isSel
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105"
                  : "hover:scale-105 opacity-80"
              }`}
              style={{ backgroundColor: `var(--pastel-${c.color})` }}
              aria-label={`${c.name} — ${c.trait}`}
              aria-pressed={isSel}
              title={`${c.name} — ${c.trait}`}
            >
              {url ? (
                <img
                  src={url}
                  alt=""
                  // object-contain so the whole mascot fits in the circle
                  // (pastel background fills the rest) rather than being cropped.
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              ) : (
                <span className="text-2xl">{c.symbol}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{selected.name}</span> · {selected.trait}
          <span className="italic"> — “{selected.quote}”</span>
        </p>
      )}
    </div>
  );
}
