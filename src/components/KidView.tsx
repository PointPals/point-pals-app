import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { useSettings, setSetting } from "@/lib/settings";
import { MarbleJar } from "./MarbleJar";
import { Lock } from "lucide-react";
import { KidsBoard } from "./kid-mode/KidsBoard";

/**
 * Full-screen, read-only "how are we doing?" screen for kids. Shows the family
 * jar and each child's progress with no way to award points or navigate
 * elsewhere. A parent exits with the PIN. Rendered by AppShell whenever
 * settings.kidsViewActive is on; it covers the whole app, so kids stay put.
 */
export function KidView() {
  const { household, kids, history } = useApp();
  const { activeReward } = useCorrection();
  const settings = useSettings();
  const [exiting, setExiting] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const tryExit = () => {
    if (!settings.kidsViewPin || pin === settings.kidsViewPin) {
      setSetting("kidsViewActive", false);
      setExiting(false);
      setPin("");
      setErr(false);
    } else {
      setErr(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-cream">
      <KidsBoard
        householdName={household.name}
        rewardName={activeReward?.name}
        sharedPool={household.sharedPool}
        rewardTarget={activeReward ? activeReward.targetPoints : household.rewardTarget}
        showFamily={household.sharedJarEnabled}
        kids={kids.map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color,
          companionId: k.companionId,
          points: household.splitJarsEnabled ? k.personalPool : k.currentPoints,
          personalPool: k.personalPool,
          personalTarget: k.personalTarget,
          personalReward: k.personalReward,
        }))}
        familyJar={
          <MarbleJar
            value={household.sharedPool}
            target={household.rewardTarget}
            events={history}
            kids={kids}
            size={260}
            reducedMotion={settings.reducedMotion}
            onFull={() => {}}
            className="-my-2"
          />
        }
        personalJar={(bk) => {
          const k = kids.find((x) => x.id === bk.id)!;
          return (
            <MarbleJar
              value={k.personalPool}
              target={k.personalTarget > 0 ? k.personalTarget : 999}
              events={history.filter((e) => e.kidId === k.id && e.points > 0)}
              kids={[k]}
              size={110}
              reducedMotion={settings.reducedMotion}
              onFull={() => {}}
              className="-my-1"
            />
          );
        }}
        topRight={
          <button
            onClick={() => setExiting(true)}
            aria-label="Exit kids' view"
            className="tap inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-semibold text-ink shadow-clay-sm"
          >
            <Lock className="h-4 w-4" aria-hidden /> Parent
          </button>
        }
      />

      {exiting && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-ink/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-xs space-y-3 rounded-3xl bg-card p-6 text-center shadow-lift">
            <h3 className="font-display text-2xl font-semibold">Grown-ups only</h3>
            <p className="text-sm text-muted-foreground">
              {settings.kidsViewPin ? "Enter your PIN to leave kids' view." : "Leave kids' view?"}
            </p>
            {settings.kidsViewPin && (
              <input
                autoFocus
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setErr(false);
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.4em] font-display text-xl rounded-xl border border-input bg-card px-3 py-2.5"
              />
            )}
            {err && <p className="text-sm text-destructive">Wrong PIN — try again.</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setExiting(false);
                  setPin("");
                  setErr(false);
                }}
                className="flex-1 rounded-full border border-input bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={tryExit}
                className="flex-1 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
