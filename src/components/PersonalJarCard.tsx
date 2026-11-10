import { memo, useCallback, useMemo, useState } from "react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { useSettings } from "@/lib/settings";
import { MarbleJar } from "./MarbleJar";
import { Confetti } from "./Confetti";
import { playFanfare, haptic } from "@/lib/feedback";
import { Link } from "@tanstack/react-router";
import { Sparkles, Check, Pencil, RefreshCw, RotateCcw, Trophy } from "lucide-react";
import type { Kid } from "@/lib/mock-data";

/**
 * A small marble jar showing one kid's personal progress, with a "Reset
 * points" button when they reach their target (which records the win in their
 * report and starts the jar again) and (optionally) the change / restart controls the
 * family jar has (change the reward name + target, restart the jar back to
 * zero). Those controls live on the Rewards page; the home screen passes
 * `showControls={false}` so the jar there is view + claim only.
 */
export const PersonalJarCard = memo(function PersonalJarCard({
  kid,
  size = 130,
  showControls = true,
}: {
  kid: Kid;
  size?: number;
  showControls?: boolean;
}) {
  const { history, resetKidPoints, setPersonalTarget } = useApp();
  const { personalWins, resetPersonalGoal } = useCorrection();
  const wins = useMemo(
    () => personalWins.filter((w) => w.kidId === kid.id).length,
    [personalWins, kid.id],
  );
  const settings = useSettings();
  const [celebrating, setCelebrating] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Feed the jar every event that actually moves this kid's personal pool —
  // positives AND "needs-work" removals, but not corrections (those bypass the
  // jar). Filtering to positives only made removals silently drift from the
  // real total, so the jar wouldn't recalculate when points were taken away.
  const jarEvents = useMemo(
    () => history.filter((e) => e.kidId === kid.id && e.type !== "correction"),
    [history, kid.id],
  );

  // Inline "change reward" editor — mirrors the family jar's Change/Set flow.
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(kid.personalReward ?? "");
  const [targetDraft, setTargetDraft] = useState(kid.personalTarget > 0 ? kid.personalTarget : 30);

  const reached = kid.personalTarget > 0 && kid.personalPool >= kid.personalTarget;
  const remaining = Math.max(0, (kid.personalTarget ?? 0) - kid.personalPool);
  const pct =
    kid.personalTarget > 0
      ? Math.min(100, Math.round((kid.personalPool / kid.personalTarget) * 100))
      : 0;

  const onFull = useCallback(() => {
    if (settings.reducedMotion) return;
    setCelebrating(true);
  }, [settings.reducedMotion]);

  const handleClaim = useCallback(() => {
    if (
      !window.confirm(
        `Reset ${kid.name}'s points? Reaching ${kid.personalTarget} is saved to ${kid.name}'s report, and their jar starts again from 0.`,
      )
    )
      return;
    resetPersonalGoal(kid.id);
    playFanfare();
    haptic("success");
    setCelebrating(true);
    setClaimed(true);
    setTimeout(() => {
      setCelebrating(false);
      setClaimed(false);
    }, 2500);
  }, [kid.id, kid.name, kid.personalTarget, resetPersonalGoal]);

  const openEditor = useCallback(() => {
    setNameDraft(kid.personalReward ?? "");
    setTargetDraft(kid.personalTarget > 0 ? kid.personalTarget : 30);
    setEditing(true);
  }, [kid.personalReward, kid.personalTarget]);

  const saveReward = useCallback(() => {
    setPersonalTarget(kid.id, Math.max(10, targetDraft), nameDraft.trim());
    setEditing(false);
  }, [kid.id, targetDraft, nameDraft, setPersonalTarget]);

  const handleRestart = useCallback(() => {
    if (
      !window.confirm(
        `Restart ${kid.name}'s reward? This resets their jar to 0 points and removes those points from the family jar.`,
      )
    )
      return;
    resetKidPoints(kid.id);
  }, [kid.id, kid.name, resetKidPoints]);

  return (
    <div className="card-soft relative overflow-hidden p-4 flex flex-col items-center text-center">
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, color-mix(in oklab, var(--pastel-${kid.color}) 30%, transparent), transparent)`,
        }}
      />

      <div className="relative z-10 flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="w-3 h-3" /> {kid.name}&apos;s jar
      </div>

      <MarbleJar
        value={kid.personalPool}
        target={kid.personalTarget > 0 ? kid.personalTarget : 999}
        events={jarEvents}
        kids={[kid]}
        size={size}
        reducedMotion={settings.reducedMotion}
        onFull={onFull}
        className="relative z-10 -my-1"
      />

      <div className="relative z-10 w-full">
        {editing ? (
          <div className="mt-2 space-y-2 text-left">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Reward name"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={targetDraft}
                onChange={(e) => setTargetDraft(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="font-display text-sm font-bold w-8 text-right tabular-nums">
                {targetDraft}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveReward}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-cta px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-full border border-input bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="font-display text-2xl font-bold leading-none">
              {kid.personalPool}
              <span className="text-muted-foreground text-sm font-sans font-normal">
                {" "}
                / {kid.personalTarget}
              </span>
            </div>
            {reached ? (
              claimed ? (
                <div className="mt-2 text-sm font-semibold text-sage-foreground flex items-center gap-1.5 justify-center">
                  <Check className="w-4 h-4" /> Saved to {kid.name}&apos;s report
                </div>
              ) : (
                <div className="mt-2 flex flex-col items-center gap-1.5">
                  <div className="text-xs font-semibold text-ink">
                    🎉 Goal reached{kid.personalReward ? ` — ${kid.personalReward}` : "!"}
                  </div>
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="tap inline-flex min-h-10 items-center gap-1.5 rounded-full bg-cta px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset points
                  </button>
                </div>
              )
            ) : kid.personalTarget > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {remaining} point{remaining === 1 ? "" : "s"} to go · {pct}%
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">No target set</div>
            )}

            {wins > 0 && (
              <Link
                to="/reports"
                search={{ kid: kid.id }}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-ink"
              >
                <Trophy className="w-3 h-3" /> {wins} {wins === 1 ? "goal" : "goals"} reached
              </Link>
            )}

            {/* Change / Restart — same mechanics as the family jar. Hidden on
                the home screen (showControls=false); managed on the Rewards page. */}
            {showControls && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={openEditor}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-input bg-card px-3 py-1.5 text-[11px] font-semibold hover:bg-muted transition"
                >
                  <Pencil className="w-3 h-3" /> Change
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-destructive/40 text-destructive px-3 py-1.5 text-[11px] font-semibold hover:bg-destructive/10 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Restart
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </div>
  );
});
