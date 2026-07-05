import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type AwardBatch } from "@/lib/app-store";
import { primeAudio, playChime, haptic } from "@/lib/feedback";
import { KidBadge } from "@/components/KidBadge";
import { IconTile } from "@/components/IconTile";
import { FamilyJarCard } from "@/components/FamilyJarCard";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { EmptyState } from "@/components/EmptyState";
import { iconUrl, isIconKey } from "@/lib/icons";
import { Undo2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { kids, chores, skills, history, awardPoints, undoBatch, streakByKid, hydrated } = useApp();
  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work">("chores");
  const [hint, setHint] = useState<string | null>(null);
  const [toast, setToast] = useState<{ batch: AwardBatch; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setMounted(true), []);

  const positive = useMemo(() => skills.filter((s) => s.isPositive), [skills]);
  const needsWork = useMemo(() => skills.filter((s) => !s.isPositive), [skills]);

  const toggleKid = (id: string) => {
    primeAudio(); // unlock audio on first user gesture (iOS/Safari)
    haptic("light");
    setSelectedKids((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));
  };

  const flashHint = (text: string) => {
    setHint(text);
    setTimeout(() => setHint(null), 1400);
  };

  const award = (item: { name: string; icon: string; points: number }) => {
    if (selectedKids.length === 0) {
      flashHint("Pick a kid first ✨");
      haptic("warning");
      return;
    }
    const batch = awardPoints(selectedKids, item);
    const positiveAward = item.points >= 0;
    playChime(positiveAward ? "positive" : "needs-work");
    haptic(positiveAward ? "success" : "medium");

    const text = `${item.points > 0 ? "+" : ""}${item.points} ${item.name}`;
    setToast({ batch, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const undo = () => {
    if (!toast) return;
    undoBatch(toast.batch);
    haptic("light");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  const noItems = chores.length === 0 && skills.length === 0;
  const brandNew = hydrated && kids.length === 0;

  if (brandNew) {
    return <EmptyState variant="no-kids" />;
  }

  const activeList = tab === "chores" ? chores : tab === "positive" ? positive : needsWork;

  return (
    <div className="space-y-8">
      {/* Marble jar hero */}
      <FamilyJarCard size={230} />

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
              streak={streakByKid[kid.id] ?? 0}
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

      {/* Tabs + tile grid */}
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

        {noItems ? (
          <EmptyState variant="no-items" />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-5 justify-items-center">
            {activeList.map((item) => (
              <IconTile
                key={item.id}
                icon={item.icon}
                label={item.name}
                color={item.color}
                points={item.points}
                muted={tab === "needs-work"}
                onClick={() => award({ name: item.name, icon: item.icon, points: item.points })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Weekly recap */}
      <WeeklyRecap />

      {/* Today's feed — live, most-recent-first */}
      <section>
        <h2 className="font-display text-xl font-bold mb-3">Today's feed</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground card-soft px-4 py-6 text-center">
            Awards show up here as they happen.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 10).map((e) => {
              const kid = kids.find((k) => k.id === e.kidId);
              return (
                <li key={e.id} className="card-soft flex items-center gap-3 px-4 py-3">
                  {isIconKey(e.itemIcon) ? (
                    <img
                      src={iconUrl(e.itemIcon)}
                      alt=""
                      aria-hidden
                      className="w-10 h-10 rounded-xl object-contain"
                    />
                  ) : (
                    <span className="text-2xl">{e.itemIcon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{e.itemName}</div>
                    <div className="text-xs text-muted-foreground">
                      {kid?.name ?? "—"}
                      {mounted ? ` · ${timeAgo(e.at)}` : ""}
                    </div>
                  </div>
                  <span
                    className={`font-display font-bold ${e.points < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {e.points > 0 ? "+" : ""}
                    {e.points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Transient "pick a kid" hint */}
      {hint && (
        <div
          key={hint}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-pop-in"
        >
          <div className="rounded-full bg-foreground text-background px-5 py-3 shadow-xl font-display text-lg font-bold">
            {hint}
          </div>
        </div>
      )}

      {/* Undo toast (§2) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 animate-toast-in">
          <div className="flex items-center gap-3 rounded-full bg-foreground text-background pl-5 pr-2 py-2 shadow-xl">
            <span className="font-semibold text-sm whitespace-nowrap">{toast.text}</span>
            <button
              onClick={undo}
              className="flex items-center gap-1.5 rounded-full bg-background/15 hover:bg-background/25 px-3 py-1.5 text-sm font-bold transition"
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
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
