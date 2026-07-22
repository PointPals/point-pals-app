import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { useSettings, setSetting } from "@/lib/settings";
import { MarbleJar } from "./MarbleJar";
import { PASTEL_HEX } from "@/lib/mock-data";
import { Sparkles, Lock } from "lucide-react";

/**
 * Full-screen, read-only "how are we doing?" screen for kids. Shows the family
 * jar and each child's progress with no way to award points or navigate
 * elsewhere. A parent exits with the PIN. Rendered by AppShell whenever
 * settings.kidsViewActive is on; it covers the whole app, so kids stay put.
 */
export function KidView() {
  const { household, kids, history } = useApp();
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

  const showFamily = household.sharedJarEnabled;
  const jarKids = kids.filter((k) => (k.personalTarget ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles className="w-5 h-5" /> How we're doing
        </div>
        <button
          onClick={() => setExiting(true)}
          aria-label="Exit kids' view"
          className="tap inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition"
        >
          <Lock className="w-4 h-4" /> Parent
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-10">
        {showFamily && (
          <div className="flex flex-col items-center text-center">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Family jar</div>
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
            <div className="font-display text-3xl font-bold leading-none">
              {household.sharedPool}
              <span className="text-muted-foreground text-lg font-sans font-normal">
                {" "}/ {household.rewardTarget}
              </span>
            </div>
          </div>
        )}

        {jarKids.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {jarKids.map((k) => (
              <div key={k.id} className="flex flex-col items-center text-center">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {k.name}&apos;s jar
                </div>
                <MarbleJar
                  value={k.personalPool}
                  target={k.personalTarget > 0 ? k.personalTarget : 999}
                  events={history.filter((e) => e.kidId === k.id && e.points > 0)}
                  kids={[k]}
                  size={150}
                  reducedMotion={settings.reducedMotion}
                  onFull={() => {}}
                  className="-my-1"
                />
                <div className="font-display text-2xl font-bold leading-none">
                  {k.personalPool}
                  <span className="text-muted-foreground text-sm font-sans font-normal">
                    {" "}/ {k.personalTarget}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Every kid's point total, so a child can always find their own number. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kids.map((k) => (
            <div key={k.id} className="card-soft p-3 flex flex-col items-center text-center gap-1">
              <span
                aria-hidden
                className="inline-block w-3 h-3 rounded-full shadow-inner"
                style={{ backgroundColor: PASTEL_HEX[k.color] }}
              />
              <div className="text-sm font-semibold truncate max-w-full">{k.name}</div>
              <div className="font-display text-2xl font-bold">
                {household.splitJarsEnabled ? k.personalPool : k.currentPoints}
              </div>
            </div>
          ))}
        </div>
      </div>

      {exiting && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-foreground/40 backdrop-blur-sm p-6">
          <div className="card-soft w-full max-w-xs p-6 text-center space-y-3">
            <h3 className="font-display text-lg font-bold">Parent exit</h3>
            <p className="text-sm text-muted-foreground">
              {settings.kidsViewPin
                ? "Enter your PIN to leave kids' view."
                : "Leave kids' view?"}
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
