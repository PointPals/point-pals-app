import { memo, useCallback, useState } from "react";
import { useApp } from "@/lib/app-store";
import { useSettings } from "@/lib/settings";
import { MarbleJar } from "./MarbleJar";
import { Confetti } from "./Confetti";
import { playFanfare, haptic } from "@/lib/feedback";
import { Gift, Sparkles, Check } from "lucide-react";
import type { Kid } from "@/lib/mock-data";

/**
 * A small marble jar showing one kid's personal progress, with a "Claim
 * reward" button when full. Shown on the Rewards page when split jars are
 * enabled.
 */
export const PersonalJarCard = memo(function PersonalJarCard({
  kid,
  size = 130,
}: {
  kid: Kid;
  size?: number;
}) {
  const { history, claimPersonalReward } = useApp();
  const settings = useSettings();
  const [celebrating, setCelebrating] = useState(false);
  const [claimed, setClaimed] = useState(false);

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
    claimPersonalReward(kid.id);
    playFanfare();
    haptic("success");
    setCelebrating(true);
    setClaimed(true);
    setTimeout(() => {
      setCelebrating(false);
      setClaimed(false);
    }, 2500);
  }, [kid.id, claimPersonalReward]);

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
        events={history.filter((e) => e.kidId === kid.id && e.points > 0)}
        kids={[kid]}
        size={size}
        reducedMotion={settings.reducedMotion}
        onFull={onFull}
        className="relative z-10 -my-1"
      />

      <div className="relative z-10">
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
              <Check className="w-4 h-4" /> Reward claimed!
            </div>
          ) : (
            <button
              onClick={handleClaim}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition animate-pulse"
            >
              <Gift className="w-3.5 h-3.5" />
              {kid.personalReward ? kid.personalReward : "Claim reward"}
            </button>
          )
        ) : kid.personalTarget > 0 ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {remaining} point{remaining === 1 ? "" : "s"} to go · {pct}%
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted-foreground">No target set</div>
        )}
      </div>

      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </div>
  );
});
