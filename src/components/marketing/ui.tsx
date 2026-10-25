import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pal } from "@/components/pals/Pal";
import { playChime, primeAudio } from "@/lib/feedback";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import type { PalMood } from "@/lib/pals";
import { cn } from "@/lib/utils";

/* ───────────────────────── Eyebrow ───────────────────────── */

export function Eyebrow({
  n,
  children,
  tone = "ink",
  marble = "var(--marble-saffron)",
  className,
}: {
  n?: string;
  children: ReactNode;
  tone?: "ink" | "cream";
  marble?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.24em] sm:text-xs",
        tone === "cream" ? "text-cream/75" : "text-ink-soft",
        className,
      )}
    >
      <span
        aria-hidden
        className="marble inline-block h-2.5 w-2.5 shrink-0"
        style={{ "--marble": marble } as CSSProperties}
      />
      {n && (
        <>
          <span className="tabular-nums">{n}</span>
          <span aria-hidden className="h-px w-6 bg-current opacity-40" />
        </>
      )}
      <span>{children}</span>
    </p>
  );
}

/* ───────────────────────── Magnetic hover ───────────────────────── */

/** Desktop-only magnetic pull toward the cursor. Inert on touch / reduced motion. */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
        let box: DOMRect | null = null;
        const enter = () => {
          gsap.set(el, { x: 0, y: 0 });
          box = el.getBoundingClientRect();
        };
        const move = (e: PointerEvent) => {
          if (!box) box = el.getBoundingClientRect();
          xTo((e.clientX - (box.left + box.width / 2)) * strength);
          yTo((e.clientY - (box.top + box.height / 2)) * strength);
        };
        const leave = () => {
          box = null;
          xTo(0);
          yTo(0);
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <span ref={ref} className={cn("inline-flex will-change-transform", className)}>
      {children}
    </span>
  );
}

/* ───────────────────────── CTAs ───────────────────────── */

export function PrimaryCta({
  children = "Start your family jar",
  tone = "ink",
  className,
}: {
  children?: ReactNode;
  tone?: "ink" | "cream";
  className?: string;
}) {
  return (
    <Magnetic>
      <Link
        to="/sign-up"
        className={cn(
          "lp-cta group tap relative inline-flex min-h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full px-7 text-base font-semibold transition-shadow duration-500 ease-out-expo sm:min-h-[3.75rem] sm:px-8 sm:text-[1.05rem]",
          tone === "ink"
            ? "bg-ink text-cream shadow-[0_18px_40px_-16px_oklch(0.235_0.045_300/0.7)] hover:shadow-[0_26px_50px_-18px_oklch(0.235_0.045_300/0.75)]"
            : "bg-cream text-ink shadow-[0_18px_40px_-16px_oklch(0_0_0/0.6)]",
          className,
        )}
      >
        <span
          aria-hidden
          className="marble h-3.5 w-3.5 shrink-0 transition-transform duration-500 ease-spring group-hover:scale-125"
          style={{ "--marble": "var(--marble-saffron)" } as CSSProperties}
        />
        <span>{children}</span>
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1"
        />
      </Link>
    </Magnetic>
  );
}

export const secondaryCtaClass =
  "tap inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-ink/12 bg-card/70 px-6 text-base font-semibold text-ink shadow-clay-sm backdrop-blur transition-colors hover:bg-card sm:min-h-[3.75rem]";

/* ───────────────────────── Tappable Pal ───────────────────────── */

/**
 * A Pal you can poke. Tap → squash-hop, happy face, soft chime and an
 * optional speech bubble. Hover (desktop) → happy face.
 */
export function TappablePal({
  id,
  label,
  className,
  bubble,
  onTap,
  sound = true,
  restMood = "idle",
  bubbleSide = "top",
  shadow = true,
}: {
  id: string;
  label: string;
  className?: string;
  bubble?: string;
  onTap?: () => void;
  sound?: boolean;
  restMood?: PalMood;
  bubbleSide?: "top" | "left" | "right";
  shadow?: boolean;
}) {
  const [happy, setHappy] = useState(false);
  const [talking, setTalking] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hop = () => {
    const el = wrap.current;
    if (!el) return;
    el.classList.remove("pal-hop");
    void el.offsetWidth;
    el.classList.add("pal-hop");
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        primeAudio();
        if (sound) playChime("positive");
        hop();
        setHappy(true);
        setTalking(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          setHappy(false);
          setTalking(false);
        }, 1600);
        onTap?.();
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHappy(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && !talking) setHappy(false);
      }}
      className={cn(
        "lp-pal-btn group relative block cursor-pointer touch-manipulation rounded-[40%] outline-none",
        className,
      )}
    >
      <span
        ref={wrap}
        className="block transition-transform duration-500 ease-spring group-hover:-translate-y-[3%] group-hover:rotate-[-2deg]"
        onAnimationEnd={(e) => {
          if (e.animationName === "pal-hop") wrap.current?.classList.remove("pal-hop");
        }}
      >
        <Pal id={id} size="100%" mood={happy ? "happy" : restMood} animate shadow={shadow} />
      </span>
      {bubble && (
        <span
          aria-hidden
          className={cn(
            "lp-bubble pointer-events-none absolute z-10 whitespace-nowrap rounded-full bg-card px-3 py-1.5 font-display text-sm font-semibold text-ink shadow-clay-sm",
            bubbleSide === "top" && "bottom-[92%] left-1/2 [--bx:-50%]",
            bubbleSide === "left" && "right-[78%] top-[8%]",
            bubbleSide === "right" && "left-[78%] top-[8%]",
            talking ? "lp-bubble-on" : "",
          )}
        >
          {bubble}
        </span>
      )}
    </button>
  );
}
