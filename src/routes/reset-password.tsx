import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLogo } from "@/components/PublicLogo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — PointPals" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) {
      setMode("update");
    }
  }, []);

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for the reset link.");
  };

  const updatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Password updated. You can now log in.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PublicLogo fixed />
      <div className="card-soft p-6 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">
          {mode === "update" ? "Set a new password" : "Reset password"}
        </h1>
        {mode === "request" ? (
          <form onSubmit={sendReset} className="mt-5 space-y-3">
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
            {err && <p className="text-sm text-destructive">{err}</p>}
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <form onSubmit={updatePassword} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</span>
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
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
        <div className="mt-4 text-sm text-center">
          <Link to="/sign-in" className="text-muted-foreground hover:text-foreground underline">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}