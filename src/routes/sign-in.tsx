import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import { PublicLogo } from "@/components/PublicLogo";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
  head: () => ({
    meta: [
      { title: "Log in — PointPals" },
      { name: "description", content: "Log in to your PointPals family account." },
    ],
  }),
});

function SignInPage() {
  const navigate = useNavigate();
  const { refreshFromServer } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    // Wait for the app-store to load the household bundle before navigating,
    // so the dashboard doesn't render a flash of seeded demo state first.
    await refreshFromServer();
    setBusy(false);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PublicLogo fixed />
      <div className="card-soft p-6 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Log in</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
            />
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/reset-password" className="text-muted-foreground hover:text-foreground underline">
            Forgot password?
          </Link>
          <Link to="/sign-up" className="text-muted-foreground hover:text-foreground">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}