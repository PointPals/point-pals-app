import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { KidBadge } from "@/components/KidBadge";
import { FamilyJarCard } from "@/components/FamilyJarCard";
import { PersonalJarCard } from "@/components/PersonalJarCard";
import { playFanfare, haptic, playChime } from "@/lib/feedback";

import { Gift, Target, History, Trophy, Check, PartyPopper, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
  head: () => ({
    meta: [
      { title: "Rewards — PointPals" },
      {
        name: "description",
        content: "Set a family reward and track progress toward filling the jar.",
      },
    ],
  }),
});

function RewardsPage() {
  const {
    household,
    kids,
    history,
    setRewardTarget,
    resetRewardCycle,
  } = useApp();
  const { activeReward, setActiveReward, claimReward, clearActiveReward, rewardHistory } = useCorrection();
  const [rewardName, setRewardName] = useState(activeReward?.name ?? "");
  const [rewardTarget, setRewardTargetLocal] = useState(
    activeReward?.targetPoints ?? household.rewardTarget,
  );
  const [editing, setEditing] = useState(!activeReward);
  const [celebrating, setCelebrating] = useState(false);

  // The active reward hydrates from localStorage/server after first render —
  // fold it into the form state when it arrives so a reload doesn't dump the
  // parent back into the empty "Set a reward" form.
  useEffect(() => {
    if (activeReward) {
      setRewardName(activeReward.name);
      setRewardTargetLocal(activeReward.targetPoints);
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [activeReward]);

  const reached = household.sharedPool >= household.rewardTarget;
  const pct = Math.min(100, (household.sharedPool / household.rewardTarget) * 100);

  const saveReward = useCallback(() => {
    if (!rewardName.trim()) return;
    // `setActiveReward` persists reward_name + target AND reward_target to the DB
    // in a single UPDATE via persistActiveReward, so we skip the separate
    // setRewardTarget call to avoid a race with Realtime sync.
    const target = Math.max(10, rewardTarget);
    setActiveReward(rewardName.trim(), target);
    // Still update local app-store household state so any component reading
    // household.rewardTarget directly sees the new value immediately.
    setRewardTarget(target);
    setEditing(false);
  }, [rewardName, rewardTarget, setActiveReward, setRewardTarget]);

  const handleRestartReward = useCallback(() => {
    if (!window.confirm("Restart reward? This will reset all points to 0 and clear the current reward.")) return;
    resetRewardCycle();
    clearActiveReward();
    setEditing(true);
  }, [resetRewardCycle, clearActiveReward]);

  const handleClaimReward = useCallback(() => {
    const name = activeReward?.name ?? "Family reward";
    claimReward(name, activeReward?.targetPoints ?? household.rewardTarget);
    playFanfare();
    haptic("success");
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 3000);
  }, [activeReward, household.rewardTarget, claimReward]);

  const avgDays = useCallback(() => {
    if (rewardHistory.length < 2) return null;
    const sorted = [...rewardHistory].sort((a, b) => b.achievedAt - a.achievedAt);
    let total = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      total += (sorted[i].achievedAt - sorted[i + 1].achievedAt) / 86400000;
    }
    return Math.round(total / (sorted.length - 1));
  }, [rewardHistory]);

  const mostRepeated = useCallback(() => {
    if (rewardHistory.length < 3) return null;
    const counts: Record<string, number> = {};
    rewardHistory.forEach((r) => {
      counts[r.rewardName] = (counts[r.rewardName] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  }, [rewardHistory]);

  const days = avgDays();
  const repeated = mostRepeated();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Gift className="w-7 h-7" /> Family rewards
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a reward, fill the jar, celebrate together.
        </p>
      </div>

      {/* Shared family jar — hidden when individual jars only */}
      {household.sharedJarEnabled && (
        <>
          <FamilyJarCard size={300} />

          {/* Active reward / set reward */}
          <section className="card-soft p-5 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5" />
              {editing ? "Set a reward" : activeReward ? "Current reward" : "No reward yet"}
            </h2>

        {editing || !activeReward ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                What are you working towards?
              </label>
              <input
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && rewardName.trim()) {
                    e.preventDefault();
                    setActiveReward(rewardName.trim(), Math.max(10, rewardTarget));
                    setRewardTarget(Math.max(10, rewardTarget));
                    setEditing(false);
                  }
                }}
                onBlur={() => {
                  // Save on blur too — catches cases where the user tabs away
                  // or the keyboard dismisses without hitting the save button.
                  if (rewardName.trim() && rewardTarget >= 10) {
                    setActiveReward(rewardName.trim(), Math.max(10, rewardTarget));
                    setRewardTarget(Math.max(10, rewardTarget));
                  }
                }}
                placeholder="e.g. Pizza night, trampoline park, movie night…"
                autoFocus
                className="w-full mt-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Target points
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={30}
                  max={400}
                  step={10}
                  value={rewardTarget}
                  onChange={(e) => setRewardTargetLocal(Number(e.target.value))}
                  className="flex-1 accent-foreground"
                />
                <span className="font-display text-lg font-bold w-12 text-right">
                  {rewardTarget}
                </span>
              </div>
            </div>
            <button
              onClick={saveReward}
              disabled={!rewardName.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Set reward
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card-soft p-4 bg-muted/30">
              <div className="text-sm text-muted-foreground">Working towards</div>
              <div className="font-display text-2xl font-bold mt-1">{activeReward.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {household.sharedPool} / {activeReward.targetPoints} points
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
              >
                Change reward
              </button>
              <button
                onClick={handleRestartReward}
                className="flex-1 rounded-full border border-destructive/40 text-destructive px-5 py-2.5 text-sm font-semibold hover:bg-destructive/10 transition"
              >
                Restart reward
              </button>
              {reached && (
                <button
                  onClick={handleClaimReward}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition animate-pulse"
                >
                  <PartyPopper className="w-4 h-4" /> Claim reward!
                </button>
              )}
            </div>
          </div>
        )}

        {reached && !editing && (
          <div className="rounded-xl bg-butter/30 p-4 text-sm">
            <strong className="font-semibold">🎉 The jar is full!</strong> Tap "Claim reward" to log
            it and start a new cycle.
          </div>
        )}
      </section>
        </>
      )}

      {/* Individual jars — progress cards only. Config moved to Settings. */}
      {household.splitJarsEnabled && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Gift className="w-5 h-5" /> Individual rewards
              </h2>
              <Link
                to="/settings"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Configure in Settings →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Each kid has their own jar + reward. Every point award fills BOTH the shared family
              jar and each kid&apos;s personal jar.
            </p>
          </section>

          {/* Personal jar progress cards */}
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Gift className="w-4 h-4" /> Progress
            </h3>
            {kids.filter((k) => (k.personalTarget ?? 0) > 0).length === 0 ? (
              <div className="card-soft p-4 text-center text-sm text-muted-foreground">
                Set personal targets above and each kid&apos;s jar will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kids
                  .filter((k) => (k.personalTarget ?? 0) > 0)
                  .map((k) => (
                    <PersonalJarCard key={k.id} kid={k} size={120} />
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Reward history */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5" /> Past rewards
        </h2>

        {rewardHistory.length >= 3 && (
          <div className="card-soft p-4 text-sm text-muted-foreground">
            {days !== null && <span className="font-semibold text-foreground">{days} days</span>}{" "}
            average between rewards
            {repeated && (
              <>
                {" · Most repeated: "}
                <span className="font-semibold text-foreground">{repeated[0]}</span>
                {" ("}
                {repeated[1]}
                {repeated[1] === 1 ? " time" : " times"}
                {")"}
              </>
            )}
          </div>
        )}

        {rewardHistory.length === 0 ? (
          <div className="card-soft p-6 text-center text-muted-foreground text-sm">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            No rewards claimed yet. Fill the jar and claim your first one!
          </div>
        ) : (
          <ul className="space-y-2">
            {rewardHistory.map((r) => (
              <li key={r.id} className="card-soft p-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg font-bold">{r.rewardName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.achievedAt).toLocaleDateString()} · {r.targetPoints} points
                  </div>
                </div>
                <div className="flex -space-x-1.5">
                  {r.contributingKidIds.map((kidId) => {
                    const kid = kids.find((k) => k.id === kidId);
                    if (!kid) return null;
                    return (
                      <span
                        key={kidId}
                        className="h-7 w-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: `var(--pastel-${kid.color})` }}
                        title={kid.name}
                      >
                        {kid.name[0]}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
