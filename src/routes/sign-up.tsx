import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendTrialWelcome } from "@/lib/emails.functions";
import { useApp } from "@/lib/app-store";
import { PublicLogo } from "@/components/PublicLogo";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
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
    // Create the household — trigger adds the current user as admin member.
    const { error: hhErr } = await supabase
      .from("households")
      .insert({ name: name || "My Family" });
    setBusy(false);
    if (hhErr) {
      setErr(hhErr.message);
      return;
    }
    // Reload the app-store from the server so the new household + membership
    // land in state before the onboarding wizard mutates it.
    await refreshFromServer();
    // Fire-and-forget trial-welcome email (template 01).
    sendTrialWelcome().catch(() => {});
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PublicLogo fixed />
      <div className="card-soft p-6 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Start free trial</h1>
        <p className="text-sm text-muted-foreground mt-1">14 days free — no card required.</p>
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
          {err && <p className="text-sm text-destructive">{err}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
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