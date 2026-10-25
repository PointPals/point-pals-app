import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import type { Chore, Kid, Skill } from "@/lib/mock-data";
import { COMPANIONS, PASTEL_HEX } from "@/lib/mock-data";
import { TINT_HEX } from "@/lib/companion-tints";
import { useSettings } from "@/lib/settings";
import { haptic, playChime, playClink, primeAudio } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { TileIcon } from "@/components/IconTile";

type AwardItem = { name: string; icon: string; points: number };
type Pick = AwardItem & { key: string };
type Stage = "pick" | "handback" | "review";

const HOLD_MS = 1200;

/**
 * "Hand the phone to your child" — kids pick what they did themselves, on
 * the parent's phone, then hand it back for a grown-up to approve.
 *
 *   pick     → their character says hi; giant picture tiles (chores + kind &
 *              brave only — never "needs work"); each tap pops a marble into
 *              a little jar at the bottom
 *   handback → "Pass the phone to a grown-up"
 *   review   → the grown-up removes anything that didn't happen, then holds
 *              to approve — the marbles drop on Home
 *
 * No backend change: approval calls the same batch award as the sheet.
 */
export function KidMode({
  kid,
  chores,
  positives,
  onApprove,
  onCancel,
}: {
  kid: Kid;
  chores: Chore[];
  positives: Skill[];
  onApprove: (items: AwardItem[]) => void;
  onCancel: () => void;
}) {
  const { reducedMotion } = useSettings();
  const [stage, setStage] = useState<Stage>("pick");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [hop, setHop] = useState(0);
  const companion = COMPANIONS.find((c) => c.id === kid.companionId);
  const wash = PASTEL_HEX[kid.color];
  const marble = TINT_HEX[kid.color];

  const options = [
    ...chores.map((c) => ({
      key: `c-${c.id}`,
      name: c.name,
      icon: c.icon,
      points: c.points,
      color: c.color,
    })),
    ...positives.map((s) => ({
      key: `s-${s.id}`,
      name: s.name,
      icon: s.icon,
      points: s.points,
      color: s.color,
    })),
  ];
  const picked = new Set(picks.map((p) => p.key));
  const total = picks.reduce((s, p) => s + p.points, 0);

  const toggle = (o: (typeof options)[number]) => {
    primeAudio();
    if (picked.has(o.key)) {
      setPicks((ps) => ps.filter((p) => p.key !== o.key));
      haptic("light");
      return;
    }
    setPicks((ps) => [...ps, { key: o.key, name: o.name, icon: o.icon, points: o.points }]);
    playChime("positive");
    window.setTimeout(() => playClink((Math.random() - 0.5) * 300), 260);
    haptic("success");
    setHop((h) => h + 1);
  };

  // Escape backs out one stage (or closes from the first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (stage === "pick") onCancel();
      else setStage(stage === "review" ? "handback" : "pick");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [stage, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${kid.name}'s turn to choose`}
      style={{
        background:
          stage === "handback"
            ? "var(--ink)"
            : `radial-gradient(120% 70% at 50% 0%, color-mix(in oklab, ${wash} 90%, white), color-mix(in oklab, ${wash} 30%, var(--cream)) 70%)`,
      }}
    >
      {stage === "pick" && (
        <>
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onCancel}
              className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/70 px-4 text-sm font-semibold text-ink shadow-clay-sm"
            >
              <X className="h-4 w-4" aria-hidden /> Grown-up
            </button>
            <span className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              {kid.name}’s turn
            </span>
          </div>

          <div className="flex items-center gap-4 px-5 pt-4">
            <div
              key={hop}
              className={cn(
                "relative h-24 w-24 shrink-0 overflow-hidden rounded-full shadow-clay sm:h-28 sm:w-28",
                !reducedMotion && (hop > 0 ? "pal-hop" : "kid-float"),
              )}
              style={{ backgroundColor: wash }}
            >
              <CompanionAvatar
                seed={kid.id}
                color={kid.color}
                size={112}
                companionId={kid.companionId}
              />
            </div>
            <div className="relative min-w-0 rounded-[1.5rem] rounded-bl-md bg-white px-4 py-3 shadow-clay">
              <p className="font-display text-[1.65rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-3xl">
                Hi {kid.name}! What did you do?
              </p>
              {companion && (
                <p className="mt-1 text-xs font-medium text-ink-soft">
                  {companion.name} is cheering you on
                </p>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">
            {options.length === 0 ? (
              <p className="mt-10 text-center text-lg font-semibold text-ink-soft">
                Ask a grown-up to add some things you can do!
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {options.map((o) => {
                  const on = picked.has(o.key);
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        onClick={() => toggle(o)}
                        aria-pressed={on}
                        className={cn(
                          "tap relative flex w-full flex-col items-center gap-2 rounded-[1.75rem] bg-white p-3 pb-3.5 text-center shadow-clay transition duration-200 ease-spring",
                          on ? "scale-[0.97] ring-4 ring-ink" : "hover:-translate-y-0.5",
                        )}
                      >
                        <span
                          className="grid aspect-square w-full place-items-center rounded-[1.35rem]"
                          style={{ backgroundColor: PASTEL_HEX[o.color] }}
                        >
                          <TileIcon icon={o.icon} className="h-[78%] w-[78%] text-6xl" />
                        </span>
                        <span className="text-base font-bold leading-tight text-ink">{o.name}</span>
                        {on && (
                          <span className="animate-pop-in absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full bg-jade text-ink shadow-clay-sm">
                            <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Mini jar + done */}
          <div className="border-t border-white/60 bg-white/70 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-14 min-w-0 flex-1 items-end gap-1 overflow-hidden rounded-2xl border-2 border-white bg-white/60 px-2 pb-1.5"
                aria-label={`${picks.length} picked`}
              >
                {picks.length === 0 ? (
                  <span className="mb-2.5 ml-1 text-sm font-semibold text-ink-soft">
                    Tap what you did ↑
                  </span>
                ) : (
                  picks.map((p) => (
                    <span
                      key={p.key}
                      className="marble animate-pop-in h-7 w-7 shrink-0"
                      style={{ "--marble": marble } as CSSProperties}
                      aria-hidden
                    />
                  ))
                )}
              </div>
              <button
                type="button"
                disabled={picks.length === 0}
                onClick={() => setStage("handback")}
                className="tap inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full bg-ink px-6 text-lg font-bold text-cream shadow-clay transition disabled:opacity-35"
              >
                I’m done! <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}

      {stage === "handback" && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-cream">
          <div
            className={cn(
              "h-36 w-36 overflow-hidden rounded-full shadow-lift",
              !reducedMotion && "kid-float",
            )}
            style={{ backgroundColor: wash }}
          >
            <CompanionAvatar
              seed={kid.id}
              color={kid.color}
              size={144}
              companionId={kid.companionId}
            />
          </div>
          <p className="mt-8 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em]">
            Great job, {kid.name}!
          </p>
          <p className="mt-3 max-w-xs text-lg text-cream/75">
            Now pass the phone to a grown-up so they can check.
          </p>
          <div
            aria-hidden
            className={cn(
              "mt-8 text-5xl",
              !reducedMotion && "animate-[kid-float_1.6s_ease-in-out_infinite]",
            )}
          >
            🤲
          </div>
          <button
            type="button"
            onClick={() => setStage("review")}
            className="tap mt-10 inline-flex min-h-14 items-center gap-2 rounded-full bg-cream px-7 text-base font-semibold text-ink shadow-lift"
          >
            I’m the grown-up <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setStage("pick")}
            className="mt-4 min-h-11 text-sm font-semibold text-cream/60 underline-offset-4 hover:text-cream hover:underline"
          >
            Oops — go back
          </button>
        </div>
      )}

      {stage === "review" && (
        <Review
          kid={kid}
          picks={picks}
          total={total}
          onRemove={(key) => setPicks((ps) => ps.filter((p) => p.key !== key))}
          onApprove={() =>
            onApprove(picks.map(({ name, icon, points }) => ({ name, icon, points })))
          }
          onDiscard={onCancel}
          onBack={() => setStage("pick")}
        />
      )}
    </div>
  );
}

function Review({
  kid,
  picks,
  total,
  onRemove,
  onApprove,
  onDiscard,
  onBack,
}: {
  kid: Kid;
  picks: Pick[];
  total: number;
  onRemove: (key: string) => void;
  onApprove: () => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Grown-up check
        </p>
        <h2 className="mt-1.5 font-display text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
          {kid.name} says they…
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Remove anything that didn’t happen, then hold the button to approve.
        </p>
      </div>
      <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-4 pt-5">
        {picks.length === 0 && (
          <li className="rounded-2xl bg-white/70 p-5 text-center text-sm text-ink-soft">
            Nothing left to approve.{" "}
            <button
              onClick={onBack}
              className="font-semibold text-ink underline underline-offset-4"
            >
              Let {kid.name} choose again
            </button>
          </li>
        )}
        {picks.map((p) => (
          <li
            key={p.key}
            className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-clay-sm"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
              <TileIcon icon={p.icon} className="h-8 w-8 text-2xl" />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.name}</span>
            <span className="font-display text-lg font-semibold text-ink">+{p.points}</span>
            <button
              type="button"
              onClick={() => onRemove(p.key)}
              aria-label={`Remove ${p.name}`}
              className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/60 bg-white/75 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <HoldToApprove
          disabled={picks.length === 0}
          label={`Hold to give ${kid.name} +${total}`}
          onDone={onApprove}
        />
        <button
          type="button"
          onClick={onDiscard}
          className="mt-2 min-h-11 w-full text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Not now — discard
        </button>
      </div>
    </div>
  );
}

/**
 * Press-and-hold (pointer or Space/Enter held) for ~1.2 s. A deliberate
 * gesture: it says "a grown-up checked this" without needing a PIN.
 */
function HoldToApprove({
  label,
  disabled,
  onDone,
}: {
  label: string;
  disabled?: boolean;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);
  const started = useRef<number | null>(null);
  const done = useRef(false);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    started.current = null;
    if (!done.current) setProgress(0);
  };
  const start = () => {
    if (disabled || done.current || started.current !== null) return;
    primeAudio();
    started.current = performance.now();
    haptic("light");
    const tick = (now: number) => {
      if (started.current === null) return;
      const p = Math.min(1, (now - started.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        haptic("success");
        onDone();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} (press and hold)`}
      className="relative flex min-h-16 w-full select-none items-center justify-center overflow-hidden rounded-full bg-ink px-6 text-lg font-bold text-cream shadow-clay transition disabled:opacity-35 [-webkit-touch-callout:none]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-jade"
        style={{ width: `${progress * 100}%`, transition: progress === 0 ? "width 200ms" : "none" }}
      />
      <span className={cn("relative", progress > 0.5 && "text-ink")}>
        {progress > 0 && progress < 1 ? "Keep holding…" : label}
      </span>
    </button>
  );
}
