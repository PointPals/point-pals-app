import { Mail, ShieldCheck, Ruler, Sparkles } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { PALS } from "@/lib/pals";
import { Eyebrow, Magnetic, TappablePal } from "./ui";

const WAITLIST =
  "mailto:support@pointpals.co.nz?subject=" +
  encodeURIComponent("Plush waitlist") +
  "&body=" +
  encodeURIComponent(
    "Hi PointPals,\n\nPlease add me to the plush waitlist.\n\nMy family's favourite Pal is: \n\nThanks!",
  );

// Shelf order — alternating colours so neighbours never blend.
const ORDER = ["sunny", "pip", "marlow", "fern", "coda", "bramble", "ridge", "ziggy"] as const;
const BY_ID = Object.fromEntries(PALS.map((p) => [p.id, p]));

const DETAILS = [
  { icon: Ruler, text: "A huggable sit-down size, plus a little bag-clip Pal" },
  { icon: Sparkles, text: "Embroidered faces — no hard eyes or buttons" },
  { icon: ShieldCheck, text: "Being made to toy-safety standards (AS/NZS ISO 8124, EN 71)" },
];

/**
 * Chapter 07 — the plush teaser. A gallery-lit night shelf: the Pals rise
 * into their spotlights one by one (tap any of them), then the details a
 * parent asks about first and a single waitlist ask.
 */
export function Plush() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(el);
        const tl = gsap.timeline({
          scrollTrigger: { trigger: q(".lp-plush-shelf")[0], start: "top 80%", once: true },
        });
        tl.from(q(".lp-plush-beam"), {
          opacity: 0,
          scaleY: 0.6,
          transformOrigin: "50% 0%",
          duration: 1.4,
          stagger: 0.08,
          ease: "power2.out",
        })
          .from(
            q(".lp-plush-pal"),
            { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.09, ease: "back.out(1.6)" },
            0.15,
          )
          .from(
            q(".lp-plush-tag"),
            { y: 12, opacity: 0, duration: 0.8, stagger: 0.06, ease: "power3.out" },
            0.6,
          );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="plush"
      aria-labelledby="lp-plush-title"
      className="relative overflow-hidden bg-ink py-24 text-cream sm:py-32"
    >
      {/* soft vignette + stage glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 70%, oklch(0.42 0.08 300 / 0.55), transparent 70%), radial-gradient(40% 40% at 85% 10%, oklch(0.82 0.15 78 / 0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-end">
          <div>
            <Eyebrow n="07" tone="cream" marble="var(--marble-rose)">
              The plush collection
            </Eyebrow>
            <SplitReveal as="h2" className="lp-display-l mt-5 max-w-[11ch] text-cream">
              <span id="lp-plush-title">Bring your Pal home.</span>
            </SplitReveal>
          </div>
          <p className="max-w-lg text-lg leading-relaxed text-cream/75 sm:text-xl lg:pb-3">
            Your family’s favourite Pals as real, huggable plush — soft enough for bedtime, sturdy
            enough for the school bag. The collection is in the works.
          </p>
        </div>

        {/* The shelf */}
        <div className="lp-plush-shelf relative mt-16 sm:mt-20">
          <div className="grid grid-cols-4 gap-x-3 gap-y-10 lg:grid-cols-8 sm:gap-x-4">
            {ORDER.map((id) => {
              const p = BY_ID[id];
              return (
                <div key={id} className="relative flex flex-col items-center">
                  <span
                    aria-hidden
                    className="lp-plush-beam pointer-events-none absolute -top-24 bottom-6 left-1/2 w-[130%] -translate-x-1/2"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, color-mix(in oklab, ${p.color} 22%, transparent) 55%, color-mix(in oklab, ${p.color} 34%, transparent) 100%)`,
                      clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
                      filter: "blur(6px)",
                    }}
                  />
                  <div className="lp-plush-pal relative w-full max-w-[9.5rem]">
                    <TappablePal
                      id={id}
                      label={`${p.name}, the Pal of ${p.value.toLowerCase()}`}
                      bubble={`Hi, I'm ${p.name}!`}
                      restMood="idle"
                    />
                  </div>
                  {/* plinth */}
                  <div
                    aria-hidden
                    className="mt-1 h-3 w-[86%] rounded-[50%]"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.36 0.04 300), oklch(0.29 0.04 300))",
                      boxShadow: "0 10px 24px -8px oklch(0 0 0 / 0.6)",
                    }}
                  />
                  <p className="lp-plush-tag mt-4 text-center">
                    <span className="block font-display text-xl font-semibold tracking-[-0.02em] text-cream">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cream/55">
                      {p.value}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
          {/* shelf edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[-4%] top-[calc(100%-5.6rem)] hidden h-px bg-gradient-to-r from-transparent via-cream/20 to-transparent sm:block"
          />
        </div>

        <div className="mt-16 grid gap-8 rounded-[2rem] border border-cream/10 bg-cream/[0.04] p-7 backdrop-blur-sm sm:mt-20 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <ul className="grid gap-4">
            {DETAILS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3.5 text-base text-cream/85 sm:text-lg"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream/10">
                  <Icon aria-hidden className="h-4.5 w-4.5 text-cream" />
                </span>
                <span className="pt-1.5 leading-snug">{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Magnetic>
              <a
                href={WAITLIST}
                className="tap group inline-flex min-h-14 items-center gap-2.5 rounded-full bg-cream px-7 text-base font-semibold text-ink shadow-[0_18px_40px_-16px_oklch(0_0_0/0.7)] transition-shadow hover:shadow-glow sm:min-h-[3.75rem] sm:text-[1.05rem]"
              >
                <span
                  aria-hidden
                  className="marble h-3.5 w-3.5 transition-transform duration-500 ease-spring group-hover:scale-125"
                  style={{ "--marble": "var(--marble-rose)" } as CSSProperties}
                />
                Join the plush waitlist
                <Mail aria-hidden className="h-4 w-4" />
              </a>
            </Magnetic>
            <p className="text-sm text-cream/55">We’ll email you once — when they’re ready.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
