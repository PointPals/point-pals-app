import { Check, Popcorn } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Reveal } from "@/components/motion/Reveal";
import { Pal } from "@/components/pals/Pal";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { GlassJar, JAR_MOUTH, jarSlots } from "./GlassJar";
import { MARBLE_TONES, PAL_BY_ID, seeded } from "./palette";
import { Eyebrow } from "./ui";

const CAP = 100;
const FROM = 74;
const SEED = 23;

const IDEAS = [
  "Beach picnic",
  "Movie night + popcorn",
  "Pancake Saturday",
  "Camp-out in the lounge",
  "Choose Friday dinner",
  "Bike to the playground",
];

// Deterministic burst so server and client agree.
const BURST = (() => {
  const r = seeded(5);
  return Array.from({ length: 26 }, (_, i) => {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
    const d = 0.55 + r() * 0.55;
    return {
      dx: Math.cos(a) * d,
      up: 0.18 + r() * 0.3,
      fall: 0.35 + r() * 0.35,
      size: 10 + Math.round(r() * 14),
      tone: MARBLE_TONES[i % MARBLE_TONES.length].base,
      ribbon: i % 3 === 2,
      spin: (r() - 0.5) * 720,
    };
  });
})();

/**
 * Chapter 05 — the payoff. The jar pours its last marbles in, bursts, and the
 * reward the family chose together pops up. Then the brand belief: rewards
 * are scaffolding — the goal is graduation, not dependence.
 */
