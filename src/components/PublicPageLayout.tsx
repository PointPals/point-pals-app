import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PublicLogo } from "@/components/PublicLogo";

const PAGES = [
  { to: "/about", label: "Research" },
  { to: "/faq", label: "FAQ" },
  { to: "/blog", label: "Blog" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refunds", label: "Refunds" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicPageLayout({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const mainCls = wide ? "max-w-6xl mx-auto px-5 pb-16 pt-8" : "max-w-3xl mx-auto px-5 pb-16 pt-8";
  return (
    <div className="public-page min-h-screen bg-cream">
      <nav className="sticky top-0 z-30 border-b border-border/60 bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <PublicLogo />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/about"
              className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink-soft hover:text-ink sm:inline-flex"
            >
              Research
            </Link>
            <Link
              to="/faq"
              className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink-soft hover:text-ink sm:inline-flex"
            >
              FAQ
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink"
            >
              Log in
            </Link>
            <Link
              to="/sign-up"
              className="inline-flex min-h-11 items-center rounded-full bg-cta px-4 text-sm font-semibold text-white shadow-clay-sm"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className={mainCls}>{children}</main>

      <footer className="bg-white text-ink">
        <div
          aria-hidden
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--marble-plum), var(--marble-cobalt), var(--marble-aqua), var(--marble-jade), var(--marble-saffron), var(--marble-coral), var(--marble-rose))",
          }}
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {PAGES.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="inline-flex min-h-10 items-center text-sm text-ink-soft transition hover:text-ink"
              >
                {p.label}
              </Link>
            ))}
            <a
              href="mailto:support@pointpals.co.nz"
              className="inline-flex min-h-10 items-center text-sm text-ink-soft transition hover:text-ink"
            >
              support@pointpals.co.nz
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 PointPals &middot; Made in New Zealand
          </p>
        </div>
      </footer>
    </div>
  );
}
