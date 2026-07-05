import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Library, Sparkles, Gift, Settings } from "lucide-react";
import { useApp } from "@/lib/app-store";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/collection", label: "Collection", icon: Sparkles },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { household } = useApp();
  const pct = Math.min(100, (household.sharedPool / household.rewardTarget) * 100);

  return (
    <div className="min-h-screen pb-24">
      <header className="max-w-4xl mx-auto px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="block">
            <div className="text-3xl font-display font-extrabold tracking-tight text-foreground">
              PointPals
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
              {household.name}
            </div>
          </Link>
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
