import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { COMPANIONS, type PastelKey } from "@/lib/mock-data";
import { haptic, playChime, primeAudio } from "@/lib/feedback";
import { KidFields } from "@/components/shell/KidFields";
import { suggestKidLook } from "@/lib/kid-look";
import { addVisitor, useVisitors } from "@/lib/visitors";

/**
 * "Add a child" — opened by the + tile on Home, right where the parent is
 * looking, instead of sending them to another screen to hunt for it. Name,
 * colour and character, with a live preview of their avatar.
 *
 * mode="visitor" adds a friend who's over for the day instead: same fields,
 * but they live on this device only and never touch the family jar.
 */
export function AddKidSheet({
  open,
  onOpenChange,
  mode = "child",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "child" | "visitor";
}) {
  const { addKid, kids } = useApp();
  const visitors = useVisitors();
  const isVisitor = mode === "visitor";
  const [name, setName] = useState("");
  const [color, setColor] = useState<PastelKey>("sky");
  const [companion, setCompanion] = useState<string>(COMPANIONS[0].id);

  // Each time the sheet opens, suggest a colour and character no one in the
  // family has yet, so siblings are easy to tell apart.
  useEffect(() => {
    if (!open) return;
    setName("");
    const look = suggestKidLook([...kids, ...visitors]);
    setColor(look.color);
    setCompanion(look.companionId);
    // Only re-suggest when the sheet opens, not as the lists change under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmed = name.trim();
  const submit = () => {
    if (!trimmed) return;
    primeAudio();
    if (isVisitor) addVisitor({ name: trimmed, color, companionId: companion });
    else addKid(trimmed, color, companion);
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
                {isVisitor ? "A friend is visiting" : "Add a child"}
              </Drawer.Title>
              <p className="mt-1 text-sm text-muted-foreground">
                {isVisitor
                  ? "They can earn points today. Nothing goes in your family jar — when they head home, you send their points to their parents."
                  : "They’ll get their own character, colour and marbles."}
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
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-5">
              <KidFields
                name={name}
                onNameChange={setName}
                color={color}
                onColorChange={setColor}
                companionId={companion}
                onCompanionChange={setCompanion}
              />
            </div>

            <div className="border-t border-border/70 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <button
                type="submit"
                disabled={!trimmed}
                className="tap inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-semibold text-cream shadow-clay-sm transition disabled:opacity-40"
              >
                {isVisitor
                  ? trimmed
                    ? `Let ${trimmed} earn points`
                    : "Let them earn points"
                  : trimmed
                    ? `Add ${trimmed} to the family`
                    : "Add to the family"}
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
