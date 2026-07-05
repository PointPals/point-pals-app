import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";

export const Route = createFileRoute("/welcome-back")({
  component: WelcomeBackPage,
  head: () => ({
    meta: [
      { title: "Welcome back — PointPals" },
      {
        name: "description",
        content: "Create a new family or join an existing one with an invite code.",
      },
    ],
  }),
});

// Shown to a signed-in user who isn't a member of any household yet — either
// straight after sign-up, or after their invite was revoked. Two clear paths:
// create your own family, or join one with a code from another parent.
function WelcomeBackPage() {
  const navigate = useNavigate();
  const { refreshFromServer } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const createFamily = async () => {
    const trimmed = name.trim() || "My Family";
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("households").insert({ name: trimmed });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    // Trigger already added us as admin — reload the app-store from the server.
    await refreshFromServer();
    setBusy(false);
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Welcome to PointPals</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your family, or join one you've been invited to.
          </p>
        </div>

        <div className="card-soft p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Start a new family
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Family name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Rivers Family"
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
            />
          </label>
          <button
            onClick={createFamily}
            disabled={busy}
            className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create family
          </button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <div className="card-soft p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Join with an invite code
          </div>
          <p className="text-xs text-muted-foreground">
            If a parent, grandparent, or caregiver sent you a code, enter it on the join page.
          </p>
          <button
            onClick={() => navigate({ to: "/join" })}
            className="w-full rounded-full border border-input bg-card font-semibold py-3 hover:bg-muted transition"
          >
            Enter invite code
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/welcome" });
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
