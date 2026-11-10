import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { PASTEL_HEX, type Kid, type RewardHistory } from "@/lib/mock-data";

// Personal-jar goals reached over time (every "Reset points" on a full
// personal jar). All time, not tied to the date range above: this is the
// long view of each member's progress.
export function GoalsReached({
  wins,
  kids,
  scopeKidId,
}: {
  wins: RewardHistory[];
  kids: Kid[];
  scopeKidId: string | null;
}) {
  const scoped = useMemo(
    () =>
      wins
        .filter((w) => (scopeKidId ? w.kidId === scopeKidId : true))
        .sort((a, b) => b.achievedAt - a.achievedAt),
    [wins, scopeKidId],
  );
  const kid = scopeKidId ? kids.find((k) => k.id === scopeKidId) : null;
  const who = kid ? kid.name : "the family";

  const points = scoped.reduce((sum, w) => sum + w.targetPoints, 0);
  const gapDays =
    scoped.length >= 2
      ? Math.round(
          (scoped[0].achievedAt - scoped[scoped.length - 1].achievedAt) /
            86400000 /
            (scoped.length - 1),
        )
      : null;

  // Wins per month, last six months (oldest first).
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        count: scoped.filter((w) => w.achievedAt >= d.getTime() && w.achievedAt < next.getTime())
          .length,
      };
    });
  }, [scoped]);
  const peak = Math.max(1, ...months.map((m) => m.count));

  const kidName = (id?: string | null) => kids.find((k) => k.id === id)?.name ?? "—";
  const kidColor = (id?: string | null) => kids.find((k) => k.id === id)?.color ?? "lilac";

  return (
    <section className="card-soft p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Goals reached
        </h2>
        <p className="text-xs text-muted-foreground">
          Every personal jar filled and reset, all time — {who}.
        </p>
      </div>

      {scoped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No personal goals reached yet. When {kid ? `${kid.name}'s` : "someone's"} own jar fills,
          tap <span className="font-semibold text-foreground">Reset points</span> on it and the win
          is saved here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat value={String(scoped.length)} label={scoped.length === 1 ? "goal" : "goals"} />
            <Stat value={String(points)} label="points" />
            <Stat value={gapDays !== null ? `${gapDays}d` : "—"} label="between wins" />
            <Stat
              value={new Date(scoped[0].achievedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
              label="latest"
            />
          </div>

          <div aria-label="Goals reached per month" role="img">
            <div className="flex h-20 items-end gap-2">
              {months.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                  {m.count > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums">{m.count}</span>
                  )}
                  <div
                    className="w-full max-w-10 rounded-t-md bg-cta"
                    style={{ height: `${(m.count / peak) * 100}%`, minHeight: m.count ? 4 : 1 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              {months.map((m) => (
                <span
                  key={m.label}
                  className="flex-1 text-center text-[11px] text-muted-foreground"
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {!kid && (
            <ul className="flex flex-wrap gap-2">
              {kids
                .map((k) => ({ k, n: scoped.filter((w) => w.kidId === k.id).length }))
                .filter(({ n }) => n > 0)
                .sort((a, b) => b.n - a.n)
                .map(({ k, n }) => (
                  <li
                    key={k.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
                  >
                    <span
                      aria-hidden
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PASTEL_HEX[k.color] }}
                    />
                    <span className="font-semibold">{k.name}</span>
                    <span className="text-muted-foreground tabular-nums">{n}</span>
                  </li>
                ))}
            </ul>
          )}

          <ul className="divide-y divide-border">
            {scoped.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PASTEL_HEX[kidColor(w.kidId)] }}
                />
                <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(w.achievedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {!kid && <span className="font-semibold">{kidName(w.kidId)} · </span>}
                  {w.rewardName}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">
                  {w.targetPoints} pts
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2.5 text-center">
      <div className="font-display text-xl font-bold leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
