// RevenueCat webhook — syncs NATIVE (iOS/Android) subscription lifecycle back
// to Supabase, mirroring stripe-webhook (which does the same for web/Stripe).
// Uses the service-role key so it can write the billing-critical columns RLS
// blocks clients from touching.
//
// The client configures RevenueCat with the household id as the "app user id"
// (see src/lib/revenuecat.ts), so `event.app_user_id` IS the household id — one
// subscription unlocks the whole household.
//
// Deploy: `supabase functions deploy revenuecat-webhook --no-verify-jwt`
//   (RevenueCat authenticates with a shared Authorization header we check
//    ourselves, so the platform JWT check must be OFF for this function.)
// Secrets: REVENUECAT_WEBHOOK_AUTH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// In RevenueCat → Project → Integrations → Webhooks, set the URL to
//   https://<ref>.supabase.co/functions/v1/revenuecat-webhook
// and the Authorization header to the same value as REVENUECAT_WEBHOOK_AUTH.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";

// Our app's narrower status enum (matches Household.subscriptionStatus).
type Status = "trialing" | "active" | "past_due" | "canceled" | "free";

type RCEvent = {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  period_type?: string; // "TRIAL" | "NORMAL" | "INTRO" | "PROMOTIONAL"
  expiration_at_ms?: number;
};

// Map a RevenueCat event to our status. RevenueCat's CANCELLATION means
// auto-renew was turned off but the user stays entitled until EXPIRATION, so we
// only downgrade on EXPIRATION / billing failure — not on CANCELLATION.
function statusFor(ev: RCEvent): Status | null {
  switch (ev.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE": // e.g. lifetime
      return ev.period_type === "TRIAL" ? "trialing" : "active";
    case "BILLING_ISSUE":
      return "past_due";
    case "SUBSCRIPTION_PAUSED":
    case "EXPIRATION":
      return "free";
    // CANCELLATION / TRANSFER / TEST etc: no status change here.
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  // Shared-secret auth (RevenueCat sends the header you configured).
  const auth = req.headers.get("Authorization") ?? "";
  if (!expectedAuth || auth !== expectedAuth) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { event?: RCEvent };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const ev = body.event;
  if (!ev) return new Response("No event", { status: 400 });

  const householdId = ev.app_user_id ?? ev.original_app_user_id;
  if (!householdId) {
    // Anonymous / not yet identified — nothing to reconcile.
    return new Response(JSON.stringify({ ok: true, skipped: "no app_user_id" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const status = statusFor(ev);
  if (!status) {
    return new Response(JSON.stringify({ ok: true, skipped: ev.type }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await admin
    .from("households")
    .update({ subscription_status: status })
    .eq("id", householdId);

  if (error) {
    console.error(`[revenuecat-webhook] update failed for ${householdId}:`, error.message);
    return new Response(`DB error: ${error.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, householdId, status, event: ev.type }), {
    headers: { "Content-Type": "application/json" },
  });
});