export function Celebrate() {
  const root = useRef<HTMLElement>(null);
  const [party, setParty] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        el.dataset.motion = "on";
        const q = gsap.utils.selector(el);
        const slots = jarSlots(CAP, SEED);
        const last = q(".lp-cel-jar .jar-marble").slice(FROM, CAP);
        const scene = q(".lp-cel-scene")[0] as HTMLElement;
        const dots = q(".lp-cel-bit");

        gsap.set(last, {
          x: (i) => JAR_MOUTH.x - slots[FROM + i].x,
          y: (i) => JAR_MOUTH.y - slots[FROM + i].y - slots[FROM + i].r * 2,
        });
        gsap.set(q(".lp-cel-card"), { opacity: 0, y: 50, scale: 0.86, rotate: -4 });
        gsap.set(dots, { opacity: 0 });

        const tl = gsap.timeline({
          paused: true,
          onComplete: () => setParty(true),
        });
        tl.to(last, { x: 0, duration: 0.5, ease: "power1.out", stagger: 0.035 }, 0)
          .to(last, { y: 0, duration: 0.65, ease: "bounce.out", stagger: 0.035 }, 0)
          .add(() => setParty(true), 1.1)
          .fromTo(
            q(".lp-cel-flare"),
            { opacity: 0, scale: 0.6 },
            { opacity: 1, scale: 1.15, duration: 0.5, ease: "power2.out" },
            1.1,
          )
          .to(q(".lp-cel-flare"), { opacity: 0.55, scale: 1, duration: 1.4 }, 1.6);

        dots.forEach((d, i) => {
          const b = BURST[i];
          const w = () => scene.offsetWidth;
          tl.set(d, { opacity: 1, x: 0, y: 0, rotate: 0 }, 1.15)
            .to(d, { x: () => b.dx * w() * 0.62, duration: 1.7, ease: "power1.out" }, 1.15)
            .to(d, { y: () => -b.up * w(), duration: 0.6, ease: "power2.out" }, 1.15)
            .to(d, { y: () => b.fall * w(), duration: 1.1, ease: "power2.in" }, 1.75)
            .to(d, { rotate: b.spin, duration: 1.7, ease: "none" }, 1.15)
            .to(d, { opacity: 0, duration: 0.4 }, 2.45);
        });
        tl.to(
          q(".lp-cel-card"),
          { opacity: 1, y: 0, scale: 1, rotate: -2, duration: 1, ease: "elastic.out(1, 0.7)" },
          1.4,
        );

        const st = ScrollTrigger.create({
          trigger: scene,
          start: "top 62%",
          once: true,
          onEnter: () => tl.play(),
        });
        return () => {
          st.kill();
          tl.kill();
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
      id="celebrate"
      aria-labelledby="lp-cel-title"
      className="lp-cel relative isolate overflow-hidden py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-4 sm:px-8 xl:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          <div className="relative z-10">
            <Eyebrow n="05" marble="var(--marble-saffron)">
              Celebrate together
            </Eyebrow>
            <SplitReveal as="h2" className="lp-display-l mt-5 max-w-[12ch] text-ink">
              <span id="lp-cel-title">Jar full? Celebrate together.</span>
            </SplitReveal>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft sm:text-xl">
              When the jar fills, the whole family celebrates with a reward you chose together.
              Everyone helped fill it, so everyone gets to enjoy it.
            </p>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Rewards families choose
            </p>
            <Reveal as="ul" y={14} stagger={0.05} className="mt-3 flex max-w-lg flex-wrap gap-2">
              {IDEAS.map((idea, i) => (
                <li
                  key={idea}
                  className="lp-cel-idea flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-2 text-sm font-semibold text-ink shadow-clay-sm"
                >
                  <span
                    aria-hidden
                    className="marble h-2.5 w-2.5"
                    style={
                      { "--marble": MARBLE_TONES[i % MARBLE_TONES.length].base } as CSSProperties
                    }
                  />
                  {idea}
                </li>
              ))}
            </Reveal>
          </div>

          <div className="lp-cel-scene relative mx-auto aspect-square w-full max-w-[40rem]">
            <div aria-hidden className="lp-cel-flare absolute -inset-[6%] -z-10 rounded-full" />
            <div
              aria-hidden
              className="lp-plinth absolute bottom-[6%] left-[16%] h-[10%] w-[68%]"
            />

            <div className="absolute bottom-[9.5%] left-[27%] w-[46%]">
              <GlassJar
                capacity={CAP}
                filled={CAP}
                seed={SEED}
                className={cn("lp-cel-jar", party && "lp-jar-glow")}
                title="The family jar, full to the top"
              />
              <div aria-hidden className="lp-cel-burst absolute left-1/2 top-[5%]">
                {BURST.map((b, i) => (
                  <span
                    key={i}
                    className={cn("lp-cel-bit absolute", b.ribbon ? "rounded-[3px]" : "marble")}
                    style={
                      {
                        "--marble": b.tone,
                        width: b.ribbon ? 8 : b.size,
                        height: b.ribbon ? 16 : b.size,
                        marginLeft: b.ribbon ? -4 : -b.size / 2,
                        marginTop: b.ribbon ? -8 : -b.size / 2,
                        background: b.ribbon ? b.tone : undefined,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>

            <div aria-hidden className="absolute bottom-[5%] left-[1%] w-[27%]">
              <div className={cn(party && "lp-cel-jump")} style={{ animationDelay: "0ms" }}>
                <Pal id="tumble" size="100%" mood={party ? "happy" : "idle"} animate />
              </div>
            </div>
            <div aria-hidden className="absolute bottom-[38%] left-[6%] w-[19%]">
              <div className={cn(party && "lp-cel-jump")} style={{ animationDelay: "160ms" }}>
                <Pal id="ember" size="100%" mood={party ? "wow" : "idle"} animate />
              </div>
            </div>
            <div aria-hidden className="absolute bottom-[4%] right-[2%] w-[22%]">
              <div className={cn(party && "lp-cel-jump")} style={{ animationDelay: "320ms" }}>
                <Pal id="moss" size="100%" mood={party ? "happy" : "idle"} animate />
              </div>
            </div>

            <div className="lp-cel-card absolute right-[-1%] top-[10%] z-20 w-[min(17.5rem,56%)] rotate-[-2deg] rounded-[1.75rem] bg-card p-4 shadow-lift sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-saffron text-ink shadow-clay-sm">
                  <Popcorn aria-hidden className="h-5 w-5" />
                </span>
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                  Jar full!
                </span>
              </div>
              <p className="mt-3 font-display text-[1.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[1.8rem]">
                Movie night + popcorn
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="flex -space-x-2">
                  {(["lumi", "orbit", "moss"] as const).map((id) => (
                    <span
                      key={id}
                      className="grid h-7 w-7 place-items-center rounded-full ring-2 ring-card"
                      style={{ background: PAL_BY_ID[id].tint }}
                    >
                      <Pal id={id} size="82%" shadow={false} />
                    </span>
                  ))}
                </span>
                <span className="text-xs text-ink-soft">Chosen by Nova, Milo &amp; Wren</span>
              </div>
            </div>
          </div>
        </div>

        <Graduation />
      </div>
    </section>
  );
}

function Graduation() {
  const stages = [
    {
      when: "Weeks 1–4",
      title: "Small jars, quick wins",
      body: "Your child sees effort add up fast — the first celebration comes quickly.",
      cap: 20,
      filled: 20,
      size: "w-[42%]",
    },
    {
      when: "Months 2–3",
      title: "Stretch the jar",
      body: "As habits form, goals get bigger and celebrations a little further apart.",
      cap: 60,
      filled: 38,
      size: "w-[52%]",
    },
    {
      when: "Then",
      title: "The habit sticks",
      body: "Making the bed is just what your family does. The jar can retire.",
      cap: 0,
      filled: 0,
      size: "w-[50%]",
    },
  ];
  return (
    <div className="mt-24 border-t border-ink/10 pt-14 sm:mt-32 sm:pt-20">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <h3 className="lp-display-m max-w-[16ch] text-ink">
          The goal is graduation, not dependence.
        </h3>
        <p className="max-w-lg text-lg leading-relaxed text-ink-soft">
          Rewards are scaffolding, not the building. PointPals is the app you use{" "}
          <em className="font-semibold not-italic text-ink">less</em> as habits stick &mdash;
          stretch the jar, fade the rewards, keep the noticing.
        </p>
      </div>
      <Reveal as="ol" className="mt-12 grid gap-5 sm:grid-cols-3">
        {stages.map((s, i) => (
          <li key={s.when} className="card-soft relative flex flex-col overflow-hidden p-6 sm:p-7">
            <div className="flex h-40 items-end justify-center">
              {s.cap ? (
                <div className={s.size}>
                  <GlassJar capacity={s.cap} filled={s.filled} seed={31 + i} />
                </div>
              ) : (
                <div className="relative w-[44%]">
                  <Pal id="moss" size="100%" mood="happy" />
                  <span className="absolute -right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-jade text-ink shadow-clay-sm">
                    <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
                  </span>
                </div>
              )}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              {s.when}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{s.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">{s.body}</p>
          </li>
        ))}
      </Reveal>
    </div>
  );
}
