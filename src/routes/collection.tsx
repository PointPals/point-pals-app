import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-store";
import { PlushCompanion } from "@/components/PlushCompanion";
import { COMPANIONS } from "@/lib/mock-data";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/collection")({
  component: CollectionPage,
  head: () => ({
    meta: [
      { title: "Collection — PointPals" },
      { name: "description", content: "Your family's plush companion gallery. Every milestone unlocks a new friend." },
    ],
  }),
});

function CollectionPage() {
  const { unlockedCompanionIds, household } = useApp();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">The Collection</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          A shared plush menagerie. Every companion appears when the whole family reaches a milestone —
          they're a surprise, so you never know which one comes next.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {COMPANIONS.map((c) => {
          const unlocked = unlockedCompanionIds.includes(c.id);
          const remaining = Math.max(0, c.unlockAt - household.sharedPool);
          return (
            <div
              key={c.id}
              className={`card-soft p-4 flex flex-col items-center gap-2 relative overflow-hidden ${
                unlocked ? "" : "opacity-95"
              }`}
              style={{
                background: unlocked
                  ? `linear-gradient(180deg, color-mix(in oklab, var(--pastel-${c.color}) 30%, white), white)`
                  : undefined,
              }}
            >
              <PlushCompanion companion={c} locked={!unlocked} size={120} />
              <div className="text-center">
                <div className="font-display text-xl font-bold">
                  {unlocked ? c.name : "???"}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {unlocked ? c.trait : `Unlock at ${c.unlockAt}`}
                </div>
              </div>
              {!unlocked && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Lock className="w-3 h-3" />
                  {remaining} points to go
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
