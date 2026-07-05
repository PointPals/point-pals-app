// Stripe webhook (§5) — syncs subscription lifecycle back to Supabase:
// renewed, failed payment, cancelled. Uses the service-role key so it can write
// the billing-critical columns that RLS blocks clients from touching.
//
// Deploy: `supabase functions deploy stripe-webhook --no-verify-jwt`
//   (Stripe signs the request; we verify the signature ourselves, so the
//    platform JWT check must be OFF for this one function.)
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY.
// Configure the endpoint in Stripe to send: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.payment_failed.

import Stripe from "https://esm.sh/stripe@16?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Map Stripe's status to our narrower app enum.
function mapStatus(s: string): string {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

async function updateByCustomer(customerId: string, patch: Record<string, unknown>) {
  await admin.from("households").update(patch).eq("stripe_customer_id", customerId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig ?? "", webhookSecret);
  } catch (e) {
    return new Response(`Webhook signature verification failed: ${e}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const householdId = s.metadata?.household_id ?? s.client_reference_id ?? undefined;
        if (householdId) {
          await admin
            .from("households")
            .update({
              stripe_customer_id: s.customer as string,
              stripe_subscription_id: (s.subscription as string) ?? null,
              subscription_status: s.mode === "payment" ? "active" : "trialing",
            })
            .eq("id", householdId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateByCustomer(sub.customer as string, {
          subscription_status: mapStatus(sub.status),
          stripe_subscription_id: sub.id,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await updateByCustomer(inv.customer as string, { subscription_status: "past_due" });
        break;
      }
      default:
        // ignore unhandled event types
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(`Handler error: ${e}`, { status: 500 });
  }
});
