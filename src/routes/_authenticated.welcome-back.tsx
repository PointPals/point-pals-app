import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Users, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import { sendTrialWelcome } from "@/lib/emails.functions";

const PENDING_CODE_KEY = "pointpals.pending.invite.code";

export const Route = createFileRoute("/_authenticated/welcome-back")({
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
  const [accepting, setAccepting] = useState(false);
  const [foundingTester, setFoundingTester] = useState(false);
  const [testerFull, setTesterFull] = useState(false);

  // Auto-accept an invite code stashed by the join page's Google button.
  useEffect(() => {
    const pendingCode = sessionStorage.getItem(PENDING_CODE_KEY);
    if (!pendingCode) return;
    sessionStorage.removeItem(PENDING_CODE_KEY);

    const doAccept = async () => {
      setAccepting(true);
      const { data: result, error } = await supabase.rpc("accept_invite", {
        invite_code: pendingCode,
      });

      if (error || !(result as { ok?: boolean })?.ok) {
        setErr((result as { error?: string })?.error ?? "Could not accept invite. The code may be expired or invalid.");
        setAccepting(false);
        return;
      }

      await refreshFromServer();
      setAccepting(false);
      navigate({ to: "/" });
    };

    doAccept();
  }, []);

  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Accepting invite…</p>
        </div>
      </div>
    );
  }

  const createFamily = async () => {
    const trimmed = name.trim() || "My Family";

    // Cap founding testers at 50, same as the sign-up page.
    let canBeTester = foundingTester;
    if (foundingTester) {
      const { count } = await supabase
        .from("households")
        .select("*", { count: "exact", head: true })
        .eq("founding_tester", true);
      if (count != null && count >= 50) {
        canBeTester = false;
        setFoundingTester(false);
        setTesterFull(true);
      }
    }

    setBusy(true);
    setErr(null);
    const payload: Record<string, unknown> = { name: trimmed };
    if (canBeTester) payload.founding_tester = true;
    const { error } = await supabase.from("households").insert(payload);
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    // Trigger already added us as admin — reload the app-store from the server.
    // Fire welcome email (idempotent server-side).
    sendTrialWelcome().catch((e) => console.error("[welcome-back] welcome email failed:", e));
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
          <label className="flex items-start gap-3 mt-2">
            <input
              type="checkbox"
              checked={foundingTester}
              disabled={testerFull}
              onChange={(e) => setFoundingTester(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input accent-foreground disabled:opacity-40"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              {testerFull ? (
                "Founding member spots are full"
              ) : (
                <>
                  I&apos;d like to be a <strong>founding member</strong> &mdash; I&apos;m happy
                  to test new features and fill in feedback forms.
                </>
              )}
            </span>
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
