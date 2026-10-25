import {
  BedDouble,
  Check,
  Hand,
  HandHeart,
  Heart,
  Mountain,
  Sparkles,
  ToyBrick,
  type LucideIcon,
} from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { Pal } from "@/components/pals/Pal";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { PAL_BY_ID } from "./palette";
import { PhoneFrame, StatusBar } from "./PhoneFrame";
import { Eyebrow } from "./ui";

const STEPS = [
  {
    title: "Pass your phone over",
    body: "Kids’ mode turns your phone into big, picture-first buttons. Little ones don’t need to read — and it never looks babyish to the big kids.",
  },
  {
    title: "They tap what they did",
    body: "Your child picks the good thing they did. Saying it out loud is half the magic — and it’s their idea, not yours.",
  },
  {
    title: "You hold to approve",
    body: "A long press keeps it honest. One marble drops, and you get to notice it together.",
  },
];

const TILES: { label: string; Icon: LucideIcon; color: string }[] = [
  { label: "I helped!", Icon: HandHeart, color: "var(--marble-jade)" },
  { label: "Made my bed", Icon: BedDouble, color: "var(--marble-cobalt)" },
  { label: "Brushed teeth", Icon: Sparkles, color: "var(--marble-aqua)" },
  { label: "I was kind", Icon: Heart, color: "var(--marble-rose)" },
  { label: "Tried hard", Icon: Mountain, color: "var(--marble-coral)" },
  { label: "Tidied up", Icon: ToyBrick, color: "var(--marble-saffron)" },
];

const RING = 2 * Math.PI * 44;

/**
 * Chapter 04 — kids pick their own points on the parent's phone. Pinned and
 * scrubbed: the phone is handed across, flips into a playful kid view, the
 * child taps "I helped!", then it comes back and the parent holds to approve.
 */
