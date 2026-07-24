import { useEffect, useState } from "react";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { BILLING_CONFIG, formatPrice, isSubscribed, trialDaysLeft } from "@/lib/entitlements";
import { startCheckout, openPortal } from "@/lib/billing";
import { isNativePlatform } from "@/lib/platform";

// The upgrade prompt (§5). IMPORTANT: only ever rendered on parent-facing
// screens (Settings/Library/Admin) — never on a kid-facing award screen. A kid
// tapping their avatar must never hit an upgrade wall.
export function Paywall({ reason }: { reason?: string }) {
  const { household, setSubscriptionStatus, refreshFromServer } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // On native, purchasing goes through the store (StoreKit/Play Billing via
  // RevenueCat). We must not show Stripe branding or our own web price there —
  // the store paywall provides the real, store-approved price.
  const [native, setNative] = useState(false);
  useEffect(() => {
    void isNativePlatform().then(setNative);
  }, []);
  const subscribed = isSubscribed(household);
  const daysLeft = trialDaysLeft(household);

  const go = async () => {
    setBusy(true);
    setErr(null);
    const res = await startCheckout(household.id);
    if (res.url) {
      // Web: hand off to Stripe Checkout.
      window.location.href = res.url;
      return;
    }
    if (res.native) {
      // Native: the RevenueCat Paywall already ran in-app.
      if (res.activated) {
        await refreshFromServer();
      } else if (res.error) {
        setErr(res.error);
      }
      setBusy(false);
      return;
    }
    // In this environment Stripe/Supabase aren't reachable; fall back to a local
    // simulated activation so the gated UI can be exercised end-to-end.
    setErr(
      res.error
        ? `${res.error} — simulating activation locally for now.`
        : "Billing backend not connected — simulating activation locally.",
    );
    setSubscriptionStatus("active");
    setBusy(false);
  };

  const manage = async () => {
    setBusy(true);
    setErr(null);
    const res = await openPortal(household.id);
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    if (res.native) {
      // Native: RevenueCat Customer Center was presented (or reported an error).
      if (res.error) setErr(res.error);
      setBusy(false);
      return;
    }
    setErr(res.error ?? "Customer Portal not connected in this environment.");
    setBusy(false);
  };

  if (subscribed) {
    const isTrialing = household.subscriptionStatus === "trialing";

    if (isTrialing) {
      return (
        <div className="card-soft p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-butter/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
              Free trial
            </span>
            {daysLeft != null && (
              <span className="text-sm text-muted-foreground">{daysLeft} days left</span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re still on your free trial — no payment needed yet. When you&apos;re ready to
            keep the habits going, confirm your purchase below.
          </p>
          <button
            onClick={go}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Confirm purchase
          </button>
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        </div>
      );
    }

    return (
      <div className="card-soft p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
            Active
          </span>
          {daysLeft != null && (
            <span className="text-sm text-muted-foreground">{daysLeft} days left</span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {native
            ? "Thanks for supporting PointPals. Manage or cancel your subscription anytime from your store account."
            : "Thanks for supporting PointPals. Manage your card, invoices or cancel anytime through the secure Stripe portal."}
        </p>
        <button
          onClick={manage}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Manage subscription
        </button>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--pastel-butter) 55%, white), color-mix(in oklab, var(--pastel-lilac) 45%, white))",
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground/60">
        <Sparkles className="h-3.5 w-3.5" /> PointPals Plus
      </div>
      <h3 className="mt-2 font-display text-2xl font-bold">Your free trial has ended</h3>
      <p className="mt-1 text-sm text-foreground/70 max-w-md">
        {reason ??
          "Subscribe to keep awarding points, filling the marble jar and unlocking rewards. Your subscription keeps the app's generation and hosting running."}
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        {/* Store policy: don't show our own web price on native — the store
            paywall shows the real, store-approved price. */}
        {!native && <span className="font-display text-3xl font-bold">{formatPrice()}</span>}
        <span className="text-sm text-foreground/60">{native ? "" : "billed monthly"}</span>
      </div>
      <button
        onClick={go}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Subscribe to continue
      </button>
      <p className="mt-3 text-xs text-foreground/50">
        {native
          ? "Cancel anytime from your store account."
          : `Secure checkout by Stripe · cancel anytime · prices in ${BILLING_CONFIG.primaryCurrency}.`}
      </p>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
