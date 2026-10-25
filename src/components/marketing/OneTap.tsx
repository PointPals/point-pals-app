import { Check } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Pal } from "@/components/pals/Pal";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { GlassJar, JAR_MOUTH, JAR_VIEW, jarSlots } from "./GlassJar";
import { PAL_BY_ID } from "./palette";
import { PhoneFrame, StatusBar } from "./PhoneFrame";
import { Eyebrow } from "./ui";

const CAP = 100;
const FILL = 74;
const SEED = 23;

const KIDS = [
  { name: "Nova", pal: "sunny", points: 34 },
  { name: "Milo", pal: "pip", points: 22 },
  { name: "Wren", pal: "fern", points: 18 },
] as const;

const STEPS = [
  {
    title: "Tap your child’s Pal",
    body: "Spot something good — a chore done, a kind word, a brave try. One tap.",
  },
  {
    title: "A marble drops in the jar",
    body: "The chime tells your child you noticed. That’s the whole point.",
  },
  {
    title: "Fill it together",
    body: "Everyone’s marbles go in one family jar. No rankings, no losers.",
  },
];

const CHIPS = [
  { t: "+1 Kindness to a sibling", c: "var(--marble-plum)" },
  { t: "+2 Packed the school bag", c: "var(--marble-cobalt)" },
  { t: "+2 Tried something hard", c: "var(--marble-coral)" },
  { t: "+3 Helped without asking", c: "var(--marble-jade)" },
];

