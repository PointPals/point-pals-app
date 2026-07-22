import { useCallback, useEffect, useRef, useState } from "react";
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
  // Floating "+N" receipts — one per new positive award, shown even when the
  // marble jar is quantised (large targets) and the award doesn't land a marble.
  const [floaters, setFloaters] = useState<
    { id: string; points: number; color: string; offsetX: number }[]
  >([]);
  const seenEventIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Prime the seen set on first mount so historical events don't all fly in.
    if (seenEventIds.current === null) {
      seenEventIds.current = new Set(history.map((e) => e.id));
      return;
    }
    if (settings.reducedMotion) return;
    const seen = seenEventIds.current;
    const fresh = history.filter((e) => !seen.has(e.id) && e.points > 0 && e.type !== "correction");
    if (fresh.length === 0) return;
    for (const e of fresh) seen.add(e.id);
    const additions = fresh.map((e) => {
      const kid = kids.find((k) => k.id === e.kidId);
      return {
        id: `${e.id}-${Math.random().toString(36).slice(2, 6)}`,
        points: e.points,
        color: kid ? PASTEL_HEX[kid.color] : "#F1D36A",
        offsetX: (Math.random() - 0.5) * 60,
      };
    });
    setFloaters((prev) => [...prev, ...additions]);
    const ids = additions.map((a) => a.id);
    const t = window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => !ids.includes(f.id)));
    }, 1400);
    return () => window.clearTimeout(t);
  }, [history, kids, settings.reducedMotion]);

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


      {/* Floating "+N" receipts — anchored near the jar mouth, drift upward */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[42%] z-20"
      >
        {floaters.map((f) => (
          <span
            key={f.id}
            className="absolute left-1/2 font-display text-2xl font-bold"
            style={{
              marginLeft: f.offsetX,
              color: "#2b2b2b",
              textShadow: `0 2px 8px ${f.color}, 0 0 2px rgba(255,255,255,0.9)`,
              animation: "pp-plus-float 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            +{f.points}
          </span>
        ))}
      </div>

      {/* Per-kid contribution: use personalPool (current cycle) when split jars are on,
          fall back to history-based total for legacy (no split jars) mode. */}
      {kids.length > 0 && household.sharedPool > 0 && (
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
          {kids.map((k) => {
            // Mirror the home-screen avatar badge exactly so the legend, the
            // badges and the jar total always agree: net current points (or
            // personal pool when split jars are on). Summing gross positive
            // history double-counted "needs-work" deductions, so a kid could
            // read higher here than on their badge and the legend could sum to
            // more than the jar total.
            const contributed = household.splitJarsEnabled ? k.personalPool : k.currentPoints;
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
