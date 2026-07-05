import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";
import { CheckCircle, XCircle, Loader2, LogIn, UserPlus } from "lucide-react";

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

function JoinPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const { refreshFromServer } = useApp();
  const [joinCode, setJoinCode] = useState(code ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);

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

  const accept = async () => {
    const raw = joinCode.trim().toUpperCase();
    if (!raw) return;
    setStatus("loading");
    setMessage("");

    // Check auth first
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setMessage("Please sign in or create an account first, then enter this code again.");
      setSignedIn(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="font-display text-3xl font-bold">Join a household</h1>
        <p className="text-sm text-muted-foreground">
          Enter the invite code shared by the family to join their PointPals household.
        </p>

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
            onClick={accept}
            disabled={status === "loading" || !joinCode.trim()}
            className="w-full rounded-full bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Joining…
              </>
            ) : signedIn ? (
              <>
                <UserPlus className="w-4 h-4" /> Join household
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign in first
              </>
            )}
          </button>
        </div>

        {status === "success" && (
          <div className="flex items-center justify-center gap-2 text-sage-foreground">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{message}</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center justify-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{message}</span>
          </div>
        )}

        {!signedIn && status !== "success" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              You need an account to join a household.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => navigate({ to: "/sign-in" })}
                className="tap rounded-full border border-input px-5 py-2 text-sm font-semibold hover:bg-muted transition"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate({ to: "/sign-up" })}
                className="tap rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold"
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