/** Layout offset of `el` inside `ancestor` (ignores transforms). */
function offsetIn(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * Chapter 02 — the signature scene. Pinned and scroll-scrubbed: a parent taps
 * a child's Pal on the phone, one marble arcs out of the screen into the big
 * jar, then the week pours in and the counter ticks to 74.
 */
export function OneTap() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ motion: MOTION_OK, small: "(max-width: 1023px)" }, (ctx) => {
        const { motion, small } = ctx.conditions as { motion: boolean; small: boolean };
        if (!motion) return;
        el.dataset.motion = "on";
        const q = gsap.utils.selector(el);
        const scene = q(".lp-one-scene")[0] as HTMLElement;
        const jarBox = q(".lp-one-jarbox")[0] as HTMLElement;
        const avatar = q(".lp-one-avatar")[0] as HTMLElement;
        const fly = q(".lp-one-fly")[0] as HTMLElement;
        const marbles = q(".lp-one-jar .jar-marble").slice(0, FILL);
        const slots = jarSlots(CAP, SEED);
        const countEls = q(".lp-one-count");
        const bar = q(".lp-one-bar");
        const steps = q(".lp-one-step");
        const tiles = q(".lp-one-tile");

        const geo = () => {
          const a = offsetIn(avatar, scene);
          const j = offsetIn(jarBox, scene);
          const k = jarBox.offsetWidth / JAR_VIEW.w;
          const start = { x: a.x + avatar.offsetWidth / 2, y: a.y + avatar.offsetHeight / 2 };
          const mouth = { x: j.x + JAR_MOUTH.x * k, y: j.y + (JAR_MOUTH.y + 4) * k };
          const peakY = Math.min(start.y, mouth.y) - scene.offsetHeight * (small ? 0.12 : 0.2);
          const endScale = (slots[0].r * 2 * k) / fly.offsetWidth;
          return { start, mouth, peakY, endScale };
        };

        const counter = { n: 0 };
        const paint = () => {
          const n = Math.round(counter.n);
          countEls.forEach((c) => (c.textContent = String(n)));
        };

        // Entrance: the phone rises in as the scene scrolls into view.
        gsap.from(q(".lp-one-phonewrap"), {
          yPercent: 18,
          rotate: -4,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.6 },
        });
        gsap.from(q(".lp-one-jarwrap"), {
          yPercent: 10,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.6 },
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: small ? "+=210%" : "+=270%",
            pin: q(".lp-one-stage")[0],
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Initial state: jar empty (marbles parked above the mouth), counter 0.
        tl.set(
          marbles,
          {
            x: (i) => JAR_MOUTH.x - slots[i].x,
            y: (i) => JAR_MOUTH.y - slots[i].y - slots[i].r * 2,
          },
          0,
        )
          .set(countEls, { textContent: "0" }, 0)
          .set(bar, { scaleX: 0 }, 0)
          .set(steps, { opacity: (i) => (i === 0 ? 1 : 0.32) }, 0)
          .set(fly, { x: () => geo().start.x, y: () => geo().start.y, scale: 0.3, opacity: 0 }, 0);

        // 1 · tap
        tl.fromTo(
          q(".lp-one-tapdot"),
          { opacity: 0, xPercent: 60, yPercent: 160, scale: 1.3 },
          { opacity: 1, xPercent: 0, yPercent: 0, scale: 1, duration: 1, ease: "power2.out" },
          0.2,
        )
          .to(q(".lp-one-tapdot"), { scale: 0.78, duration: 0.25 }, 1.25)
          .to(tiles[0], { scale: 0.965, duration: 0.25 }, 1.25)
          .fromTo(
            q(".lp-one-ripple"),
            { scale: 0.2, opacity: 0.9 },
            { scale: 2.6, opacity: 0, duration: 0.8, ease: "power2.out" },
            1.35,
          )
          .to(q(".lp-one-tapdot"), { scale: 1, opacity: 0, duration: 0.4 }, 1.55)
          .to(tiles[0], { scale: 1, duration: 0.4, ease: "back.out(3)" }, 1.5)
          .fromTo(
            q(".lp-one-toast"),
            { yPercent: -160, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" },
            1.5,
          )
          // 2 · the marble leaves the phone and arcs into the jar
          .to(fly, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 1.55)
          .to(steps[0], { opacity: 0.32, duration: 0.3 }, 1.9)
          .to(steps[1], { opacity: 1, duration: 0.3 }, 1.9)
          .to(fly, { x: () => geo().mouth.x, duration: 1.8, ease: "power1.inOut" }, 1.9)
          .to(fly, { y: () => geo().peakY, duration: 0.85, ease: "power2.out" }, 1.9)
          .to(fly, { y: () => geo().mouth.y, duration: 0.95, ease: "power2.in" }, 2.75)
          .to(fly, { scale: () => geo().endScale, duration: 1.8, ease: "power1.in" }, 1.9)
          .set(fly, { opacity: 0 }, 3.7)
          .to(marbles[0], { x: 0, duration: 0.5, ease: "power1.out" }, 3.7)
          .to(marbles[0], { y: 0, duration: 0.6, ease: "bounce.out" }, 3.7)
          .to(counter, { n: 1, duration: 0.1, onUpdate: paint }, 3.9)
          .to(bar, { scaleX: 0.01, duration: 0.1 }, 3.9)
          .to(q(".lp-one-toast"), { yPercent: -160, opacity: 0, duration: 0.5 }, 4.1)
          // 3 · the week pours in
          .to(steps[1], { opacity: 0.32, duration: 0.3 }, 4.3)
          .to(steps[2], { opacity: 1, duration: 0.3 }, 4.3);

        const rest = marbles.slice(1);
        const each = 4.2 / rest.length;
        tl.to(rest, { x: 0, duration: 0.55, ease: "power1.out", stagger: each }, 4.3)
          .to(rest, { y: 0, duration: 0.7, ease: "bounce.out", stagger: each }, 4.3)
          .to(counter, { n: FILL, duration: 4.6, onUpdate: paint }, 4.4)
          .to(bar, { scaleX: FILL / CAP, duration: 4.6 }, 4.4);

        // Tiles pulse as the family keeps tapping.
        [0, 1, 2, 1, 0, 2].forEach((t, i) => {
          tl.to(tiles[t], { scale: 0.97, duration: 0.15, yoyo: true, repeat: 1 }, 4.5 + i * 0.7);
        });
        q(".lp-one-chip").forEach((chip, i) => {
          const at = 4.6 + i * 1.05;
          tl.fromTo(
            chip,
            { y: 24, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
            at,
          ).to(chip, { y: -26, opacity: 0, duration: 0.45, ease: "power2.in" }, at + 0.8);
        });

        tl.fromTo(
          q(".lp-one-nearly"),
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5 },
          9,
        ).to({}, { duration: 1 });

        return () => {
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
      id="how"
      aria-labelledby="lp-one-title"
      className="lp-one relative scroll-mt-0 bg-cream"
    >
      <div className="lp-one-stage relative mx-auto grid max-w-[88rem] items-center gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-8 xl:px-12">
        <div className="lp-one-copy relative z-10">
          <Eyebrow n="02" marble="var(--marble-plum)">
            How it works
          </Eyebrow>
          <h2 id="lp-one-title" className="lp-display-l mt-5 text-ink">
            One tap. One marble.
          </h2>
          <p className="lp-one-lede mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Catch your children being good. Tap their Pal and a marble drops into your
            family&rsquo;s jar &mdash; a simple, visual family chore chart that everyone can see
            filling up.
          </p>
          <ol className="lp-one-steps mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-one-step flex gap-4">
                <span
                  aria-hidden
                  className="marble mt-0.5 grid h-8 w-8 shrink-0 place-items-center font-display text-sm font-bold text-ink"
                  style={
                    {
                      "--marble": [
                        "var(--marble-plum)",
                        "var(--marble-saffron)",
                        "var(--marble-jade)",
                      ][i],
                    } as CSSProperties
                  }
                >
                  <span className="relative">{i + 1}</span>
                </span>
                <span>
                  <span className="block font-display text-xl font-semibold text-ink">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft sm:text-base">
                    {s.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-one-scene relative mx-auto aspect-[1/1.25] w-full sm:aspect-[1/1.05] max-w-[50rem] lg:aspect-[1/0.9]">
          <div aria-hidden className="lp-glow absolute inset-[6%_0_0_30%] -z-10 opacity-80" />
          <div aria-hidden className="lp-plinth absolute bottom-[2%] left-[30%] h-[8%] w-[70%]" />

          <div className="lp-one-phonewrap absolute bottom-[4%] left-0 z-10 w-[54%] sm:w-[46%] lg:w-[39%]">
            <PhoneFrame label="The PointPals app: a parent taps Nova's Pal to give her a marble.">
              <ParentScreen />
            </PhoneFrame>
          </div>

          <div className="lp-one-jarwrap absolute bottom-[8%] right-0 z-0 w-[50%] sm:w-[52%] lg:right-[1%] lg:w-[54%]">
            <div className="lp-one-jarbox relative">
              <GlassJar
                capacity={CAP}
                filled={FILL}
                seed={SEED}
                className="lp-one-jar"
                title={`The family jar, ${FILL} of ${CAP} marbles full`}
              />
              <p className="absolute -bottom-[2%] left-1/2 flex -translate-x-1/2 translate-y-full items-baseline gap-1.5 whitespace-nowrap pt-3 font-display text-ink">
                <span className="lp-one-count text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tabular-nums">
                  {FILL}
                </span>
                <span className="text-sm font-sans font-semibold text-ink-soft sm:text-base">
                  / {CAP} marbles
                </span>
              </p>
              <p className="lp-one-nearly absolute inset-x-0 top-[-6%] mx-auto w-max whitespace-nowrap rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold text-ink shadow-clay-sm sm:text-sm">
                Nearly there&hellip;
              </p>
            </div>
          </div>

          {CHIPS.map((c) => (
            <span
              key={c.t}
              aria-hidden
              className={cn(
                "lp-one-chip absolute right-[1%] top-[8%] z-20 flex items-center gap-2 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-clay-sm sm:text-sm lg:right-[10%] lg:top-[10%]",
              )}
            >
              <span className="marble h-3 w-3" style={{ "--marble": c.c } as CSSProperties} />
              {c.t}
            </span>
          ))}

          <span
            aria-hidden
            className="lp-one-fly marble absolute left-0 top-0 z-30"
            style={{ "--marble": "var(--marble-plum)" } as CSSProperties}
          />
        </div>
      </div>
    </section>
  );
}

function ParentScreen() {
  return (
    <div className="relative flex h-full flex-col bg-cream">
      <StatusBar />
      <div className="px-[6cqw] pt-[6cqw]">
        <div className="flex items-center justify-between">
          <Wordmark className="text-[6.4cqw]" />
          <span className="rounded-full bg-ink/5 px-[3cqw] py-[1.3cqw] text-[3.2cqw] font-semibold text-ink-soft">
            Harper family
          </span>
        </div>
        <p className="mt-[7cqw] font-display text-[7.8cqw] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
          Who did something great?
        </p>
        <p className="mt-[1.6cqw] text-[3.7cqw] text-ink-soft">Tap a Pal to give a marble.</p>
      </div>

      <ul className="mt-[5cqw] space-y-[2.8cqw] px-[5cqw]">
        {KIDS.map((k, i) => {
          const pal = PAL_BY_ID[k.pal];
          return (
            <li
              key={k.name}
              className="lp-one-tile relative flex items-center gap-[3.4cqw] rounded-[5cqw] bg-card p-[2.8cqw] shadow-clay-sm"
            >
              <span
                className={cn(
                  "relative grid h-[15cqw] w-[15cqw] shrink-0 place-items-center rounded-full",
                  i === 0 && "lp-one-avatar",
                )}
                style={{ background: pal.tint }}
              >
                <Pal id={k.pal} size="84%" shadow={false} />
                {i === 0 && (
                  <>
                    <span className="lp-one-ripple absolute inset-0 rounded-full border-[0.8cqw] border-plum/60" />
                    <span className="lp-one-tapdot absolute left-[10%] top-[10%] h-[80%] w-[80%] rounded-full border-[0.7cqw] border-white bg-ink/25 shadow-lg" />
                  </>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[4.6cqw] font-semibold leading-tight text-ink">
                  {k.name}
                </span>
                <span className="block truncate text-[3.2cqw] text-ink-soft">
                  {pal.name} · {pal.value}
                </span>
              </span>
              <span className="flex items-center gap-[1.4cqw] rounded-full bg-ink/5 px-[2.6cqw] py-[1.2cqw] text-[3.6cqw] font-semibold tabular-nums text-ink">
                <span
                  className="marble h-[2.8cqw] w-[2.8cqw]"
                  style={{ "--marble": pal.color } as CSSProperties}
                />
                {k.points}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-[6cqw] px-[6cqw]">
        <p className="text-[3cqw] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Tonight
        </p>
        <ul className="mt-[2.4cqw] space-y-[2.2cqw] text-[3.4cqw] text-ink">
          {[
            ["Milo", "packed his school bag", "+2", "var(--marble-cobalt)"],
            ["Wren", "tried something hard", "+2", "var(--marble-jade)"],
            ["Nova", "fed the cat", "+2", "var(--marble-plum)"],
          ].map(([who, what, pts, c]) => (
            <li key={who} className="flex items-center gap-[2cqw]">
              <span
                className="marble h-[2.6cqw] w-[2.6cqw] shrink-0"
                style={{ "--marble": c } as CSSProperties}
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{who}</span> {what}
              </span>
              <span className="font-semibold tabular-nums">{pts}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto px-[5cqw] pb-[7cqw]">
        <div className="rounded-[5cqw] bg-ink p-[4cqw] text-cream">
          <div className="flex items-baseline justify-between">
            <span className="text-[3.2cqw] font-semibold uppercase tracking-[0.14em] text-cream/70">
              Family jar
            </span>
            <span className="text-[3.6cqw] font-semibold tabular-nums">
              <span className="lp-one-count">{FILL}</span>/{CAP}
            </span>
          </div>
          <p className="mt-[1cqw] font-display text-[4.6cqw] font-semibold">
            Movie night + popcorn
          </p>
          <div className="mt-[2.6cqw] h-[2.4cqw] overflow-hidden rounded-full bg-cream/15">
            <div
              className="lp-one-bar h-full origin-left rounded-full bg-gradient-to-r from-plum via-cobalt to-aqua"
              style={{ transform: `scaleX(${FILL / CAP})` }}
            />
          </div>
        </div>
      </div>

      <div className="lp-one-toast absolute inset-x-[5cqw] top-[11cqw] z-20 flex items-center gap-[2.6cqw] rounded-[4.5cqw] bg-ink/90 p-[2.6cqw] pr-[4cqw] text-cream shadow-lift backdrop-blur">
        <span className="grid h-[8cqw] w-[8cqw] place-items-center rounded-full bg-jade text-ink">
          <Check className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={3} />
        </span>
        <span className="text-[3.5cqw] leading-tight">
          <span className="block font-semibold">Nice one!</span>
          <span className="text-cream/75">Kindness to a sibling · +1 for Nova</span>
        </span>
      </div>
    </div>
  );
}
