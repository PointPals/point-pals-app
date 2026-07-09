import { memo } from "react";
import { MarbleJar } from "@/components/MarbleJar";
import { Confetti } from "@/components/Confetti";
import { Gift, Sparkles } from "lucide-react";

/**
 * Marketing hero centrepiece: a MASSIVE marble jar. Points come from the
 * mascots via WalkingMascots (parent lifts state). When the jar fills, a
 * reward celebration bursts.
 */

export const HeroJarScene = memo(function HeroJarScene({
  value,
  target,
  celebrating,
  pendingDrops,
  onFull,
}: {
  value: number;
  target: number;
  celebrating: boolean;
  pendingDrops?: { n: number; tint: string }[];
  onFull: () => void;
}) {
  return (
    <div className="relative h-[420px] sm:h-[640px] lg:h-[720px] w-full">
      {/* soft glow behind the jar */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 55% 55%, rgba(251,207,232,0.85), transparent 70%)," +
            "radial-gradient(45% 40% at 55% 40%, rgba(253,230,138,0.6), transparent 70%)",
        }}
      />

      {/* The massive jar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={
            "transition-transform duration-500 " +
            (celebrating ? "scale-105" : "scale-100")
          }
        >
          <MarbleJar
            value={value}
            target={target}
            size={typeof window !== "undefined" && window.innerWidth < 640 ? 240 : 460}
            pendingDrops={pendingDrops}
            onFull={onFull}
            suppressDissolveChime
            suppressClink
          />
        </div>
      </div>

      {/* Celebration overlay */}
      {celebrating && (
        <>
          <Confetti />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-3xl bg-white/90 backdrop-blur-md px-6 py-4 shadow-[0_20px_60px_-10px_rgba(236,72,153,0.55)] border border-white/70 flex items-center gap-3"
              style={{ animation: "pp-reward-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-amber-400 flex items-center justify-center text-white shadow-inner">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-pink-500">
                  <Sparkles className="h-3.5 w-3.5" /> Jar full!
                </div>
                <div className="font-display text-lg font-bold text-foreground">
                  Family reward unlocked
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});