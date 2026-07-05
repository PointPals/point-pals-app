import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Library, Camera, Gift, Settings } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { url as logoUrl } from "@/assets/brand/pointpals-logo-points.asset.json";

// Bottom nav = the app's four screens (§6): Home, Library, Memories, Rewards.
// Settings lives behind the gear in the header — parent config, not a tab.
const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/memories", label: "Memories", icon: Camera },
  { to: "/rewards", label: "Rewards", icon: Gift },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { household } = useApp();
  const pct = Math.min(100, (household.sharedPool / household.rewardTarget) * 100);

  // The public marketing page (§8) is chrome-free: no household header, no
  // bottom nav — it isn't part of the authenticated in-app experience.
  if (pathname.startsWith("/welcome")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="max-w-4xl mx-auto px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="block">
            <img
              src={logoUrl}
              alt="PointPals"
              width={200}
              height={80}
              className="h-12 sm:h-14 w-auto select-none"
              draggable={false}
            />
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1">
              {household.name}
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Family pool
              </div>
              <div className="font-display text-2xl font-bold leading-none mt-1">
                {household.sharedPool}
                <span className="text-muted-foreground text-base font-sans font-normal">
                  {" "}
                  / {household.rewardTarget}
                </span>
              </div>
            </div>
            <Link
              to="/settings"
              aria-label="Settings"
              className={`h-10 w-10 rounded-full border border-border flex items-center justify-center transition ${
                pathname.startsWith("/settings")
                  ? "bg-foreground text-background"
                  : "bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
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

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 rounded-full bg-card/95 backdrop-blur border border-border shadow-[0_10px_30px_-8px_rgba(120,110,90,0.25)] p-1.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
