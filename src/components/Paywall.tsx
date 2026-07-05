import { useState } from "react";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { BILLING_CONFIG, formatPrice, isSubscribed, trialDaysLeft } from "@/lib/entitlements";
import { startCheckout, openPortal } from "@/lib/billing";

// The upgrade prompt (§5). IMPORTANT: only ever rendered on parent-facing
// screens (Settings/Library/Admin) — never on a kid-facing award screen. A kid
// tapping their avatar must never hit an upgrade wall.
export function Paywall({ reason }: { reason?: string }) {
  const { household, setSubscriptionStatus } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const subscribed = isSubscribed(household);
  const daysLeft = trialDaysLeft(household);

  const go = async () => {
    setBusy(true);
    setErr(null);
    // "harper" is a placeholder household id until auth/households are wired.
    const res = await startCheckout("household_local");
    if (res.url) {
      window.location.href = res.url;
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
    const res = await openPortal("household_local");
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setErr(res.error ?? "Customer Portal not connected in this environment.");
    setBusy(false);
  };

  if (subscribed) {
    return (
      <div className="card-soft p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
            {household.subscriptionStatus === "trialing" ? "Free trial" : "Active"}
          </span>
          {daysLeft != null && (
            <span className="text-sm text-muted-foreground">{daysLeft} days left</span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for supporting PointPals. Manage your card, invoices or cancel anytime through the
          secure Stripe portal.
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
      <h3 className="mt-2 font-display text-2xl font-bold">Keep the habits growing</h3>
      <p className="mt-1 text-sm text-foreground/70 max-w-md">
        {reason ??
          "Unlock custom AI icon generation, unlimited kids and the full weekly recap. Your subscription keeps the app's generation and hosting running."}
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold">{formatPrice()}</span>
        <span className="text-sm text-foreground/60">
          after a {BILLING_CONFIG.trialDays}-day free trial
        </span>
      </div>
      <button
        onClick={go}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Start free trial
      </button>
      <p className="mt-3 text-xs text-foreground/50">
        Secure checkout by Stripe · cancel anytime · prices in {BILLING_CONFIG.primaryCurrency}.
      </p>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
