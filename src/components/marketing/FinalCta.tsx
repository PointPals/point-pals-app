import { Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Pal } from "@/components/pals/Pal";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { Eyebrow, PrimaryCta, secondaryCtaClass } from "./ui";

// Pals peeking over the bottom edge of the CTA card, left → right.
const PEEKERS = [
  { id: "pip", w: "w-[15%]", left: "4%", delay: 0 },
  { id: "marlow", w: "w-[19%]", left: "20%", delay: 0.08 },
  { id: "sunny", w: "w-[15%]", left: "41%", delay: 0.16 },
  { id: "coda", w: "w-[20%]", left: "57%", delay: 0.24 },
  { id: "ridge", w: "w-[15%]", left: "79%", delay: 0.32 },
] as const;

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.64 5.98.53 7.13-.64 1.63-1.51 3.24-2.58 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M4 3.5v17a.9.9 0 0 0 1.37.77l14.3-8.5a.9.9 0 0 0 0-1.54L5.37 2.73A.9.9 0 0 0 4 3.5Z" />
    </svg>
  );
}

const FOOTER = [
  {
    title: "PointPals",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Meet the Pals", href: "#pals" },
      { label: "Kids' mode", href: "#kids" },
      { label: "Plush waitlist", href: "#plush" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "The research", to: "/about" },
      { label: "FAQ", to: "/faq" },
      { label: "Blog", to: "/blog" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Refunds", to: "/refunds" },
      { label: "Delete account", to: "/delete-account" },
    ],
  },
] as const;

/**
 * Chapter 08 — the close. One last, generous ask with the Pals peeking over
 * the card edge, honest app availability (browser today, stores soon — no
 * dead links), then the footer.
 */
export function FinalCta() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(el);
        gsap.from(q(".lp-peek"), {
          yPercent: 70,
          duration: 1.2,
          ease: "back.out(1.7)",
          stagger: 0.08,
          scrollTrigger: { trigger: q(".lp-final-card")[0], start: "top 70%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <section
        id="start"
        aria-labelledby="lp-final-title"
        className="relative bg-cream px-4 pb-10 pt-24 sm:px-8 sm:pt-32"
      >
        <div className="lp-final-card relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-6 pb-40 pt-16 text-center shadow-lift sm:rounded-[3rem] sm:px-12 sm:pb-56 sm:pt-24">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(80% 70% at 15% 0%, oklch(0.93 0.07 300), transparent 60%), radial-gradient(70% 60% at 90% 10%, oklch(0.93 0.08 85), transparent 60%), radial-gradient(70% 70% at 50% 100%, oklch(0.9 0.07 205), transparent 70%), oklch(0.985 0.01 82)",
            }}
          />
          <Eyebrow n="08" marble="var(--marble-saffron)" className="justify-center">
            Free for every family
          </Eyebrow>
          <SplitReveal as="h2" className="lp-display-l mx-auto mt-6 max-w-[12ch] text-ink">
            <span id="lp-final-title">Your family jar is waiting.</span>
          </SplitReveal>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Set up in a couple of minutes. Add your children, choose their Pals, pick a reward
            you’ll earn together — and start noticing the good tonight.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta />
            <Link to="/sign-in" className={secondaryCtaClass}>
              Log in
            </Link>
          </div>
          <Link
            to="/join"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Got an invite code? Join your family
          </Link>

          {PEEKERS.map((p) => (
            <div
              key={p.id}
              aria-hidden
              className={`lp-peek absolute bottom-[-9%] ${p.w}`}
              style={{ left: p.left }}
            >
              <Pal id={p.id} size="100%" mood="happy" animate />
            </div>
          ))}
        </div>

        {/* Availability — honest: browser today, stores soon. */}
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-5 px-2 sm:flex-row">
          <p className="flex items-center gap-3 text-sm text-ink-soft sm:text-base">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card shadow-clay-sm">
              <Smartphone aria-hidden className="h-4 w-4 text-ink" />
            </span>
            Runs in your phone’s browser today — add it to your home screen for the full-screen app.
          </p>
          <ul className="flex items-center gap-2.5" aria-label="Native apps">
            {[
              { name: "App Store", Glyph: AppleGlyph },
              { name: "Google Play", Glyph: PlayGlyph },
            ].map(({ name, Glyph }) => (
              <li
                key={name}
                className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-card/70 px-3.5 py-2 text-ink"
              >
                <Glyph />
                <span className="leading-tight">
                  <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Coming soon
                  </span>
                  <span className="block text-sm font-semibold">{name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="bg-white text-ink">
        <div
          aria-hidden
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--marble-plum), var(--marble-cobalt), var(--marble-aqua), var(--marble-jade), var(--marble-saffron), var(--marble-coral), var(--marble-rose))",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link to="/" aria-label="PointPals home" className="inline-block">
              <Wordmark className="text-3xl" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              A free, research-backed family chore chart and behaviour chart for children. Notice
              the good, fill the jar, celebrate together.
            </p>
            <a
              href="mailto:support@pointpals.co.nz"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              support@pointpals.co.nz
            </a>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-4 grid gap-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"to" in l ? (
                      <Link
                        to={l.to}
                        className="inline-flex min-h-10 items-center text-sm text-ink-soft transition-colors hover:text-ink"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="inline-flex min-h-10 items-center text-sm text-ink-soft transition-colors hover:text-ink"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border/70">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:px-10">
            <p>© 2026 PointPals · Made in New Zealand</p>
            <p className="flex items-center gap-2">
              <span
                aria-hidden
                className="marble inline-block h-2.5 w-2.5"
                style={{ "--marble": "var(--marble-saffron)" } as CSSProperties}
              />
              Every good thing drops a marble.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
