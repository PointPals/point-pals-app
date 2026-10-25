import { Link } from "@tanstack/react-router";
import { ArrowRight, Pointer, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { playFanfare } from "@/lib/feedback";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { GlassJar, JAR_MOUTH, jarSlots } from "./GlassJar";
import { PAL_BY_ID, toneIndex } from "./palette";
import { Eyebrow, PrimaryCta, TappablePal, secondaryCtaClass } from "./ui";

const CAP = 60;
const START = 30;
const SEED = 11;

type HeroPal = {
  id: keyof typeof PAL_BY_ID;
  /** Position + size inside the stage, in % of the stage box. */
  style: CSSProperties;
  layer: "back" | "front";
  depth: number;
  bob: number;
  bubble: string;
  side?: "top" | "left" | "right";
};

const HERO_PALS: HeroPal[] = [
  {
    id: "lumi",
    style: { left: "9%", bottom: "38%", width: "28%" },
    layer: "back",
    depth: 0.5,
    bob: 5.2,
    bubble: "Kindness!",
  },
  {
    id: "ember",
    style: { right: "9%", bottom: "42%", width: "23%" },
    layer: "back",
    depth: 0.6,
    bob: 4.6,
    bubble: "Be brave!",
  },
  {
    id: "orbit",
    style: { right: "12%", top: "2%", width: "18%" },
    layer: "back",
    depth: 1.2,
    bob: 3.8,
    bubble: "Why? How?",
  },
  {
    id: "tumble",
    style: { left: "-1%", bottom: "4%", width: "31%" },
    layer: "front",
    depth: -0.3,
    bob: 6,
    bubble: "Together!",
  },
  {
    id: "moss",
    style: { left: "27%", bottom: "-1%", width: "19%" },
    layer: "front",
    depth: -0.5,
    bob: 4.2,
    bubble: "Little steps!",
  },
  {
    id: "ripple",
    style: { right: "-2%", bottom: "3%", width: "29%" },
    layer: "front",
    depth: -0.2,
    bob: 5.6,
    bubble: "Breathe…",
  },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const jarRef = useRef<SVGSVGElement>(null);
  const [count, setCount] = useState(START);
  const [tones, setTones] = useState<(number | undefined)[]>([]);
  const [phase, setPhase] = useState<"filling" | "full" | "emptying">("filling");
  const dropped = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // A freshly tapped marble falls from the mouth into its slot.
  useEffect(() => {
    const i = dropped.current;
    if (i == null) return;
    dropped.current = null;
    const el = jarRef.current?.querySelector(`.jar-marble[data-i="${i}"]`);
    if (!el || prefersReducedMotion()) return;
    const s = jarSlots(CAP, SEED)[i];
    gsap.fromTo(el, { x: JAR_MOUTH.x - s.x }, { x: 0, duration: 0.75, ease: "power2.out" });
    gsap.fromTo(
      el,
      { y: JAR_MOUTH.y - s.y - s.r * 2 },
      { y: 0, duration: 0.95, ease: "bounce.out" },
    );
  }, [count]);

  const drop = (palId: string) => {
    if (phase !== "filling") return;
    const i = count;
    dropped.current = i;
    setTones((t) => {
      const next = [...t];
      next[i] = toneIndex(palId);
      return next;
    });
    setCount(i + 1);
    if (i + 1 >= CAP) {
      setPhase("full");
      playFanfare();
      timers.current.push(
        window.setTimeout(() => {
          setPhase("emptying");
          setCount(0);
        }, 2600),
        window.setTimeout(() => {
          setTones([]);
          setPhase("filling");
        }, 3400),
      );
    }
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(root);
        const slots = jarSlots(CAP, SEED);
        const marbles = q(".lp-hero-jar .jar-marble").slice(0, START);
        const tl = gsap.timeline({ delay: 0.1 });
        tl.from(q(".lp-hero-eyebrow"), { y: 18, opacity: 0, duration: 1 }, 0)
          .from(
            q(".lp-hero-fade"),
            { y: 26, opacity: 0, duration: 1.2, stagger: 0.09, ease: "expo.out" },
            0.55,
          )
          .from(q(".lp-hero-glow"), { opacity: 0, scale: 0.6, duration: 2.4 }, 0.1)
          .from(q(".lp-hero-jarwrap"), { y: 40, opacity: 0, duration: 1.6 }, 0.2)
          .from(q(".lp-hero-plinth"), { scaleX: 0.6, opacity: 0, duration: 1.6 }, 0.2)
          .from(
            marbles,
            {
              x: (i) => JAR_MOUTH.x - slots[i].x,
              duration: 0.8,
              ease: "power2.out",
              stagger: 0.035,
            },
            0.7,
          )
          .from(
            marbles,
            {
              y: (i) => JAR_MOUTH.y - slots[i].y - slots[i].r * 2,
              duration: 1,
              ease: "bounce.out",
              stagger: 0.035,
            },
            0.7,
          )
          .from(
            q(".lp-hero-pop"),
            {
              yPercent: 45,
              scale: 0.4,
              opacity: 0,
              duration: 1.3,
              ease: "back.out(1.7)",
              stagger: 0.1,
            },
            1.0,
          )
          .from(q(".lp-hero-chip"), { y: 12, opacity: 0, duration: 0.9, stagger: 0.12 }, 1.7);

        // Depth on the way out: layers drift at different speeds.
        const out = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
        out
          .to(q(".lp-hero-copy"), { y: -90, ease: "none" }, 0)
          .to(q(".lp-hero-stagewrap"), { y: 70, ease: "none" }, 0)
          .to(
            q(".lp-hero-orb"),
            { y: (i, el) => Number(el.dataset.depth) * -160, ease: "none" },
            0,
          );
        q(".lp-hero-depth").forEach((el) => {
          out.to(el, { yPercent: Number(el.dataset.depth) * -40, ease: "none" }, 0);
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const marblesShown = Math.min(count, CAP);

  return (
    <section
      ref={root}
      aria-labelledby="lp-hero-title"
      className="lp-hero relative isolate overflow-x-clip pb-14 pt-20 sm:pt-28 lg:min-h-[100svh] lg:pb-20 lg:pt-32"
    >
      {/* out-of-focus marbles for depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span
          className="lp-hero-orb marble lp-orb absolute -right-24 top-24 h-64 w-64 opacity-30 sm:h-96 sm:w-96"
          data-depth="0.6"
          style={{ "--marble": "var(--marble-plum)" } as CSSProperties}
        />
        <span
          className="lp-hero-orb marble lp-orb absolute -left-16 top-[58%] h-40 w-40 opacity-35 sm:h-56 sm:w-56"
          data-depth="1"
          style={{ "--marble": "var(--marble-saffron)" } as CSSProperties}
        />
      </div>

      <div className="mx-auto grid max-w-[88rem] items-center gap-6 px-4 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-4 xl:px-12">
        <div className="lp-hero-copy relative z-10 lg:self-end">
          <Eyebrow className="lp-hero-eyebrow" marble="var(--marble-plum)">
            The family marble jar
          </Eyebrow>
          <SplitReveal
            as="h1"
            immediate
            delay={0.15}
            className="lp-display-xl mt-5 text-ink sm:mt-6"
          >
            <span id="lp-hero-title">
              Every good thing drops a <span className="lp-jewel-text">marble</span>
              <span aria-hidden className="lp-hero-dot marble" />
              <span className="sr-only">.</span>
            </span>
          </SplitReveal>
        </div>

        {/* Stage: glowing jar + the Pals. Order 2 on mobile, sits beside copy on desktop. */}
        <div className="lp-hero-stagewrap relative mx-auto w-full max-w-[34rem] lg:row-span-2 lg:max-w-none">
          <HeroStage
            jarRef={jarRef}
            count={marblesShown}
            tones={tones}
            phase={phase}
            onDrop={drop}
          />
        </div>

        <div className="relative z-10 lg:-mt-2 lg:self-start">
          <p className="lp-hero-fade max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            PointPals is the family chore chart that notices the good. Every chore, kind act and
            brave try drops a marble in your family&rsquo;s jar &mdash; fill it together, then
            celebrate together.
          </p>
          <div className="lp-hero-fade mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryCta className="w-full sm:w-auto" />
            <Link to="/sign-in" className={cn(secondaryCtaClass, "w-full sm:w-auto")}>
              Log in
            </Link>
          </div>
          <Link
            to="/join"
            className="lp-hero-fade group mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Got an invite? Join a family
            <ArrowRight
              aria-hidden
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <ul className="lp-hero-fade mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-soft">
            {[
              ["Free for every family", "var(--marble-jade)"],
              ["Research-backed", "var(--marble-cobalt)"],
              ["Made in NZ", "var(--marble-coral)"],
            ].map(([t, c]) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="marble h-2.5 w-2.5"
                  style={{ "--marble": c } as CSSProperties}
                />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HeroStage({
  jarRef,
  count,
  tones,
  phase,
  onDrop,
}: {
  jarRef: React.RefObject<SVGSVGElement | null>;
  count: number;
  tones: (number | undefined)[];
  phase: "filling" | "full" | "emptying";
  onDrop: (id: string) => void;
}) {
  const renderPal = (p: HeroPal) => (
    <div
      key={p.id}
      className="lp-hero-depth absolute"
      data-depth={p.depth}
      style={{ ...p.style, zIndex: p.layer === "back" ? 1 : 20 }}
    >
      <div className="lp-hero-pop">
        <div
          className="lp-bob"
          style={{ animationDuration: `${p.bob}s`, animationDelay: `${-p.bob * 0.37}s` }}
        >
          <TappablePal
            id={p.id}
            label={`Tap ${PAL_BY_ID[p.id].name} to drop a marble in the jar`}
            bubble={p.bubble}
            bubbleSide={p.side}
            onTap={() => onDrop(p.id)}
            sound
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative aspect-[1/0.86] w-full select-none sm:aspect-square">
      <div aria-hidden className="lp-hero-glow lp-glow absolute -inset-[8%] -z-10" />

      {HERO_PALS.filter((p) => p.layer === "back").map(renderPal)}

      <div
        aria-hidden
        className="lp-hero-plinth lp-plinth absolute bottom-[7%] left-[17%] h-[10%] w-[66%]"
      />
      <div className="lp-hero-jarwrap pointer-events-none absolute bottom-[10.5%] left-[25.5%] z-10 w-[49%]">
        <div
          className={cn(
            "transition-transform duration-700 ease-spring",
            phase === "full" && "scale-[1.04]",
          )}
        >
          <GlassJar
            ref={jarRef}
            capacity={CAP}
            filled={count}
            tones={tones}
            seed={SEED}
            fadeMarbles={phase === "emptying"}
            className={cn("lp-hero-jar", phase === "full" && "lp-jar-glow")}
            title={`A glass jar holding ${count} of ${CAP} marbles`}
          />
        </div>
        {/* paper tag tied to the neck */}
        <div
          aria-live="polite"
          className="lp-hero-chip absolute left-[66%] top-[1%] z-20 origin-left rotate-[8deg]"
        >
          <span
            aria-hidden
            className="absolute right-full top-1/2 h-px w-[1.4rem] origin-right rotate-[18deg] bg-ink/30"
          />
          <span className="relative flex items-center gap-1.5 whitespace-nowrap rounded-[0.6rem] bg-card px-2.5 py-1.5 text-[0.7rem] font-semibold text-ink shadow-clay-sm sm:text-xs">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink/25" />
            {phase === "full" ? (
              <span className="flex items-center gap-1">
                <Sparkles aria-hidden className="h-3 w-3 text-saffron" /> Jar full!
              </span>
            ) : (
              <span className="tabular-nums">
                {count} / {CAP}
                <span className="sr-only"> marbles in the jar</span>
              </span>
            )}
          </span>
        </div>
      </div>

      {HERO_PALS.filter((p) => p.layer === "front").map(renderPal)}

      <p
        aria-hidden
        className="lp-hero-chip absolute inset-x-0 bottom-[-5%] z-30 mx-auto flex w-max items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink-soft sm:text-sm"
      >
        <Pointer className="h-3.5 w-3.5" /> Psst &mdash; tap a Pal
      </p>
    </div>
  );
}
