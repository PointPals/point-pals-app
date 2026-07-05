import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  component: () => <Outlet />,
});