import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/SplashScreen";
import { useApp } from "@/lib/app-store";

// Pathless layout that gates every child route on a live Supabase session.
// ssr:false because Supabase persists the session in localStorage — the
// server can't read it, so gating server-side would loop-redirect on refresh.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/welcome" });
    }
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { household, hydrated, loading, needsHousehold } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Route guards (§5): redirect based on account state.
  // We wait for hydration so the guards don't fire before bootLive loads
  // the household data.
  useEffect(() => {
    if (!hydrated) return;
    if (needsHousehold) {
      navigate({ to: "/welcome-back" });
    } else if (household.subscriptionStatus === "free") {
      navigate({ to: "/settings" });
    }
  }, [needsHousehold, household.subscriptionStatus, hydrated, navigate]);

  // Allow household-requiring routes (/welcome-back, /join, /settings) to
  // render even when needsHousehold is true. Only block if we're on a route
  // that actually needs a household (like the dashboard).
  const safeWithoutHousehold = pathname === "/welcome-back" || pathname === "/join" || pathname === "/settings";

  if (loading || !hydrated) {
    return <SplashScreen />;
  }

  // If we need a household and aren't on a safe route, show splash while the
  // useEffect redirect takes effect
  if (needsHousehold && !safeWithoutHousehold) {
    return <SplashScreen />;
  }

  if (household.subscriptionStatus === "free" && pathname !== "/settings") {
    return <SplashScreen />;
  }

  return <Outlet />;
}