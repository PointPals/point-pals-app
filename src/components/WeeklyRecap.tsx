import { useMemo } from "react";
import { CalendarDays, Trophy, TrendingUp, Target } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { COMPANIONS } from "@/lib/mock-data";

// Weekly recap card (§4) — a short, warm summary of the week: top chore, biggest
// day, progress toward the next reward. Deliberately a recap, NOT a competitive
// ranking between siblings.
export function WeeklyRecap() {
  const { history, household } = useApp();

  const recap = useMemo(() => {
    const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const week = history.filter((e) => e.at >= weekAgo && e.points > 0);

    // top chore/skill by count
    const byItem = new Map<string, number>();
    for (const e of week) byItem.set(e.itemName, (byItem.get(e.itemName) ?? 0) + 1);
    let topItem: string | null = null;
    let topCount = 0;
    for (const [name, count] of byItem) {
      if (count > topCount) {
        topItem = name;
        topCount = count;
      }
    }

    // biggest day by points
    const byDay = new Map<string, number>();
    for (const e of week) {
      const d = new Date(e.at).toLocaleDateString(undefined, { weekday: "long" });
      byDay.set(d, (byDay.get(d) ?? 0) + e.points);
    }
    let bigDay: string | null = null;
    let bigPts = 0;
    for (const [day, pts] of byDay) {
      if (pts > bigPts) {
        bigDay = day;
        bigPts = pts;
      }
    }

    const totalPts = week.reduce((a, e) => a + e.points, 0);
    return { topItem, topCount, bigDay, bigPts, totalPts, count: week.length };
  }, [history]);

  const nextReward = Math.max(0, household.rewardTarget - household.sharedPool);
  const nextCompanion = COMPANIONS.find((c) => household.sharedPool < c.unlockAt);

  if (recap.count === 0) return null;

  return (
    <section
      className="animate-recap-rise rounded-3xl p-5 overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--pastel-lilac) 45%, white), color-mix(in oklab, var(--pastel-sky) 40%, white))",
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground/60 mb-3">
        <CalendarDays className="w-3.5 h-3.5" /> This week
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RecapTile
          icon={<Trophy className="w-4 h-4" />}
          label="Top chore"
          value={recap.topItem ?? "—"}
          sub={recap.topItem ? `${recap.topCount}× done` : ""}
        />
        <RecapTile
          icon={<TrendingUp className="w-4 h-4" />}
          label="Biggest day"
          value={recap.bigDay ?? "—"}
          sub={recap.bigDay ? `+${recap.bigPts} points` : ""}
        />
        <RecapTile
          icon={<Target className="w-4 h-4" />}
          label="Next reward"
          value={nextReward === 0 ? "Ready!" : `${nextReward} to go`}
          sub={nextCompanion ? `then meet ${nextCompanion.name}` : ""}
        />
      </div>
      <p className="text-xs text-foreground/60 mt-3">
        {recap.count} awards · +{recap.totalPts} points earned together this week. Lovely work,
        everyone.
      </p>
    </section>
  );
}

function RecapTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-card/70 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
        {icon}
        {label}
      </div>
      <div className="font-display text-lg font-bold leading-tight mt-0.5 truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}
