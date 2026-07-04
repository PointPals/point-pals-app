import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { PlushCompanion } from "@/components/PlushCompanion";
import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { companionForKid, downloadKidChart, weeklyChores } from "@/lib/printable-chart";

// Per-kid card on the Family tab: shows the child's derived companion mascot and a
// button that generates their printable weekly chore chart as a real PDF.
export function KidChartCard({ kid }: { kid: Kid }) {
  const { chores, household, unlockedCompanionIds } = useApp();
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [note, setNote] = useState<string | null>(null);

  const companion = companionForKid(kid, unlockedCompanionIds);
  const active = weeklyChores(chores);

  const onDownload = async () => {
    if (state === "working") return;
    setState("working");
    setNote(null);
    try {
      const res = await downloadKidChart({
        kid,
        companion,
        chores: active,
        householdName: household.name,
      });
      if (res.status === "cancelled") {
        setState("idle");
        return;
      }
      if (res.truncated) {
        setNote(`Only ${res.shown} of ${res.total} chores fit on one page.`);
      }
      setState("done");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setNote("Couldn't make the chart — please try again.");
      setState("idle");
    }
  };

  return (
    <div className="card-soft p-5 flex flex-col items-center text-center gap-1">
      <div
        className="rounded-full p-2"
        style={{ background: `linear-gradient(180deg, ${PASTEL_HEX[kid.color]}, transparent)` }}
      >
        <PlushCompanion companion={companion} size={92} />
      </div>
      <div className="font-display text-xl font-bold leading-tight">{kid.name}</div>
      <div className="text-xs text-muted-foreground mb-3">
        {kid.points} points · {active.length} weekly {active.length === 1 ? "chore" : "chores"}
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={state === "working"}
        className="w-full rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition"
      >
        {state === "working" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing…
          </>
        ) : state === "done" ? (
          <>
            <Check className="w-4 h-4" /> Chart ready!
          </>
        ) : (
          <>
            <Download className="w-4 h-4" /> Download this week's chart
          </>
        )}
      </button>
      {note && <div className="text-[11px] text-muted-foreground mt-2 leading-snug">{note}</div>}
    </div>
  );
}
