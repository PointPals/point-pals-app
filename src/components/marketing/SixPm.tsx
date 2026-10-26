import { useRef, type CSSProperties } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { MARBLE_TONES } from "./palette";
import { Eyebrow } from "./ui";

type Nag = {
  t: string;
  /** Pile position (centre) in % of the stage. */
  x: number;
  y: number;
  r: number;
  size: "sm" | "md" | "lg" | "xl";
  tone?: "dim" | "saffron" | "coral" | "rose";
};

// Order = the order they land. The pile builds from the floor up and the
// loudest ones arrive last.
const NAGS: Nag[] = [
  { t: "Shoes on.", x: 18, y: 88, r: -7, size: "md" },
  { t: "Where's your bag?", x: 70, y: 90, r: 4, size: "sm", tone: "dim" },
  { t: "Teeth!", x: 44, y: 84, r: -3, size: "lg", tone: "saffron" },
  { t: "Five more minutes.", x: 84, y: 79, r: -6, size: "sm" },
  { t: "Dinner!", x: 62, y: 75, r: 6, size: "md", tone: "rose" },
  { t: "Not on the couch.", x: 22, y: 75, r: 5, size: "sm", tone: "dim" },
  { t: "Bath. Now.", x: 36, y: 67, r: -9, size: "md" },
  { t: "Who left this here?", x: 76, y: 64, r: 3, size: "sm" },
  { t: "Stop poking him.", x: 12, y: 60, r: -4, size: "sm", tone: "dim" },
  { t: "Pyjamas!", x: 84, y: 49, r: 9, size: "md", tone: "saffron" },
  { t: "How many times…", x: 54, y: 56, r: 4, size: "md" },
  { t: "Please…", x: 24, y: 47, r: -5, size: "lg" },
  { t: "I'm counting to three.", x: 70, y: 42, r: -3, size: "sm", tone: "dim" },
  { t: "Lights out!", x: 86, y: 58, r: 7, size: "sm" },
  { t: "PLEASE.", x: 50, y: 42, r: -4, size: "xl", tone: "coral" },
];

const SIZE: Record<Nag["size"], string> = {
  sm: "text-[clamp(1rem,1.95vw,1.9rem)]",
  md: "text-[clamp(1.35rem,3vw,3rem)]",
  lg: "text-[clamp(1.8rem,4.5vw,4.5rem)]",
  xl: "text-[clamp(3rem,9.6vw,9.75rem)] font-bold",
};

const TONE: Record<NonNullable<Nag["tone"]>, string> = {
  dim: "text-ink/40",
  saffron: "text-[oklch(0.68_0.16_62)]",
  coral: "text-coral",
  rose: "text-rose",
};

/**
 * Chapter 01 — the 6pm problem. A night-ink scene: nagging piles up as you
 * scroll (the clock creeps on, the room warms with tension), then every nag
 * dissolves into a marble, the marbles line up calmly, and the question lands.
 */
