import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Check, X } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { COMPANIONS, PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { CompanionPicker } from "@/components/CompanionPicker";
import { haptic, playChime, primeAudio } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const PALETTE: PastelKey[] = ["sky", "butter", "sage", "blush", "lilac", "sand", "foam", "orange"];

/**
 * "Add a child" — opened by the + tile on Home, right where the parent is
 * looking, instead of sending them to another screen to hunt for it. Name,
 * colour and character, with a live preview of their avatar.
 */
export function AddKidSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addKid, kids } = useApp();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PastelKey>("sky");
  const [companion, setCompanion] = useState<string>(COMPANIONS[0].id);

  // Each time the sheet opens, suggest a colour and character no one in the
  // family has yet, so siblings are easy to tell apart.
  useEffect(() => {
    if (!open) return;
    setName("");
    const usedColors = new Set(kids.map((k) => k.color));
    const usedPals = new Set(kids.map((k) => k.companionId));
    setColor(PALETTE.find((c) => !usedColors.has(c)) ?? PALETTE[kids.length % PALETTE.length]);
    setCompanion(
      COMPANIONS.find((c) => !usedPals.has(c.id))?.id ??
        COMPANIONS[kids.length % COMPANIONS.length].id,
    );
  }, [open, kids]);

  const trimmed = name.trim();
  const submit = () => {
    if (!trimmed) return;
    primeAudio();
    addKid(trimmed, color, companion);
    playChime("positive");
    haptic("success");
    onOpenChange(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-ink/35 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[2rem] bg-card shadow-lift outline-none sm:bottom-6 sm:rounded-[2rem]"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-ink/15" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-6 pt-4">
            <div>
              <Drawer.Title className="font-display text-[1.9rem] font-semibold leading-tight text-ink">
                Add a child
              </Drawer.Title>
              <p className="mt-1 text-sm text-muted-foreground">
                They’ll get their own character, colour and marbles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-ink-soft hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4 pt-5">
              <div className="flex items-center gap-4">
                <div
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-clay-sm transition-colors duration-300"
                  style={{ backgroundColor: PASTEL_HEX[color] }}
                >
                  <CompanionAvatar seed="preview" color={color} size={80} companionId={companion} />
                </div>
                <label className="block min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nova"
                    maxLength={40}
                    autoComplete="off"
                    enterKeyHint="done"
                    className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Their colour
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-2.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
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

              <CompanionPicker value={companion} onChange={setCompanion} label="Their character" />
            </div>

            <div className="border-t border-border/70 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <button
                type="submit"
                disabled={!trimmed}
                className="tap inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-semibold text-cream shadow-clay-sm transition disabled:opacity-40"
              >
                {trimmed ? `Add ${trimmed} to the family` : "Add to the family"}
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
