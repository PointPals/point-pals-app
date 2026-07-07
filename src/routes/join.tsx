import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import {
  CheckCircle,
  XCircle,
  Loader2,
  UserPlus,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { PublicLogo } from "@/components/PublicLogo";

const PENDING_CODE_KEY = "pointpals.pending.invite.code";

function GoogleSignInButton({ joinCode }: { joinCode: string }) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    // Stash the invite code so we can accept it after the OAuth redirect.
    if (joinCode) sessionStorage.setItem(PENDING_CODE_KEY, joinCode);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-full border border-input bg-card text-card-foreground font-semibold py-3 flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {busy ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}

export const Route = createFileRoute("/join")({
  component: JoinPage,
  validateSearch: (search: Record<string, unknown>): { code?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Join a household — PointPals" },
      { name: "description", content: "Accept an invite to join a PointPals household." },
    ],
  }),
});

type Flow = "enter-code" | "sign-up" | "sign-in";

function JoinPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const { refreshFromServer } = useApp();
  const [joinCode, setJoinCode] = useState(code ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [flow, setFlow] = useState<Flow>(code ? "sign-up" : "enter-code");

  // Sign-up fields
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpBusy, setSignUpBusy] = useState(false);
  const [signUpErr, setSignUpErr] = useState<string | null>(null);

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInErr, setSignInErr] = useState<string | null>(null);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Accept the invite (must be signed in) ──
  const accept = async (rawCode?: string) => {
    const raw = (rawCode ?? joinCode).trim().toUpperCase();
    if (!raw) return;
    setStatus("loading");
    setMessage("");

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setMessage("Please sign in or create an account first.");
      return;
    }

    const { data: result, error } = await supabase.rpc("accept_invite", {
      invite_code: raw,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const resultData = result as { ok?: boolean; error?: string } | null;
    if (resultData?.ok) {
      setStatus("success");
      setMessage("You've joined the household! Redirecting…");
      await refreshFromServer();
      setTimeout(() => navigate({ to: "/" }), 1500);
    } else {
      setStatus("error");
      setMessage(resultData?.error ?? "Could not accept invite. The code may be expired or invalid.");
    }
  };

  // ── Sign up (email + password) — no family name needed ──
  const onSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSignUpBusy(true);
    setSignUpErr(null);

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: { emailRedirectTo: `${window.location.origin}/join?code=${joinCode}` },
    });

    if (authErr) {
      setSignUpBusy(false);
      setSignUpErr(authErr.message);
      return;
    }

    // If email confirmation is required, tell them to check email
    if (!authData.session) {
      setSignUpBusy(false);
      setMessage("Check your email to confirm your account, then sign in and enter the code again.");
      setStatus("error");
      setFlow("sign-in");
      return;
    }

    // Signed in immediately — accept the invite
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      setSignUpBusy(false);
      setSignUpErr("Account created but couldn't get session. Please sign in.");
      setFlow("sign-in");
      return;
    }

    setSignUpBusy(false);
    setSignedIn(true);
    // Auto-accept
    await accept(joinCode);
  };

  // ── Sign in ──
  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSignInBusy(true);
    setSignInErr(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });

    if (error) {
      setSignInBusy(false);
      setSignInErr(error.message);
      return;
    }

    setSignInBusy(false);
    setSignedIn(true);
    await accept(joinCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PublicLogo fixed />
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="font-display text-3xl font-bold">Join a household</h1>
        <p className="text-sm text-muted-foreground">
          {flow === "enter-code"
            ? "Enter the invite code shared by the family to join their PointPals household."
            : flow === "sign-up"
              ? "Create an account to join. No family name needed — you'll be added as a viewer."
              : "Sign in to accept this invite."}
        </p>

        {/* ── Enter code ── */}
        {flow === "enter-code" && (
          <div className="card-soft p-5 space-y-4">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC12345"
              maxLength={8}
              className="w-full text-center text-2xl font-display font-bold tracking-[0.3em] bg-transparent border-b-2 border-border py-3 focus:outline-none focus:border-foreground uppercase"
              onKeyDown={(e) => e.key === "Enter" && accept()}
              autoFocus
            />

            <button
              onClick={() => accept()}
              disabled={status === "loading" || !joinCode.trim()}
              className="w-full rounded-full bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Joining…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Join household
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Sign-up form (inline — no family name) ── */}
        {flow === "sign-up" && (
          <div className="card-soft p-5 space-y-4">
            {joinCode && (
              <div className="text-xs text-muted-foreground mb-1">
                Joining with code: <strong className="tracking-wider">{joinCode}</strong>
              </div>
            )}

            <form onSubmit={onSignUp} className="space-y-3">
              <label className="block text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              {signUpErr && <p className="text-sm text-destructive">{signUpErr}</p>}

              <button
                type="submit"
                disabled={signUpBusy}
                className="w-full rounded-full bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signUpBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Create account &amp; join
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-2">
              <span className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">or</span>
              <span className="flex-1 h-px bg-border" />
            </div>

            <GoogleSignInButton joinCode={joinCode} />

            <div className="text-xs text-muted-foreground space-y-2 pt-2">
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setFlow("sign-in")}
                  className="font-semibold text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Sign in
                </button>
              </p>
              <button
                onClick={() => setFlow("enter-code")}
                className="inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition"
              >
                <ArrowLeft className="w-3 h-3" /> Enter a different code
              </button>
            </div>
          </div>
        )}

        {/* ── Sign-in form ── */}
        {flow === "sign-in" && (
          <div className="card-soft p-5 space-y-4">
            {joinCode && (
              <div className="text-xs text-muted-foreground mb-1">
                Accepting code: <strong className="tracking-wider">{joinCode}</strong>
              </div>
            )}

            <form onSubmit={onSignIn} className="space-y-3">
              <label className="block text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
                <input
                  type="password"
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              {signInErr && <p className="text-sm text-destructive">{signInErr}</p>}

              <button
                type="submit"
                disabled={signInBusy}
                className="w-full rounded-full bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signInBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Sign in &amp; join
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-2">
              <span className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">or</span>
              <span className="flex-1 h-px bg-border" />
            </div>

            <GoogleSignInButton joinCode={joinCode} />

            <div className="text-xs text-muted-foreground space-y-2 pt-2">
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setFlow("sign-up")}
                  className="font-semibold text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Create one
                </button>
              </p>
              <button
                onClick={() => setFlow("enter-code")}
                className="inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition"
              >
                <ArrowLeft className="w-3 h-3" /> Enter a different code
              </button>
            </div>
          </div>
        )}

        {/* ── Status messages ── */}
        {status === "success" && (
          <div className="flex items-center justify-center gap-2 text-sage-foreground">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{message}</span>
          </div>
        )}

        {status === "error" && message && !signUpErr && (
          <div className="flex items-center justify-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
