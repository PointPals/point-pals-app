import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { Home, ListChecks, Camera, Settings, ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { useBackNav, isRootTab } from "@/lib/navigation";
import { useSettings } from "@/lib/settings";
import { KidView } from "@/components/KidView";
import { Wordmark } from "@/components/brand/Wordmark";
import { GoalChip } from "@/components/shell/GoalChip";
import { SignOutButton } from "@/components/shell/SignOutButton";

// Small inline jar-of-marbles glyph used for the Rewards tab — lucide has no
// jar, and a jar reads more truthfully than a gift box for this app.
function JarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3h10" />
      <path d="M6 6h12" />
      <path d="M7 6v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" />
      <circle cx="10" cy="15" r="1.4" fill="currentColor" />
      <circle cx="14" cy="14" r="1.4" fill="currentColor" />
      <circle cx="12" cy="17.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Bottom nav = the app's four screens (§6): Home, Chores, Memories, Rewards.
// "/library" is labelled Chores — it's where chores and behaviours are set up,
// and the old "Points" label (with a star) didn't say that.
// Settings lives behind the gear in the header — parent config, not a tab.
const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Chores", icon: ListChecks },
  { to: "/memories", label: "Memories", icon: Camera },
  { to: "/rewards", label: "Rewards", icon: JarIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { household } = useApp();
  const { role } = useHouseholdRole(household.id);
  const { goBack } = useBackNav();
  const settings = useSettings();

  // Viewers can't see the Rewards tab — they see jars on the home page.
  const visibleNav = useMemo(
    () => (role === "viewer" ? NAV.filter((n) => n.to !== "/rewards") : NAV),
    [role],
  );

  // Always start a newly-navigated page at the top. TanStack's built-in scroll
  // restoration handles back/forward, but new pushes on this app were landing
  // wherever the previous page had scrolled to.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  // Pull-to-refresh (mobile). Only engages when the page is at the very top
  // and the user drags down past PTR_THRESHOLD; releasing triggers reload.
  const ptrStart = useRef<number | null>(null);
  const [ptrPull, setPtrPull] = useState(0);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const PTR_THRESHOLD = 70;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) {
        ptrStart.current = null;
        return;
      }
      ptrStart.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (ptrStart.current == null) return;
      const dy = e.touches[0].clientY - ptrStart.current;
      if (dy > 0 && window.scrollY <= 0) {
        // Rubber-band: dampen past threshold
        const pull = Math.min(dy, 140);
        setPtrPull(pull);
      } else {
        setPtrPull(0);
      }
    };
    const onTouchEnd = () => {
      if (ptrPull >= PTR_THRESHOLD) {
        setPtrRefreshing(true);
        setPtrPull(60);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setPtrPull(0);
      }
      ptrStart.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [ptrPull]);

  // Chrome-free routes: marketing page + auth pages.
  const CHROME_FREE = [
    "/welcome",
    "/sign-in",
    "/sign-up",
    "/reset-password",
    "/join",
    "/onboarding",
    "/welcome-back",
    "/about",
    "/faq",
    "/blog",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
    "/k", // public read-only Kids' view share link — no app nav/sidebar
    "/visit", // a visiting friend's report, opened by their parent
  ];
  if (CHROME_FREE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  // Kids' view locks the whole app to a read-only progress screen (parent exits
  // with a PIN). It wins over every in-app route and all chrome.
  if (settings.kidsViewActive) {
    return <KidView />;
  }

  // Sub-pages (settings, about, legal, onboarding…) get a back chevron in the
  // mobile header instead of the logo — a PWA shell has no browser back button.
  const showBack = !isRootTab(pathname);

  return (
    <div className="min-h-screen pp-app-pad md:pl-64">
      {/* Pull-to-refresh indicator (mobile). Sits above the header, only
          visible while pulling or refreshing. */}
      {(ptrPull > 0 || ptrRefreshing) && (
        <div
          className="md:hidden fixed inset-x-0 top-0 z-40 flex items-start justify-center pointer-events-none"
          style={{ transform: `translateY(${Math.min(ptrPull, 80)}px)` }}
          aria-hidden="true"
        >
          <div
            className={`mt-2 h-8 w-8 rounded-full border-2 border-ink/20 border-t-ink ${
              ptrRefreshing || ptrPull >= PTR_THRESHOLD ? "animate-spin" : ""
            }`}
            style={{
              opacity: Math.min(1, ptrPull / PTR_THRESHOLD),
            }}
          />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-border/70 bg-card/55 backdrop-blur-xl px-5 py-7 z-30">
        <Link to="/" className="block px-2" aria-label="PointPals home">
          <Wordmark className="text-[2rem]" />
        </Link>
        <div className="mt-2 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground truncate">
          {household.name}
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`tap flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-[0.95rem] font-semibold transition ${
                  active
                    ? "bg-cta text-white shadow-clay-sm"
                    : "text-ink-soft hover:bg-muted hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <GoalChip variant="card" className="mt-8" />
        {role !== "viewer" && (
          <div className="mt-auto space-y-1 pt-6">
            <Link
              to="/settings"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={`tap flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition ${
                pathname.startsWith("/settings")
                  ? "bg-cta text-white"
                  : "text-ink-soft hover:bg-muted hover:text-ink"
              }`}
            >
              <Settings className="h-4 w-4" aria-hidden />
              <span>Settings</span>
            </Link>
            <SignOutButton className="tap flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" />
          </div>
        )}
      </aside>

      <header className="md:hidden max-w-4xl mx-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between gap-3">
          {showBack ? (
            <button
              onClick={goBack}
              className="md:hidden tap -ml-1 inline-flex min-h-11 items-center gap-0.5 rounded-full bg-card/80 pl-2 pr-4 text-sm font-semibold text-ink shadow-clay-sm"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
              Back
            </button>
          ) : (
            <Link to="/" className="block md:hidden min-w-0" aria-label="PointPals home">
              <Wordmark className="text-[1.4rem]" />
              <div className="mt-1 max-w-[11rem] text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate">
                {household.name}
              </div>
            </Link>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <GoalChip className="md:hidden w-[9.5rem]" />
            {role !== "viewer" && (
              <Link
                to="/settings"
                aria-label="Settings"
                className={`tap md:hidden h-11 w-11 shrink-0 rounded-full flex items-center justify-center shadow-clay-sm transition ${
                  pathname.startsWith("/settings")
                    ? "bg-cta text-white"
                    : "bg-card/90 text-ink-soft hover:text-ink"
                }`}
              >
                <Settings className="w-5 h-5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 md:pt-10">{children}</main>

      {/* Mobile bottom nav — a floating glass pill, clear of the home bar. */}
      <nav
        aria-label="Main"
        className="pp-bottom-nav md:hidden fixed inset-x-3 z-50 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] rounded-[1.75rem] border border-white/70 bg-card/85 shadow-lift backdrop-blur-xl"
      >
        <div className="flex items-stretch justify-around gap-1 p-1.5">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`tap flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[54px] rounded-[1.35rem] text-[11px] font-semibold transition-colors duration-300 ${
                  active ? "bg-cta text-white shadow-clay-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
