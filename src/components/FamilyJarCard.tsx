import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useSettings } from "@/lib/settings";
import { playFanfare, haptic } from "@/lib/feedback";
import { MarbleJar } from "./MarbleJar";
import { Confetti } from "./Confetti";

// Wraps the marble jar with the family pool context, the "full" celebration
// (confetti + fanfare + haptic) and the reward CTA (§3). Reused on Home and
// Rewards.
export function FamilyJarCard({ size = 240 }: { size?: number }) {
  const { household } = useApp();
  const settings = useSettings();
  const [celebrating, setCelebrating] = useState(false);
  const reached = household.sharedPool >= household.rewardTarget;
  const remaining = Math.max(0, household.rewardTarget - household.sharedPool);
  const pct = Math.min(100, Math.round((household.sharedPool / household.rewardTarget) * 100));

  const onFull = useCallback(() => {
    if (settings.reducedMotion) return;
    setCelebrating(true);
    playFanfare();
    haptic("success");
  }, [settings.reducedMotion]);

  return (
    <div className="card-soft relative overflow-hidden p-5 flex flex-col items-center text-center">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-butter/30 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" /> Family jar
      </div>

      <MarbleJar
        value={household.sharedPool}
        target={household.rewardTarget}
        size={size}
        reducedMotion={settings.reducedMotion}
        onFull={onFull}
        className="relative z-10 -my-2"
      />

      <div className="relative z-10">
        <div className="font-display text-3xl font-bold leading-none">
          {household.sharedPool}
          <span className="text-muted-foreground text-lg font-sans font-normal">
            {" "}
            / {household.rewardTarget}
          </span>
        </div>
        {reached ? (
          <div className="mt-3">
            <div className="font-display text-xl font-bold text-foreground">
              The jar is full! 🎉
            </div>
            <Link
              to="/rewards"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              Choose your reward
            </Link>
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{remaining}</span> point
            {remaining === 1 ? "" : "s"} to go
            <span className="mx-1.5">·</span>
            {pct}% full
          </div>
        )}
      </div>

      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </div>
  );
}
