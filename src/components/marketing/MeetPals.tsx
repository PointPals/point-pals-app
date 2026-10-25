import { ArrowRight, Hand } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { PALS } from "@/lib/pals";
import { Eyebrow, PrimaryCta, TappablePal } from "./ui";

/**
 * Chapter 03 — Meet the Pals. On ≥768px with motion, the section pins and
 * scroll drives a horizontal rail of colour-washed panels (with parallax
 * inside each). On phones it's a native swipe row with scroll-snap; with
 * reduced motion on desktop it's a calm three-column grid.
 */
export function MeetPals() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (min-width: 768px)`, () => {
        el.dataset.motion = "on";
        const q = gsap.utils.selector(el);
        const rail = q(".lp-pals-rail")[0] as HTMLElement;
        const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth);

        const slide = gsap.to(rail, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: q(".lp-pals-stage")[0],
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        gsap.fromTo(
          q(".lp-pals-progress-bar"),
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${distance()}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );

        // Depth inside each panel while it crosses the screen.
        q(".lp-pal-card").forEach((card) => {
          const pal = card.querySelector(".lp-pal-figure");
          const ghost = card.querySelector(".lp-pal-ghost");
          const st = {
            trigger: card,
            containerAnimation: slide,
            start: "left right",
            end: "right left",
            scrub: true,
          };
          if (pal)
            gsap.fromTo(pal, { xPercent: 14 }, { xPercent: -14, ease: "none", scrollTrigger: st });
          if (ghost)
            gsap.fromTo(
              ghost,
              { xPercent: -18 },
              { xPercent: 18, ease: "none", scrollTrigger: st },
            );
        });
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
      id="pals"
      aria-labelledby="lp-pals-title"
      className="lp-pals relative bg-cream"
    >
      <div className="lp-pals-stage relative overflow-hidden py-20 sm:py-28">
        <div className="lp-pals-rail">
          <header className="lp-pals-intro px-4 sm:px-8 xl:px-12">
            <Eyebrow n="03" marble="var(--marble-saffron)">
              Meet the Pals
            </Eyebrow>
            <h2 id="lp-pals-title" className="lp-display-l mt-5 max-w-[12ch] text-ink">
              Eight friends worth noticing.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Each Pal stands for something families want more of &mdash; kindness, learning, goals,
              creativity, perseverance, independence, daily habits and teamwork. Your child picks
              the one that feels like them.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              Soft, round and made to be hugged &mdash; every Pal has a signature detail on its
              chest that tells you what it&rsquo;s cheering for.
            </p>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
              <Hand aria-hidden className="h-4 w-4" />
              <span>
                Tap a Pal to say hi<span className="lp-pals-swipe"> &mdash; swipe for more</span>
              </span>
            </p>
          </header>

          <ul className="lp-pals-track" aria-label="The Pals">
            {PALS.map((p, i) => (
              <li
                key={p.id}
                className="lp-pal-card relative isolate flex flex-col overflow-hidden rounded-[2.25rem] p-6 shadow-clay sm:rounded-[2.75rem] sm:p-8"
                style={
                  {
                    "--pal": p.color,
                    "--pal-tint": p.tint,
                    "--pal-shade": p.shade,
                  } as CSSProperties
                }
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-[24%] -z-10 flex justify-center"
                >
                  <span className="lp-pal-ghost whitespace-nowrap font-display font-bold uppercase leading-none tracking-[-0.04em]">
                    {p.value}
                  </span>
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink backdrop-blur">
                    <span
                      aria-hidden
                      className="marble h-2.5 w-2.5"
                      style={{ "--marble": p.color } as CSSProperties}
                    />
                    {p.value}
                  </span>
                  <span
                    aria-hidden
                    className="font-display text-sm font-semibold text-ink/50 tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")} / {String(PALS.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="lp-pal-figure relative mx-auto mt-2 w-[74%] max-w-[17rem]">
                  <span
                    aria-hidden
                    className="lp-pal-halo absolute inset-[8%] -z-10 rounded-full"
                  />
                  <TappablePal
                    id={p.id}
                    label={`Say hi to ${p.name}, the Pal for ${p.value.toLowerCase()}`}
                    bubble={`Hi, I'm ${p.name}!`}
                  />
                </div>

                <h3 className="mt-auto font-display text-[clamp(3rem,5.4vw,5rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-ink">
                  {p.name}
                </h3>
                <p className="mt-3 font-display text-xl leading-snug text-ink sm:text-[1.35rem]">
                  {p.tagline}
                </p>
                <p className="lp-pal-bio mt-3 text-sm leading-relaxed text-ink-soft">{p.bio}</p>
                <p className="mt-4 border-t border-dashed border-ink/20 pt-3 text-xs leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Look for · </span>
                  {p.motif}.
                </p>
              </li>
            ))}
            <li className="lp-pal-card lp-pal-outro relative flex flex-col justify-end overflow-hidden rounded-[2.25rem] bg-ink p-6 text-cream sm:rounded-[2.75rem] sm:p-8">
              <div aria-hidden className="absolute inset-x-0 top-[8%] flex justify-center gap-1">
                {PALS.map((p, i) => (
                  <span
                    key={p.id}
                    className="marble h-8 w-8 sm:h-10 sm:w-10"
                    style={
                      {
                        "--marble": p.color,
                        transform: `translateY(${Math.round(Math.sin(i * 1.1) * 14)}px)`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <p className="font-display text-[clamp(2.2rem,3.6vw,3.25rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
                Your child picks the Pal that feels like them.
              </p>
              <p className="mt-4 text-cream/75">
                Choose one together when you add them to your family &mdash; it&rsquo;s theirs from
                then on.
              </p>
              <div className="mt-7">
                <PrimaryCta tone="cream">Start your family jar</PrimaryCta>
              </div>
              <a
                href="#plush"
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cream/80 hover:text-cream"
              >
                Want one to cuddle? <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </div>

        <div
          aria-hidden
          className="lp-pals-progress absolute inset-x-0 bottom-8 mx-auto h-1 w-40 overflow-hidden rounded-full bg-ink/10"
        >
          <span className="lp-pals-progress-bar block h-full origin-left rounded-full bg-ink" />
        </div>
      </div>
    </section>
  );
}
