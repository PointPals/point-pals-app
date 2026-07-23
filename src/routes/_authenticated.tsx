import {
  createFileRoute,
  Outlet,
  redirect,
  isRedirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
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
    try {
      // Cap the auth check so a cold-start/offline native launch can't hang the
      // route forever (which renders as a blank white screen while beforeLoad
      // never resolves). If it times out or throws, we fall through to Welcome.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth-timeout")), 8000),
      );
      const { data, error } = await Promise.race([supabase.auth.getUser(), timeout]);
      if (error || !data.user) {
        throw redirect({ to: "/welcome" });
      }
      return { user: data.user };
    } catch (e) {
      // redirect() throws a control-flow object we must re-throw untouched.
      if (isRedirect(e)) throw e;
      // Any real failure (missing env, offline, hung/broken Supabase call) —
      // never hard-crash to the error boundary or hang on a blank splash; send
      // the user to the usable Welcome page instead.
      throw redirect({ to: "/welcome" });
    }
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