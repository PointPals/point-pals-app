import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import { AuthShell } from "@/components/public/AuthShell";

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
  const [consent, setConsent] = useState(false);

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
        setErr(
          (result as { error?: string })?.error ??
            "Could not accept invite. The code may be expired or invalid.",
        );
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
      <AuthShell peek={false} headerAction={<span />}>
        <div className="space-y-3 text-center" role="status">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-ink" />
          <p className="text-sm text-muted-foreground">Joining your family…</p>
        </div>
      </AuthShell>
    );
  }

  const createFamily = async () => {
    const trimmed = name.trim() || "My Family";

    setBusy(true);
    setErr(null);
    const payload: Record<string, unknown> = { name: trimmed };
    const { error } = await supabase.from("households").insert(payload);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/welcome" });
  };

  return (
    <AuthShell
      headline="Your family jar starts here."
      blurb="Set up a new family in under a minute, or join the one a partner, grandparent or caregiver already started."
      headerAction={
        <button
          type="button"
          onClick={signOut}
          className="min-h-11 inline-flex items-center text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Sign out
        </button>
      }
    >
      <h1 className="font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
        Welcome to PointPals
      </h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
        Start your own family, or join one you’ve been invited to.
      </p>

      <form
        className="card-soft auth-card mt-6 space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && consent) createFamily();
        }}
      >
        <h2 className="font-display text-xl font-semibold text-ink">Start a new family</h2>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Family name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Rivers Family"
            maxLength={60}
            autoComplete="off"
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base font-semibold text-ink placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            I confirm that I am the parent or legal guardian of the children whose information will
            be stored in this account.
          </span>
        </label>
        <button
          type="submit"
          disabled={busy || !consent}
          className="tap inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-3.5 text-base font-semibold text-white shadow-clay-sm transition disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          Create family
        </button>
        {err && (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        )}
      </form>

      <div className="mt-4 flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-ink">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Got an invite code?</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            From a parent, grandparent or caregiver.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/join" })}
          className="tap min-h-11 shrink-0 rounded-full border border-input bg-card px-4 text-sm font-semibold text-ink hover:bg-muted"
        >
          Join
        </button>
      </div>
    </AuthShell>
  );
}
