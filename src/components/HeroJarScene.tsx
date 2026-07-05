import { memo, useEffect, useRef, useState } from "react";
import { MarbleJar } from "@/components/MarbleJar";
import { Confetti } from "@/components/Confetti";
import { Gift, Sparkles } from "lucide-react";

/**
 * Marketing hero centrepiece: a MASSIVE marble jar that fills in a loop.
 * Point bubbles fly in from the left, "drop" into the jar, and become
 * marbles (driven by MarbleJar's physics). When the jar fills, a reward
 * celebration bursts, then the cycle resets.
 */

const TARGET = 24;
const TICK_MS = 700; // one point every 700ms => ~17s to fill
const CELEBRATE_MS = 3200;
const RESET_MS = 900;

type Bubble = { id: number; value: number; color: string; top: string };

const BUBBLE_COLORS = ["#EC4899", "#F59E0B", "#10B981", "#60A5FA", "#A78BFA"];

export const HeroJarScene = memo(function HeroJarScene() {
  const [value, setValue] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextId = useRef(1);

  // Point-drop loop
  useEffect(() => {
    if (celebrating) return;
    const t = window.setInterval(() => {
      const inc = 1 + Math.floor(Math.random() * 3); // +1..+3
      const id = nextId.current++;
      const color = BUBBLE_COLORS[id % BUBBLE_COLORS.length];
      const top = `${30 + Math.floor(Math.random() * 40)}%`;
      setBubbles((b) => [...b, { id, value: inc, color, top }]);
      // when the bubble reaches the jar (~1.4s), add points
      window.setTimeout(() => {
        setValue((v) => Math.min(TARGET, v + inc));
        setBubbles((b) => b.filter((x) => x.id !== id));
      }, 1400);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [celebrating]);

  // Celebration + reset
  const handleFull = () => {
    setCelebrating(true);
    window.setTimeout(() => {
      setValue(0);
      window.setTimeout(() => setCelebrating(false), RESET_MS);
    }, CELEBRATE_MS);
  };

  return (
    <div className="relative h-[560px] sm:h-[640px] lg:h-[720px] w-full">
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

      {/* Incoming point bubbles */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute left-[-8%]"
          style={{
            top: b.top,
            animation: "pp-fly-to-jar 1.4s cubic-bezier(0.4, 0, 0.6, 1) forwards",
          }}
        >
          <div
            className="rounded-2xl px-3 py-1 font-display text-base sm:text-lg font-extrabold text-white shadow-lg"
            style={{ background: b.color }}
          >
            +{b.value}
          </div>
        </div>
      ))}

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
            target={TARGET}
            size={typeof window !== "undefined" && window.innerWidth < 640 ? 300 : 460}
            onFull={handleFull}
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