import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Eyebrow } from "./ui";

const PRINCIPLES = [
  {
    n: "i",
    marble: "var(--marble-plum)",
    title: "Connection first.",
    body: "Rewards only work inside a warm relationship. Every marble is a small “I noticed you” — the kind of moment attachment research puts at the centre of everything.",
    source: "Neufeld & Maté, Hold On to Your Kids",
  },
  {
    n: "ii",
    marble: "var(--marble-cobalt)",
    title: "Effort you can see.",
    body: "Making progress visible has helped children build everyday habits in homes and classrooms for decades. A jar you watch fill beats a number buried in an app.",
    source: "Kazdin’s reviews of token systems",
  },
  {
    n: "iii",
    marble: "var(--marble-jade)",
    title: "Rewards that fade.",
    body: "Marbles scaffold the dull bits — teeth, tidying, shoes on. As habits stick you lower the targets and lean on praise. The goal is graduation, not dependence.",
    source: "Cameron, Banko & Pierce; Deci, Koestner & Ryan",
  },
];

const PROMISES = [
  "Free for every family",
  "No ads, ever",
  "Children’s data never used for advertising",
  "Made in New Zealand",
];

/**
 * Chapter 06 — the credibility beat. Editorial, quiet, paper-textured: three
 * principles with their sources, a brand line, and the privacy promises a
 * parent looks for before handing an app to a child. No stats, no
 * testimonials — just what the approach rests on.
 */
export function Research() {
  return (
    <section
      id="research"
      aria-labelledby="lp-research-title"
      className="grain relative overflow-hidden bg-[oklch(0.955_0.02_80)] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <Eyebrow n="06" marble="var(--marble-plum)">
              Research-backed, not gimmicky
            </Eyebrow>
            <SplitReveal as="h2" className="lp-display-l mt-5 max-w-[13ch] text-ink">
              <span id="lp-research-title">Built on what the research says.</span>
            </SplitReveal>
          </div>
          <Reveal className="max-w-xl lg:pb-3">
            <p className="text-lg leading-relaxed text-ink-soft sm:text-xl">
              PointPals isn’t a game. It’s a simple, well-studied idea: make effort visible, notice
              it warmly, choose the reward together — and let it fade as the habit takes over.
            </p>
          </Reveal>
        </div>

        <Reveal as="ol" className="mt-16 grid gap-5 md:grid-cols-3" stagger={0.12}>
          {PRINCIPLES.map((p) => (
            <li
              key={p.n}
              className="relative flex flex-col rounded-[2rem] bg-card/80 p-7 shadow-clay backdrop-blur-sm sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className="font-display text-5xl font-semibold italic leading-none tracking-[-0.04em] text-ink/15"
                >
                  {p.n}
                </span>
                <span
                  aria-hidden
                  className="marble h-5 w-5"
                  style={{ "--marble": p.marble } as CSSProperties}
                />
              </div>
              <h3 className="mt-8 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
                {p.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">{p.body}</p>
              <p className="mt-auto pt-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {p.source}
              </p>
            </li>
          ))}
        </Reveal>

        <Reveal className="mt-20 grid gap-10 border-t border-ink/10 pt-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <blockquote className="font-display text-[clamp(1.7rem,3.4vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
            Real-world rewards for a digital childhood. A marble you can see beats a streak
            engineered to keep you scrolling.
          </blockquote>
          <div>
            <ul className="grid gap-3">
              {PROMISES.map((t) => (
                <li key={t} className="flex items-center gap-3 text-base font-medium text-ink">
                  <span
                    aria-hidden
                    className="marble h-3 w-3 shrink-0"
                    style={{ "--marble": "var(--marble-jade)" } as CSSProperties}
                  />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/about"
              className="tap group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/15 bg-card/70 px-5 text-sm font-semibold text-ink shadow-clay-sm transition-colors hover:bg-card"
            >
              Read the research
              <ArrowUpRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
