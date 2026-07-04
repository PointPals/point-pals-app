import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-store";
import { KidBadge } from "@/components/KidBadge";
import { IconTile } from "@/components/IconTile";
import { PlushCompanion } from "@/components/PlushCompanion";
import { COMPANIONS } from "@/lib/mock-data";
import { iconUrl, isIconKey } from "@/lib/icons";

import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { kids, chores, skills, history, awardPoints, household, unlockedCompanionIds } = useApp();
  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work">("chores");
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const positive = useMemo(() => skills.filter((s) => s.isPositive), [skills]);
  const needsWork = useMemo(() => skills.filter((s) => !s.isPositive), [skills]);
  const nextCompanion = COMPANIONS.find((c) => !unlockedCompanionIds.includes(c.id));

  const toggleKid = (id: string) =>
    setSelectedKids((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));

  const award = (item: { name: string; icon: string; points: number }) => {
    if (selectedKids.length === 0) {
      setFlash({ id: Date.now(), text: "Pick a kid first ✨" });
      setTimeout(() => setFlash(null), 1400);
      return;
    }
    awardPoints(selectedKids, item);
    setFlash({
      id: Date.now(),
      text: `${item.points > 0 ? "+" : ""}${item.points} · ${item.name}`,
    });
    setTimeout(() => setFlash(null), 1400);
  };

  return (
    <div className="space-y-8">
      {/* Kids row */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Who earned it?</h2>
          {selectedKids.length > 0 && (
            <button
              onClick={() => setSelectedKids([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {kids.map((kid) => (
            <KidBadge
              key={kid.id}
              kid={kid}
              size="lg"
              selected={selectedKids.includes(kid.id)}
              onClick={() => toggleKid(kid.id)}
            />
          ))}
          <Link
            to="/library"
            className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-2xl self-start hover:border-foreground hover:text-foreground transition"
            aria-label="Manage family"
          >
            +
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Tap one or more kids, then choose a chore or skill below.
        </p>
      </section>

      {/* Tabs */}
      <section>
        <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 mb-4">
          {[
            { k: "chores", label: `Chores · ${chores.length}` },
            { k: "positive", label: `Positive · ${positive.length}` },
            { k: "needs-work", label: `Needs work · ${needsWork.length}` },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-5 justify-items-center">
          {tab === "chores" &&
            chores.map((c) => (
              <IconTile
                key={c.id}
                icon={c.icon}
                label={c.name}
                color={c.color}
                points={c.points}
                onClick={() => award({ name: c.name, icon: c.icon, points: c.points })}
              />
            ))}
          {tab === "positive" &&
            positive.map((s) => (
              <IconTile
                key={s.id}
                icon={s.icon}
                label={s.name}
                color={s.color}
                points={s.points}
                onClick={() => award({ name: s.name, icon: s.icon, points: s.points })}
              />
            ))}
          {tab === "needs-work" &&
            needsWork.map((s) => (
              <IconTile
                key={s.id}
                icon={s.icon}
                label={s.name}
                color={s.color}
                points={s.points}
                muted
                onClick={() => award({ name: s.name, icon: s.icon, points: s.points })}
              />
            ))}
        </div>
      </section>

      {/* Next companion teaser */}
      {nextCompanion && (
        <section className="card-soft p-5 flex items-center gap-4">
          <PlushCompanion companion={nextCompanion} locked size={72} />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Next companion</div>
            <div className="font-display text-xl font-bold">Mystery friend</div>
            <div className="text-sm text-muted-foreground">
              Unlocks at <span className="font-semibold text-foreground">{nextCompanion.unlockAt}</span> family points
              — {Math.max(0, nextCompanion.unlockAt - household.sharedPool)} to go.
            </div>
          </div>
          <Link to="/collection" className="text-sm font-semibold flex items-center gap-1 hover:underline">
            View <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="font-display text-xl font-bold mb-3">Recent activity</h2>
        <ul className="space-y-2">
          {history.slice(0, 8).map((e) => {
            const kid = kids.find((k) => k.id === e.kidId);
            return (
              <li
                key={e.id}
                className="card-soft flex items-center gap-3 px-4 py-3"
              >
                {isIconKey(e.itemIcon) ? (
                  <img src={iconUrl(e.itemIcon)} alt="" aria-hidden className="w-10 h-10 rounded-xl object-contain" />
                ) : (
                  <span className="text-2xl">{e.itemIcon}</span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.itemName}</div>
                  <div className="text-xs text-muted-foreground">
                    {kid?.name}{mounted ? ` · ${timeAgo(e.at)}` : ""}
                  </div>
                </div>
                <span
                  className={`font-display font-bold ${e.points < 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {e.points > 0 ? "+" : ""}{e.points}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Award flash toast */}
      {flash && (
        <div
          key={flash.id}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-pop-in"
        >
          <div className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 shadow-xl font-display text-lg font-bold">
            <Check className="w-5 h-5" />
            {flash.text}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
