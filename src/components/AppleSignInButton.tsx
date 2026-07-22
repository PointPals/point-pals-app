import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sign in with Apple. Apple's App Store guidelines require this option to be
 * offered wherever a third-party login (Google) is offered, so it lives beside
 * the Google button on the sign-in and sign-up pages. Mirrors the Google
 * button's flow: full-page OAuth redirect on success; surface the error and
 * re-enable on failure (e.g. the Apple provider isn't enabled in Supabase yet).
 */
export function AppleSignInButton({ label = "Continue with Apple" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      // Trailing slash so the URL matches the Supabase "https://…/**" redirect
      // allowlist (same reason as the Google button).
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
        className="w-full rounded-full bg-black text-white font-semibold py-3 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.99-.76.86-1.99 1.52-3.02 1.44-.13-1.1.44-2.27 1.09-3 .74-.83 2.02-1.44 3.05-1.43zM20.5 17.06c-.55 1.27-.81 1.83-1.52 2.95-.99 1.56-2.39 3.5-4.12 3.52-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.01-3.05-1.76-4.04-3.31-2.77-4.34-3.06-9.42-1.35-12.12.85-1.35 2.19-2.2 3.44-2.2 1.28 0 2.08.85 3.13.85 1.02 0 1.64-.85 3.12-.85 1.11 0 2.29.6 3.13 1.64-2.75 1.51-2.31 5.44.66 6.62z" />
        </svg>
        {busy ? "Redirecting..." : label}
      </button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
