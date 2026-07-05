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

// ---- Resend template sender (mirror of src/lib/emails.server.ts) --------
const RESEND_TEMPLATES = {
  paymentConfirmation:   "1948c765-325d-420e-aabd-a5c9c05a7946",
  subscriptionRenewal:   "188f5f1c-2e98-41c3-b34b-dc85e6d79c01",
  paymentFailed:         "7521fc1b-69a3-4311-ba6b-3791525fde2e",
  subscriptionCancelled: "0b599576-fda3-4f54-a16d-26290f0fb6e3",
} as const;
type TemplateKey = keyof typeof RESEND_TEMPLATES;

async function sendResendTemplate(
  key: TemplateKey,
  to: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey  = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) {
    console.error(`[stripe-webhook] Missing LOVABLE_API_KEY/RESEND_API_KEY, skipping ${key}`);
    return;
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "PointPals <hello@pointpals.co.nz>",
        to: [to],
        template_id: RESEND_TEMPLATES[key],
        data,
      }),
    });
    if (!res.ok) {
      console.error(`[stripe-webhook] Resend ${key} failed ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error(`[stripe-webhook] Resend ${key} threw:`, e);
  }
}

async function adminEmailForCustomer(customerId: string): Promise<{ email: string | null; householdId: string | null }> {
  const { data: hh } = await admin
    .from("households")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  const householdId = hh?.id ?? null;
  if (!householdId) return { email: null, householdId: null };
  const { data: mem } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .eq("role", "admin")
    .limit(1);
  const userId = mem?.[0]?.user_id;
  if (!userId) return { email: null, householdId };
  const { data: u } = await admin.auth.admin.getUserById(userId);
  return { email: u?.user?.email ?? null, householdId };
}
// -------------------------------------------------------------------------

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
        // Template 05 — payment confirmation (first subscription charge / one-off buy).
        const to = s.customer_details?.email ?? s.customer_email ?? null;
        if (to && householdId) {
          const { data: hh } = await admin
            .from("households")
            .select("email_payment_confirmed_at")
            .eq("id", householdId)
            .maybeSingle();
          if (!hh?.email_payment_confirmed_at) {
            await sendResendTemplate("paymentConfirmation", to, {
              amount: s.amount_total ? (s.amount_total / 100).toFixed(2) : "",
              currency: (s.currency ?? "usd").toUpperCase(),
            });
            await admin
              .from("households")
              .update({ email_payment_confirmed_at: new Date().toISOString() })
              .eq("id", householdId);
          }
        }
        break;
      }
      case "invoice.paid": {
        // Template 06 — subscription renewal. Only fire on recurring cycles,
        // not the very first invoice (that's covered by payment confirmation).
        const inv = event.data.object as Stripe.Invoice;
        if (inv.billing_reason !== "subscription_cycle") break;
        const customerId = inv.customer as string;
        const { email } = await adminEmailForCustomer(customerId);
        if (email) {
          // {{month}} → billing month name from current_period_start on the sub.
          let monthName = "";
          try {
            const subId = (inv.subscription as string) ?? null;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              if (sub.current_period_start) {
                monthName = new Date(sub.current_period_start * 1000)
                  .toLocaleString("en-US", { month: "long", timeZone: "UTC" });
              }
            }
          } catch (e) {
            console.error("[stripe-webhook] month lookup failed:", e);
          }
          await sendResendTemplate("subscriptionRenewal", email, {
            amount: inv.amount_paid ? (inv.amount_paid / 100).toFixed(2) : "",
            currency: (inv.currency ?? "usd").toUpperCase(),
            period_end: inv.period_end
              ? new Date(inv.period_end * 1000).toISOString().slice(0, 10)
              : "",
            month: monthName,
          });
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
        if (event.type === "customer.subscription.deleted") {
          const { email, householdId } = await adminEmailForCustomer(sub.customer as string);
          if (email && householdId) {
            const { data: hh } = await admin
              .from("households")
              .select("email_cancelled_sent_at")
              .eq("id", householdId)
              .maybeSingle();
            if (!hh?.email_cancelled_sent_at) {
              await sendResendTemplate("subscriptionCancelled", email);
              await admin
                .from("households")
                .update({ email_cancelled_sent_at: new Date().toISOString() })
                .eq("id", householdId);
            }
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        await updateByCustomer(inv.customer as string, { subscription_status: "past_due" });
        const { email } = await adminEmailForCustomer(inv.customer as string);
        if (email) {
          await sendResendTemplate("paymentFailed", email, {
            amount: inv.amount_due ? (inv.amount_due / 100).toFixed(2) : "",
            currency: (inv.currency ?? "usd").toUpperCase(),
          });
        }
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
