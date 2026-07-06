// Stripe Checkout session creator (§5).
//
// Creates (or reuses) a Stripe Customer for the household and opens a Checkout
// Session. The pricing MODEL is config-driven: subscription (default), one_off,
// or freemium extras — switch by passing `model` + a matching Price ID. NZD is
// primary; other currencies map to their own Stripe Price IDs, so adding a
// currency is config, not code.
//
// Deploy: `supabase functions deploy stripe-checkout --no-verify-jwt=false`
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_NZD (+ per-currency), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

import Stripe from "https://esm.sh/stripe@16?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
if (!STRIPE_KEY) {
  console.error("Missing STRIPE_SECRET_KEY — set it via `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`");
}
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function priceIdFor(currency: string): string | undefined {
  const key = `STRIPE_PRICE_${currency.toUpperCase()}`;
  return Deno.env.get(key) ?? undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, currency = "NZD", model = "subscription", successUrl, cancelUrl } =
      await req.json();

    if (!householdId || !successUrl || !cancelUrl) {
      return json({ error: "Missing householdId/successUrl/cancelUrl" }, 400);
    }

    if (!stripe) {
      return json(
        { error: "Stripe is not configured — the STRIPE_SECRET_KEY environment variable is missing." },
        503,
      );
    }

    const priceId = priceIdFor(currency);
    if (!priceId) return json({ error: `No Stripe price configured for ${currency}` }, 400);

    // Founders coupon — auto-apply when configured. `discounts` and
    // `allow_promotion_codes` are mutually exclusive in Stripe Checkout, so
    // we only enable one path at a time.
    const founderCoupon = Deno.env.get("STRIPE_COUPON_ID") || undefined;

    // Look up or create the Stripe customer for this household.
    const { data: household } = await admin
      .from("households")
      .select("id, name, stripe_customer_id")
      .eq("id", householdId)
      .single();

    let customerId = household?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { household_id: householdId },
        name: household?.name ?? undefined,
      });
      customerId = customer.id;
      await admin.from("households").update({ stripe_customer_id: customerId }).eq("id", householdId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: model === "one_off" ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(founderCoupon
        ? { discounts: [{ coupon: founderCoupon }] }
        : { allow_promotion_codes: true }),
      currency: currency.toLowerCase(),
      client_reference_id: householdId,
      subscription_data:
        model === "subscription"
          ? { metadata: { household_id: householdId } }
          : undefined,
      metadata: {
        household_id: householdId,
        model,
        ...(founderCoupon ? { founder_coupon: founderCoupon } : {}),
      },
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "checkout failed" }, 500);
  }
});
