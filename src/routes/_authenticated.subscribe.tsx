// Subscribe / checkout landing page (§5).
// CTA links from the trial-ending email land here and auto-redirect to Stripe
// Checkout. If the household is already subscribed, redirect to settings.
// If checkout fails, show a fallback that links to the settings Paywall.

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { isSubscribed } from "@/lib/entitlements";
import { startCheckout } from "@/lib/billing";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function SubscribePage() {
  const { household, refreshFromServer } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!household) {
      // Not authenticated yet — redirect to sign in
      navigate({ to: "/sign-in", search: { redirect: "/subscribe" } });
      return;
    }

    if (isSubscribed(household)) {
      // Already subscribed or still trialing — send to settings
      navigate({ to: "/settings" });
      return;
    }

    // Start checkout — Stripe redirect on web, RevenueCat Paywall on native.
    setStatus("redirecting");
    startCheckout(household.id).then((res) => {
      if (res.url) {
        // Web: hand off to Stripe.
        window.location.href = res.url;
        return;
      }
      if (res.native) {
        // Native: the Paywall already ran in-app. On success refresh household
        // state (the RevenueCat webhook also persists it) and land in settings.
        if (res.activated) {
          void refreshFromServer();
          navigate({ to: "/settings" });
        } else {
          setStatus("error");
          setErrorMsg(res.error ?? "Purchase cancelled.");
        }
        return;
      }
      setStatus("error");
      setErrorMsg(res.error ?? "Something went wrong. Please try again.");
    });
  }, [household, navigate, refreshFromServer]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-foreground/70" />
          <h1 className="mt-6 font-display text-2xl font-bold">Taking you to secure checkout...</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You'll be redirected to Stripe to complete your subscription.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-6 font-display text-2xl font-bold">Checkout unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
          >
            Try again from Settings
          </Link>
          <Link to="/" className="text-sm text-muted-foreground underline hover:text-foreground">
            Back to PointPals
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/subscribe")({
  component: SubscribePage,
  head: () => ({
    meta: [{ title: "Subscribe - PointPals" }],
  }),
});