export function SixPm() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ motion: MOTION_OK, small: "(max-width: 767px)" }, (ctx) => {
        const { motion, small } = ctx.conditions as { motion: boolean; small: boolean };
        if (!motion) return;
        el.dataset.motion = "on";
        const q = gsap.utils.selector(el);
        const stage = q(".lp-six-stage")[0] as HTMLElement;
        const wraps = q(".lp-nag") as HTMLElement[];
        const inners = q(".lp-nag-in");
        const dots = q(".lp-nag-dot");
        const clockEl = q(".lp-six-clock-t")[0] as HTMLElement;
        const split = SplitText.create(q(".lp-six-q")[0], { type: "words,lines", mask: "lines" });

        // Where each marble settles: a calm row under the question.
        const rowGap = small ? 17 : 28;
        const target = (i: number, wrap: HTMLElement) => {
          const s = stage.getBoundingClientRect();
          const w = wrap.getBoundingClientRect();
          const cx = w.left + w.width / 2 - s.left;
          const cy = w.top + w.height / 2 - s.top;
          const tx = s.width / 2 + (i - (wraps.length - 1) / 2) * rowGap;
          const ty = s.height * (small ? 0.74 : 0.76);
          return { x: tx - cx, y: ty - cy };
        };

        const clock = { m: 0 };
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: small ? "+=170%" : "+=230%",
            pin: stage,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(
          clock,
          {
            m: 27,
            duration: 6.2,
            onUpdate: () => {
              const m = 52 + Math.round(clock.m);
              const h = m >= 60 ? 6 : 5;
              clockEl.textContent = `${h}:${String(m % 60).padStart(2, "0")}`;
            },
          },
          0,
        )
          .from(
            inners,
            {
              y: () => -window.innerHeight * 1.05,
              rotation: (i) => (i % 2 ? 40 : -35),
              duration: 1.1,
              ease: "bounce.out",
              stagger: 0.36,
            },
            0.2,
          )
          .to(q(".lp-six-heat"), { opacity: 1, duration: 5 }, 0.6)
          .to(q(".lp-six-pile"), { keyframes: { x: [0, -7, 6, -5, 4, -2, 0] }, duration: 0.8 }, 5.4)
          .addLabel("dissolve", 6.4)
          .to(q(".lp-six-head"), { opacity: 0, y: -30, duration: 0.8 }, "dissolve")
          .to(q(".lp-six-clock"), { opacity: 0, duration: 0.8 }, "dissolve")
          .to(
            inners,
            { opacity: 0, scale: 0.3, duration: 0.7, stagger: { each: 0.04, from: "random" } },
            "dissolve",
          )
          .fromTo(
            dots,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.5,
              ease: "back.out(2)",
              stagger: { each: 0.04, from: "random" },
            },
            "dissolve+=0.25",
          )
          .to(q(".lp-six-heat"), { opacity: 0, duration: 1.2 }, "dissolve")
          .to(q(".lp-six-calm"), { opacity: 1, duration: 1.4 }, "dissolve+=0.3")
          .to(
            dots,
            {
              x: (i, d) => target(i, d.parentElement as HTMLElement).x,
              y: (i, d) => target(i, d.parentElement as HTMLElement).y,
              duration: 1.3,
              ease: "power3.inOut",
              stagger: 0.03,
            },
            "dissolve+=1",
          )
          .addLabel("calm", "dissolve+=1.6")
          .from(
            split.words,
            { yPercent: 115, duration: 0.8, ease: "power3.out", stagger: 0.06 },
            "calm",
          )
          .from(q(".lp-six-body"), { opacity: 0, y: 24, duration: 0.8 }, "calm+=0.6")
          .to({}, { duration: 0.8 });

        return () => {
          split.revert();
          delete el.dataset.motion;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="problem"
      aria-labelledby="lp-six-title"
      className="lp-six relative text-ink"
    >
      <div className="lp-six-stage relative overflow-hidden">
        <div aria-hidden className="lp-six-heat pointer-events-none absolute inset-0" />
        <div aria-hidden className="lp-six-calm pointer-events-none absolute inset-0" />
        <div aria-hidden className="lp-six-stars pointer-events-none absolute inset-0" />

        <div
          aria-hidden
          className="lp-six-clock pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center"
        >
          <span className="lp-six-clock-t font-display tabular-nums">5:52</span>
          <span className="ml-[0.06em] font-display text-[0.3em] tracking-normal">pm</span>
        </div>

        <div className="lp-six-head relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-8">
          <Eyebrow n="01" tone="ink" marble="var(--marble-coral)" className="justify-center">
            The 6pm problem
          </Eyebrow>
          <p className="lp-display-m mt-5 font-display text-ink">Every family knows this hour.</p>
          <p className="sr-only">
            Shoes on. Teeth! Please. Bath, now. Please! The reminders pile up, every single night.
          </p>
        </div>

        <div aria-hidden className="lp-six-pile relative z-10">
          <ul className="lp-six-cloud mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 sm:px-8">
            {NAGS.map((n, i) => (
              <li
                key={n.t}
                className="lp-nag inline-block"
                style={{ "--x": n.x, "--y": n.y } as CSSProperties}
              >
                <span
                  className={cn(
                    "lp-nag-in inline-block whitespace-nowrap font-display leading-none tracking-[-0.03em]",
                    SIZE[n.size],
                    n.tone ? TONE[n.tone] : "text-ink",
                  )}
                  style={{ rotate: `${n.r}deg` }}
                >
                  {n.t}
                </span>
                <span
                  className="lp-nag-dot marble absolute left-1/2 top-1/2"
                  style={
                    {
                      "--marble": MARBLE_TONES[i % MARBLE_TONES.length].base,
                    } as CSSProperties
                  }
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-six-calmtext relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-8">
          <h2 id="lp-six-title" className="lp-six-q lp-display-l text-ink">
            What if noticing the good did the work?
          </h2>
          <p className="lp-six-body mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Most evenings run on reminders. PointPals flips it &mdash; notice what&rsquo;s going
            right, tap once, and watch it happen more often.
          </p>
        </div>
      </div>
    </section>
  );
}