export function HandItOver() {
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
        const steps = q(".lp-kid-step");
        const dim = small ? 0 : 0.3;
        const phone = q(".lp-kid-phone");
        const dot = q(".lp-kid-dot");
        const helped = q(".lp-kid-tile")[0];
        const screen = () => (dot[0] as HTMLElement).offsetParent as HTMLElement;
        // Tap-dot positions as fractions of the phone screen.
        const at = (fx: number, fy: number) => ({
          x: () => screen().offsetWidth * fx,
          y: () => screen().offsetHeight * fy,
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: small ? "+=180%" : "+=230%",
            pin: q(".lp-kid-stage")[0],
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.set(steps, { opacity: (i) => (i === 0 ? 1 : dim) }, 0)
          .set(q(".lp-kid-screen-b"), { xPercent: 104 }, 0)
          .set(q(".lp-kid-screen-c"), { yPercent: 104 }, 0)
          .set(q(".lp-kid-check"), { scale: 0 }, 0)
          .set(q(".lp-kid-ring-fill"), { strokeDashoffset: RING }, 0)
          .set(q(".lp-kid-done"), { opacity: 0, scale: 0.6 }, 0)
          .set(q(".lp-kid-marble"), { opacity: 0, y: 0, scale: 0.4 }, 0)
          .set(phone, { rotate: -5, xPercent: -6 }, 0)
          // 1 · parent taps "Let Nova pick"
          .fromTo(
            dot,
            { opacity: 0, ...at(0.7, 0.96) },
            { opacity: 1, ...at(0.5, 0.86), duration: 0.8, ease: "power2.out" },
            0.2,
          )
          .to(dot, { scale: 0.75, duration: 0.2 }, 1.05)
          .to(q(".lp-kid-handbtn"), { scale: 0.95, duration: 0.2 }, 1.05)
          .to(dot, { scale: 1, opacity: 0, duration: 0.3 }, 1.3)
          .to(q(".lp-kid-handbtn"), { scale: 1, duration: 0.3 }, 1.3)
          // the hand-over: phone swings across, flips into kids' mode
          .to(phone, { rotate: 5, xPercent: 6, duration: 1, ease: "power2.inOut" }, 1.4)
          .to(q(".lp-kid-screen-b"), { xPercent: 0, duration: 0.8, ease: "power3.out" }, 1.6)
          .to(steps[0], { opacity: dim, duration: 0.3 }, 1.9)
          .to(steps[1], { opacity: 1, duration: 0.3 }, 1.9)
          .from(
            q(".lp-kid-tile"),
            { y: 30, opacity: 0, scale: 0.85, stagger: 0.06, duration: 0.5, ease: "back.out(2)" },
            1.9,
          )
          // 2 · child taps "I helped!"
          .fromTo(
            dot,
            { opacity: 0, ...at(0.8, 0.7), scale: 1.2 },
            { opacity: 1, ...at(0.27, 0.29), scale: 1, duration: 0.7, ease: "power2.out" },
            2.6,
          )
          .to(dot, { scale: 0.75, duration: 0.2 }, 3.3)
          .to(helped, { scale: 0.92, duration: 0.2 }, 3.3)
          .to(helped, { scale: 1.04, duration: 0.35, ease: "back.out(3)" }, 3.5)
          .to(q(".lp-kid-sel"), { opacity: 1, duration: 0.2 }, 3.5)
          .to(q(".lp-kid-check"), { scale: 1, duration: 0.35, ease: "back.out(3)" }, 3.55)
          .to(dot, { ...at(0.5, 0.9), scale: 1, duration: 0.5, ease: "power2.inOut" }, 3.7)
          .to(dot, { scale: 0.75, duration: 0.15 }, 4.2)
          .to(dot, { opacity: 0, scale: 1, duration: 0.25 }, 4.35)
          // 3 · back to the grown-up: hold to approve
          .to(phone, { rotate: -4, xPercent: -4, duration: 0.9, ease: "power2.inOut" }, 4.4)
          .to(q(".lp-kid-screen-c"), { yPercent: 0, duration: 0.7, ease: "power3.out" }, 4.6)
          .to(steps[1], { opacity: dim, duration: 0.3 }, 4.8)
          .to(steps[2], { opacity: 1, duration: 0.3 }, 4.8)
          .fromTo(
            dot,
            { opacity: 0, ...at(0.62, 0.96) },
            { opacity: 1, ...at(0.5, 0.78), duration: 0.5, ease: "power2.out" },
            5.2,
          )
          .to(dot, { scale: 0.7, duration: 0.2 }, 5.7)
          .to(
            q(".lp-kid-ring-fill"),
            { strokeDashoffset: 0, duration: 1.4, ease: "power1.in" },
            5.8,
          )
          .to(q(".lp-kid-hold"), { opacity: 0, duration: 0.2 }, 7.2)
          .to(
            q(".lp-kid-done"),
            { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" },
            7.2,
          )
          .to(dot, { opacity: 0, scale: 1, duration: 0.3 }, 7.25)
          .to(
            q(".lp-kid-marble"),
            { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" },
            7.3,
          )
          .to(
            q(".lp-kid-marble"),
            { y: () => -window.innerHeight * 0.18, duration: 0.8, ease: "power2.out" },
            7.4,
          )
          .to(q(".lp-kid-marble"), { opacity: 0, duration: 0.3 }, 7.9)
          .to({}, { duration: 0.6 });

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
      id="kids"
      aria-labelledby="lp-kid-title"
      className="lp-kid relative isolate overflow-x-clip"
    >
      <div className="lp-kid-stage relative mx-auto grid max-w-[88rem] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-10 xl:px-12">
        <div className="lp-kid-copy relative z-10">
          <Eyebrow n="04" marble="var(--marble-jade)">
            Kids&rsquo; mode
          </Eyebrow>
          <h2 id="lp-kid-title" className="lp-display-l mt-5 max-w-[11ch] text-ink">
            Hand it to your child.
          </h2>
          <p className="mt-4 font-display text-2xl font-medium text-ink sm:text-3xl">
            They choose. <span style={{ color: nova.shade }}>You approve.</span>
          </p>
          <ol className="lp-kid-steps mt-8 space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-kid-step flex max-w-md gap-4">
                <span
                  aria-hidden
                  className="marble mt-0.5 grid h-8 w-8 shrink-0 place-items-center font-display text-sm font-bold text-ink"
                  style={
                    {
                      "--marble": [
                        "var(--marble-saffron)",
                        "var(--marble-jade)",
                        "var(--marble-plum)",
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
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft sm:text-base">
                    {s.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="lp-kid-note mt-8 max-w-md text-sm text-ink-soft">
            Works on the phone you already have &mdash; no extra devices, nothing new to charge.
          </p>
        </div>

        <div className="lp-kid-scene relative mx-auto w-full max-w-[22rem] lg:max-w-[24rem]">
          <div aria-hidden className="lp-kid-glow absolute -inset-[30%] -z-10" />
          <div className="lp-kid-phone relative">
            <PhoneFrame label="Kids' mode on a parent's phone: Nova taps 'I helped!' and a grown-up holds to approve.">
              <ScreenA />
              <ScreenB />
              <ScreenC />
              <span className="lp-kid-dot pointer-events-none absolute left-0 top-0 z-50 h-[13cqw] w-[13cqw] -ml-[6.5cqw] -mt-[6.5cqw] rounded-full border-[0.7cqw] border-white bg-ink/25 shadow-lg" />
            </PhoneFrame>
          </div>
          <span
            aria-hidden
            className="lp-kid-marble marble pointer-events-none absolute left-1/2 top-[66%] z-20 -ml-4 h-8 w-8"
            style={{ "--marble": "var(--marble-plum)" } as CSSProperties}
          />
        </div>
      </div>
    </section>
  );
}

const nova = PAL_BY_ID.lumi;

function ScreenA() {
  return (
    <div className="lp-kid-screen-a absolute inset-0 flex flex-col bg-cream">
      <StatusBar />
      <div className="px-[6cqw] pt-[8cqw]">
        <p className="text-[3.2cqw] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Harper family
        </p>
        <p className="mt-[1.5cqw] font-display text-[8cqw] font-semibold leading-none tracking-[-0.03em] text-ink">
          Nova
        </p>
      </div>
      <div
        className="mx-[6cqw] mt-[5cqw] grid place-items-center rounded-[7cqw] py-[6cqw]"
        style={{ background: nova.tint }}
      >
        <span className="block w-[36cqw]">
          <Pal id="lumi" size="100%" mood="idle" />
        </span>
        <p className="mt-[2cqw] text-[3.6cqw] font-semibold text-ink">34 marbles this month</p>
      </div>
      <div className="mx-[6cqw] mt-[4cqw] space-y-[2cqw] text-[3.4cqw] text-ink-soft">
        <p className="flex justify-between">
          <span>Fed the cat</span>
          <span className="font-semibold text-ink">+2</span>
        </p>
        <p className="flex justify-between">
          <span>Kindness to a sibling</span>
          <span className="font-semibold text-ink">+1</span>
        </p>
      </div>
      <div className="mt-auto px-[6cqw] pb-[8cqw]">
        <span className="lp-kid-handbtn flex items-center justify-center gap-[2cqw] rounded-full bg-ink py-[4cqw] text-[4cqw] font-semibold text-cream">
          <Hand className="h-[4.6cqw] w-[4.6cqw]" /> Let Nova pick
        </span>
      </div>
    </div>
  );
}

function ScreenB() {
  return (
    <div className="lp-kid-screen-b absolute inset-0 flex flex-col overflow-hidden text-ink">
      <div aria-hidden className="lp-kid-wash absolute inset-0 -z-10" />
      <StatusBar />
      <div className="flex items-end gap-[2cqw] px-[5cqw] pt-[5cqw]">
        <span className="lp-bob block w-[27cqw] shrink-0">
          <Pal id="lumi" size="100%" mood="happy" />
        </span>
        <p className="relative mb-[6cqw] rounded-[4cqw] rounded-bl-[1cqw] bg-white px-[3.4cqw] py-[2.6cqw] font-display text-[4.6cqw] font-semibold leading-tight shadow-clay-sm">
          Hi Nova! What did you do?
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-[3cqw] px-[5cqw] pt-[3cqw]">
        {TILES.map(({ label, Icon, color }, i) => (
          <li
            key={label}
            className="lp-kid-tile relative flex flex-col items-center gap-[2cqw] rounded-[5cqw] bg-white/90 px-[2cqw] py-[3.4cqw] shadow-clay-sm"
          >
            {i === 0 && (
              <>
                <span className="lp-kid-sel absolute -inset-[1cqw] rounded-[6cqw] border-[0.9cqw] border-jade" />
                <span className="lp-kid-check absolute -right-[1.5cqw] -top-[1.5cqw] grid h-[8cqw] w-[8cqw] place-items-center rounded-full bg-jade text-white shadow-clay-sm">
                  <Check className="h-[4.8cqw] w-[4.8cqw]" strokeWidth={3.2} />
                </span>
              </>
            )}
            <span
              className="grid h-[13cqw] w-[13cqw] place-items-center rounded-full text-white"
              style={{
                background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${color} 60%, white), ${color} 70%)`,
              }}
            >
              <Icon className="h-[7cqw] w-[7cqw]" strokeWidth={2.4} />
            </span>
            <span className="text-[3.7cqw] font-bold leading-none">{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto px-[5cqw] pb-[7cqw]">
        <span className="flex items-center justify-center rounded-full bg-ink py-[4cqw] text-[4cqw] font-semibold text-cream">
          Ask a grown-up
        </span>
      </div>
    </div>
  );
}

function ScreenC() {
  return (
    <div className="lp-kid-screen-c absolute inset-0 flex flex-col bg-ink/40 backdrop-blur-[2px]">
      <div className="mt-auto rounded-t-[8cqw] bg-cream px-[6cqw] pb-[9cqw] pt-[6cqw] shadow-lift">
        <span aria-hidden className="mx-auto block h-[1.2cqw] w-[12cqw] rounded-full bg-ink/15" />
        <div className="mt-[5cqw] flex items-center gap-[3cqw]">
          <span
            className="grid h-[14cqw] w-[14cqw] place-items-center rounded-full"
            style={{ background: nova.tint }}
          >
            <Pal id="lumi" size="84%" mood="happy" shadow={false} />
          </span>
          <span>
            <span className="block text-[3.4cqw] text-ink-soft">Nova says</span>
            <span className="block font-display text-[6.4cqw] font-semibold leading-tight text-ink">
              &ldquo;I helped!&rdquo;
            </span>
          </span>
          <span className="ml-auto rounded-full bg-jade/20 px-[2.6cqw] py-[1.2cqw] text-[3.8cqw] font-bold text-ink">
            +2
          </span>
        </div>
        <div className="relative mx-auto mt-[7cqw] grid h-[34cqw] w-[34cqw] place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-ink/10"
            />
            <circle
              className="lp-kid-ring-fill text-jade"
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={0}
            />
          </svg>
          <span className="grid h-[26cqw] w-[26cqw] place-items-center rounded-full bg-ink text-center text-[3.6cqw] font-semibold leading-tight text-cream">
            <span className="lp-kid-hold">
              Hold to
              <br />
              approve
            </span>
          </span>
          <span className="lp-kid-done absolute grid h-[26cqw] w-[26cqw] place-items-center rounded-full bg-jade text-ink">
            <Check className="h-[11cqw] w-[11cqw]" strokeWidth={3} />
          </span>
        </div>
        <p className={cn("mt-[4cqw] text-center text-[3.4cqw] text-ink-soft")}>
          One marble for the family jar.
        </p>
      </div>
    </div>
  );
}
