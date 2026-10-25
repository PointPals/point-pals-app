import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/brand/Wordmark";
import { Pal } from "@/components/pals/Pal";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

// The Pals gathered on the brand panel — position, size and float offset.
const CAST: { id: string; style: CSSProperties; delay: number }[] = [
  { id: "sunny", style: { left: "8%", top: "16%", width: "22%" }, delay: 0 },
  { id: "pip", style: { right: "10%", top: "10%", width: "19%" }, delay: -1.1 },
  { id: "marlow", style: { left: "34%", top: "6%", width: "17%" }, delay: -2.3 },
  { id: "ridge", style: { right: "5%", bottom: "13%", width: "20%" }, delay: -0.6 },
  { id: "fern", style: { left: "6%", bottom: "17%", width: "19%" }, delay: -1.8 },
  { id: "coda", style: { left: "40%", bottom: "5%", width: "17%" }, delay: -2.9 },
];

/**
 * Shared frame for sign-in, sign-up, join, password reset and first-run setup:
 * the form on a calm cream column, and (on desktop) an ink brand panel where
 * the Pals hang out around the promise line. On phones a few Pals peek over
 * the form.
 */
export function AuthShell({
  children,
  wide = false,
  peek = true,
  headerAction,
  headline = "Every good thing drops a marble.",
  blurb = "Notice the good, fill the family jar, celebrate together. Free for every family.",
}: {
  children: ReactNode;
  /** Roomier form column, for setup steps with pickers. */
  wide?: boolean;
  /** Show the Pals peeking over the form on phones. */
  peek?: boolean;
  /** Replaces the "← Home" link in the header. */
  headerAction?: ReactNode;
  headline?: string;
  blurb?: string;
}) {
  const { reducedMotion } = useSettings();
  const float = reducedMotion ? undefined : "kid-float";
  return (
    <div className="auth-shell grid min-h-dvh bg-cream lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
        <header className="flex items-center justify-between">
          <Link to="/welcome" aria-label="PointPals home" className="inline-block">
            <Wordmark className="text-[1.8rem]" />
          </Link>
          {headerAction ?? (
            <Link
              to="/welcome"
              className="min-h-11 inline-flex items-center text-sm font-semibold text-ink-soft hover:text-ink"
            >
              ← Home
            </Link>
          )}
        </header>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none mt-6 flex justify-center gap-3 lg:hidden",
            !peek && "hidden",
          )}
        >
          {["sunny", "pip", "marlow"].map((id, i) => (
            <span
              key={id}
              className={float}
              style={{ "--float-delay": `${-i * 0.7}s` } as CSSProperties}
            >
              <Pal id={id} size={i === 1 ? 92 : 76} shadow={false} />
            </span>
          ))}
        </div>

        <main className="flex flex-1 items-center justify-center py-6 lg:py-10">
          <div className={cn("w-full", wide ? "max-w-xl" : "max-w-sm")}>{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link to="/privacy" className="min-h-9 inline-flex items-center hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="min-h-9 inline-flex items-center hover:text-ink">
            Terms
          </Link>
          <a
            href="mailto:support@pointpals.co.nz"
            className="min-h-9 inline-flex items-center hover:text-ink"
          >
            support@pointpals.co.nz
          </a>
          <span>Made in New Zealand</span>
        </footer>
      </div>

      <aside
        className="relative hidden overflow-hidden bg-ink lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 45% at 50% 48%, oklch(0.42 0.08 300 / 0.75), transparent 70%), radial-gradient(40% 35% at 85% 12%, oklch(0.82 0.15 78 / 0.18), transparent 70%), radial-gradient(40% 35% at 12% 88%, oklch(0.76 0.12 210 / 0.2), transparent 70%)",
          }}
        />
        {CAST.map((p) => (
          <span
            key={p.id}
            className={cn("absolute", float)}
            style={{ ...p.style, "--float-delay": `${p.delay}s` } as CSSProperties}
          >
            <Pal id={p.id} size="100%" shadow={false} />
          </span>
        ))}
        <div className="absolute inset-x-[16%] top-1/2 -translate-y-1/2 text-center">
          <p className="mx-auto max-w-[12ch] font-display text-[clamp(2.6rem,4.4vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-cream">
            {headline}
          </p>
          <p className="mx-auto mt-5 max-w-[22rem] text-base leading-relaxed text-cream/70">
            {blurb}
          </p>
        </div>
      </aside>
    </div>
  );
}
