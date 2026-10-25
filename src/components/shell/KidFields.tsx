import { Check } from "lucide-react";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { KID_PALETTE } from "@/lib/kid-look";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { CompanionPicker } from "@/components/CompanionPicker";
import { cn } from "@/lib/utils";

/**
 * Name, colour and character for a new child, with a live preview of their
 * avatar. Shared by the Add-a-child sheet and onboarding.
 */
export function KidFields({
  name,
  onNameChange,
  color,
  onColorChange,
  companionId,
  onCompanionChange,
  onEnter,
  autoFocus,
}: {
  name: string;
  onNameChange: (name: string) => void;
  color: PastelKey;
  onColorChange: (color: PastelKey) => void;
  companionId: string;
  onCompanionChange: (id: string) => void;
  /** Called when Enter is pressed in the name field. */
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-clay-sm transition-colors duration-300"
          style={{ backgroundColor: PASTEL_HEX[color] }}
        >
          <CompanionAvatar seed="preview" color={color} size={80} companionId={companionId} />
        </div>
        <label className="block min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onEnter) {
                e.preventDefault();
                onEnter();
              }
            }}
            placeholder="e.g. Nova"
            maxLength={40}
            autoComplete="off"
            enterKeyHint="done"
            autoFocus={autoFocus}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Their colour
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {KID_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              aria-label={c}
              aria-pressed={color === c}
              className={cn(
                "tap grid h-11 w-11 place-items-center rounded-full shadow-clay-sm transition",
                color === c && "ring-2 ring-ink ring-offset-2 ring-offset-card",
              )}
              style={{ backgroundColor: PASTEL_HEX[c] }}
            >
              {color === c && <Check className="h-4 w-4 text-ink" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <CompanionPicker value={companionId} onChange={onCompanionChange} label="Their character" />
    </div>
  );
}
