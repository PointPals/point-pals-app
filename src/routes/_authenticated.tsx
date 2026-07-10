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

  // Allow household-requiring routes (/welcome-back, /join, /settings) to
  // render even when needsHousehold is true. Only block if we're on a route
  // that actually needs a household (like the dashboard). Settings is here so
  // free/trial users can always reach account controls and invites.
  const safeWithoutHousehold = pathname === "/welcome-back" || pathname === "/join" || pathname === "/settings";

  // Route guards (§5): redirect based on account state.
  // Free users are no longer redirected — they can browse read-only while
  // award-points, marble-jar and rewards are gated behind the subscription.
  // Don't redirect away from the safe-without-household routes above.
  useEffect(() => {
    if (!hydrated) return;
    if (needsHousehold && !safeWithoutHousehold) {
      navigate({ to: "/welcome-back" });
    }
  }, [needsHousehold, hydrated, navigate, safeWithoutHousehold]);

  if (loading || !hydrated) {
    return <SplashScreen />;
  }

  // If we need a household and aren't on a safe route, show splash while the
  // useEffect redirect takes effect
  if (needsHousehold && !safeWithoutHousehold) {
    return <SplashScreen />;
  }

  // Free users see all routes (features are gated per-component, not per-route).
  return <Outlet />;
}