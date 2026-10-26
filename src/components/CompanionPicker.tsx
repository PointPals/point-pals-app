import { Check } from "lucide-react";
import { COMPANIONS } from "@/lib/mock-data";
import { companionArtUrl } from "@/lib/companion-assets";
import { cn } from "@/lib/utils";

// Shared character picker (Add-a-child sheet and the onboarding flow). The 8
// companions with their real art on their own colour, each named so a child
// can choose by name, and the chosen one's quote underneath so the pick feels
// like meeting someone rather than ticking a box.
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
    <fieldset>
      {label && (
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </legend>
      )}
      <div className="mt-2.5 grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-8">
        {COMPANIONS.map((c) => {
          const url = companionArtUrl(c.id);
          const isSel = value === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onChange(c.id)}
              className="tap group flex flex-col items-center gap-1.5 rounded-2xl focus:outline-none"
              aria-label={`${c.name}, ${c.trait}`}
              aria-pressed={isSel}
            >
              <span
                className={cn(
                  "relative block aspect-square w-full rounded-[1.35rem] transition duration-200 ease-spring",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(35,27,51,0.06)]",
                  isSel
                    ? "-translate-y-1 ring-[3px] ring-ink ring-offset-2 ring-offset-card shadow-clay-sm"
                    : "opacity-85 group-hover:-translate-y-0.5 group-hover:opacity-100",
                  "group-focus-visible:ring-[3px] group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
                )}
                style={{ backgroundColor: `var(--pastel-${c.color})` }}
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    // object-contain + inset so the whole character sits inside
                    // the tile without its ears or feet clipping.
                    className={cn(
                      "absolute inset-0 h-full w-full object-contain p-[10%] pointer-events-none transition-transform duration-300 ease-spring",
                      isSel && "scale-110",
                    )}
                    draggable={false}
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-2xl">
                    {c.symbol}
                  </span>
                )}
                {isSel && (
                  <span
                    aria-hidden
                    className="animate-pop-in absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-cta text-white shadow-clay-sm"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[0.75rem] font-semibold leading-none",
                  isSel ? "text-ink" : "text-ink-soft",
                )}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <p
          key={selected.id}
          className="animate-in fade-in slide-in-from-bottom-1 duration-300 mt-3 rounded-2xl px-4 py-3 text-sm leading-snug text-ink-soft"
          style={{
            backgroundColor: `color-mix(in oklab, var(--pastel-${selected.color}) 45%, transparent)`,
          }}
        >
          <span className="font-semibold text-ink">{selected.name}</span>
          <span className="mx-1.5 text-ink/30">·</span>
          <span className="font-semibold text-ink">{selected.trait}</span>
          <span className="mt-1 block font-display italic">“{selected.quote}”</span>
        </p>
      )}
    </fieldset>
  );
}
