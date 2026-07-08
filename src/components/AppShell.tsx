import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { Home, Star, Camera, Settings, ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { useBackNav, isRootTab, pageTitle } from "@/lib/navigation";
import { LOGO_POINTS_URL } from "@/lib/image-urls";
const logoUrl = LOGO_POINTS_URL;

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

// Bottom nav = the app's four screens (§6): Home, Library, Memories, Rewards.
// Settings lives behind the gear in the header — parent config, not a tab.
const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Points", icon: Star },
  { to: "/memories", label: "Memories", icon: Camera },
  { to: "/rewards", label: "Rewards", icon: JarIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { household } = useApp();
  const { activeReward } = useCorrection();
  const { role } = useHouseholdRole(household.id);
  const { goBack } = useBackNav();

  // Viewers can't see the Rewards tab — they see jars on the home page.
  const visibleNav = useMemo(
    () => (role === "viewer" ? NAV.filter((n) => n.to !== "/rewards") : NAV),
    [role],
  );
  const pct = Math.min(100, (household.sharedPool / household.rewardTarget) * 100);

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
    "/about",
    "/faq",
    "/blog",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
  ];
  if (CHROME_FREE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  // Sub-pages (settings, about, legal, onboarding…) get a back chevron in the
  // mobile header instead of the logo — a PWA shell has no browser back button.
  const showBack = !isRootTab(pathname);

  return (
    <div className="min-h-screen pp-app-pad md:pl-56">
      {/* Pull-to-refresh indicator (mobile). Sits above the header, only
          visible while pulling or refreshing. */}
      {(ptrPull > 0 || ptrRefreshing) && (
        <div
          className="md:hidden fixed inset-x-0 top-0 z-40 flex items-start justify-center pointer-events-none"
          style={{ transform: `translateY(${Math.min(ptrPull, 80)}px)` }}
          aria-hidden="true"
        >
          <div
            className={`mt-2 h-8 w-8 rounded-full border-2 border-foreground/30 border-t-foreground ${
              ptrRefreshing || ptrPull >= PTR_THRESHOLD ? "animate-spin" : ""
            }`}
            style={{
              opacity: Math.min(1, ptrPull / PTR_THRESHOLD),
            }}
          />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r border-border bg-card/60 backdrop-blur px-4 py-6 z-30">
        <Link to="/" className="block mb-6">
          <img
            src={logoUrl}
            alt="PointPals logo"
            width={180}
            height={72}
            className="h-10 w-auto select-none"
            draggable={false}
          />
        </Link>
        <nav className="flex flex-col gap-1">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Link
            to="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
              pathname.startsWith("/settings")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      <header className="max-w-4xl mx-auto px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          {showBack ? (
            <button
              onClick={goBack}
              className="md:hidden tap flex items-center gap-1 -ml-1 text-foreground"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-display text-xl font-bold">{pageTitle(pathname)}</span>
            </button>
          ) : (
            <Link to="/" className="block md:hidden">
              <img
                src={logoUrl}
                alt="PointPals logo"
                width={200}
                height={80}
                className="h-12 sm:h-14 w-auto select-none"
                draggable={false}
              />
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">
                {household.name}
              </div>
            </Link>
          )}
          <div className="hidden md:block">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {household.name}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Reward name lives on the small label line (truncated) so the
                jar count always stays visible — on mobile a long prize title
                used to swallow the numbers entirely. */}
            <div className="text-right min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate max-w-[140px] sm:max-w-[220px] ml-auto">
                {activeReward ? activeReward.name : "Family pool"}
              </div>
              <div className="font-display text-2xl font-bold leading-none mt-1 whitespace-nowrap">
                {household.sharedPool}
                <span className="text-muted-foreground text-base font-sans font-normal">
                  {" "}
                  / {activeReward ? activeReward.targetPoints : household.rewardTarget}
                </span>
              </div>
            </div>
            <Link
              to="/settings"
              aria-label="Settings"
              className={`tap md:hidden h-11 w-11 rounded-full border border-border flex items-center justify-center transition ${
                pathname.startsWith("/settings")
                  ? "bg-foreground text-background"
                  : "bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--pastel-butter), var(--pastel-blush), var(--pastel-lilac))",
            }}
          />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5">{children}</main>

      <nav className="pp-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around px-2 pt-1.5 pb-1">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`tap flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl text-[11px] font-semibold transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? "" : "opacity-80"}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
