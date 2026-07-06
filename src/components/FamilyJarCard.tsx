import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useSettings } from "@/lib/settings";
import { playFanfare, haptic } from "@/lib/feedback";
import { MarbleJar } from "./MarbleJar";
import { Confetti } from "./Confetti";
import { PASTEL_HEX } from "@/lib/mock-data";

// Wraps the marble jar with the family pool context, the "full" celebration
// (confetti + fanfare + haptic) and the reward CTA (§3). Reused on Home and
// Rewards.
export function FamilyJarCard({ size = 240 }: { size?: number }) {
  const { household, history, kids } = useApp();
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
      {/* Pastel mesh backdrop — soft, warm, heirloom-shelf feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 10%, rgba(253,230,138,0.45), transparent 70%)," +
            "radial-gradient(50% 40% at 12% 40%, rgba(251,207,232,0.4), transparent 70%)," +
            "radial-gradient(55% 45% at 92% 55%, rgba(191,219,254,0.4), transparent 70%)," +
            "radial-gradient(70% 40% at 50% 100%, rgba(221,214,254,0.35), transparent 70%)",
        }}
      />
      {/* Warm shelf glow beneath the jar */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-14 h-16 w-3/4 rounded-[50%]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(212,168,74,0.28), transparent 75%)",
          filter: "blur(10px)",
        }}
      />

      <div className="relative z-10 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" /> Family jar
      </div>

      <MarbleJar
        value={household.sharedPool}
        target={household.rewardTarget}
        events={history}
        kids={kids}
        size={size}
        reducedMotion={settings.reducedMotion}
        onFull={onFull}
        className="relative z-10 -my-2"
      />

      {/* Per-kid contribution legend: each kid's colour dot + how many of the
          jar's *positive* points they put in over the recent event window. */}
      {kids.length > 0 && (
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
          {kids.map((k) => {
            const contributed = history
              .filter((e) => e.kidId === k.id && e.points > 0)
              .reduce((sum, e) => sum + e.points, 0);
            return (
              <div key={k.id} className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full shadow-inner"
                  style={{ backgroundColor: PASTEL_HEX[k.color] }}
                />
                <span className="font-medium text-foreground">{k.name}</span>
                <span>· {contributed}</span>
              </div>
            );
          })}
        </div>
      )}

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
