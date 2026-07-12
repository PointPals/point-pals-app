import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendTrialWelcome } from "@/lib/emails.functions";
import { useApp } from "@/lib/app-store";
import { PublicLogo } from "@/components/PublicLogo";

function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setErr(null);
    // On success signInWithOAuth performs a full-page redirect to Google, so
    // control never returns here. If it returns with an error, the flow never
    // started (e.g. the Google provider is disabled in Supabase, or this
    // origin isn't in the allowed Redirect URLs) — surface it and re-enable
    // the button instead of leaving it stuck on "Redirecting…".
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Trailing slash so the URL matches the Supabase "https://…/**" redirect
      // allowlist; a bare origin is rejected and silently falls back to the
      // Site URL, which is what caused the post-OAuth redirect loop.
      options: { redirectTo: window.location.origin + "/" },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
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
        {busy ? "Redirecting..." : "Sign up with Google"}
      </button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Sign up — PointPals" },
      { name: "description", content: "Create your PointPals family account." },
    ],
  }),
});

function SignUpPage() {
  const navigate = useNavigate();
  const { refreshFromServer } = useApp();
  const [name, setName] = useState("");

  // After Google OAuth popup, the user is authenticated but still on this
  // page with a dangling # in the URL.  Redirect to onboarding/home.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate({ to: "/onboarding" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) navigate({ to: "/onboarding" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [foundingTester, setFoundingTester] = useState(false);
  const [testerFull, setTesterFull] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    if (!data.session) {
      setBusy(false);
      setInfo("Check your email to confirm your account, then log in.");
      return;
    }
    // Capture Etsy / campaign source from URL param (?source=etsy)
    const sourceParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("source") || undefined
        : undefined;

    // Cap founding testers at 50 so not everyone becomes a free user.
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
        setInfo("Founding member spots are full — but you're all set to get started!");
      }
    }

    // Build the household insert, optionally tagging as a founding tester.
    const hhPayload: Record<string, unknown> = { name: name || "My Family" };
    if (sourceParam) hhPayload.attribution_source = sourceParam;
    if (canBeTester) hhPayload.founding_tester = true;

    // Create the household — trigger adds the current user as admin member.
    const { error: hhErr } = await supabase
      .from("households")
      .insert(hhPayload);
    setBusy(false);
    if (hhErr) {
      setErr(hhErr.message);
      return;
    }
    // Reload the app-store from the server so the new household + membership
    // land in state before the onboarding wizard mutates it.
    await refreshFromServer();
    // Fire-and-forget trial-welcome email (template 01).
    sendTrialWelcome().catch((e) => console.error("[signup] welcome email failed:", e));
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PublicLogo fixed />
      <div className="card-soft p-6 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Get started with your family</h1>
        <p className="text-sm text-muted-foreground mt-1">Add your kids and start filling the jar together.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Family name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Harper Family"
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
            />
          </label>
          <label className="flex items-start gap-3 mt-3">
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
                  to test new features and fill in feedback forms to help shape PointPals.
                </>
              )}
            </span>
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          <div className="flex items-center gap-3 my-4">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">or</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <GoogleSignInButton />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="mt-4 text-sm text-center">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/sign-in" className="font-semibold hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}