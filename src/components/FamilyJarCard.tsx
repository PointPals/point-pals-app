import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { TINT_HEX } from "@/lib/companion-tints";
import { CompanionAvatar } from "./CompanionAvatar";
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
  const { activeReward } = useCorrection();
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

  // The marble walk must mirror what actually moves the shared pool. Correction
  // entries are an admin fix that deliberately bypass the jar, so feeding them
  // to the jar would make the derived marble set drift from the real total.
  const jarEvents = useMemo(() => history.filter((e) => e.type !== "correction"), [history]);

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
    <div className="card-clay relative w-full max-w-xl overflow-hidden px-5 pb-6 pt-6 flex flex-col items-center text-center">
      {/* Soft glow — a warm pool of light the jar sits in */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 12%, oklch(0.95 0.06 85 / 0.9), transparent 70%)," +
            "radial-gradient(45% 40% at 10% 55%, oklch(0.93 0.05 300 / 0.55), transparent 70%)," +
            "radial-gradient(45% 40% at 92% 60%, oklch(0.93 0.05 210 / 0.55), transparent 70%)",
        }}
      />
      {/* Warm shelf glow beneath the jar */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-24 h-16 w-3/4 rounded-[50%]"
        style={{
          background: "radial-gradient(closest-side, rgba(212,168,74,0.28), transparent 75%)",
          filter: "blur(10px)",
        }}
      />

      <div className="relative z-10 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" aria-hidden /> Family jar
      </div>
      {activeReward && (
        <div className="relative z-10 mt-1.5 max-w-full truncate px-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
          {activeReward.name}
        </div>
      )}

      <MarbleJar
        value={household.sharedPool}
        target={household.rewardTarget}
        events={jarEvents}
        kids={kids}
        size={size}
        reducedMotion={settings.reducedMotion}
        onFull={onFull}
        className="relative z-10 -my-2"
      />

      {/* Floating "+N" receipts — anchored near the jar mouth, drift upward */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[42%] z-20">
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
        <div className="relative z-10 mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
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
                  className="relative inline-block h-6 w-6 overflow-hidden rounded-full ring-2"
                  style={{
                    backgroundColor: PASTEL_HEX[k.color],
                    ["--tw-ring-color" as string]: TINT_HEX[k.color],
                  }}
                >
                  <CompanionAvatar
                    seed={k.id}
                    color={k.color}
                    size={24}
                    companionId={k.companionId}
                  />
                </span>
                <span className="font-semibold text-ink">{k.name}</span>
                <span className="tabular-nums">· {contributed}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative z-10 mt-4">
        <div className="font-display text-4xl font-semibold leading-none tracking-[-0.03em] text-ink">
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
              className="tap mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-cta px-6 text-sm font-semibold text-white shadow-clay-sm hover:opacity-90 transition"
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
