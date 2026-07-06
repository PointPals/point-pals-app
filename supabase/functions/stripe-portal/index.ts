// Stripe Customer Portal session (§5) — self-service card update, cancellation,
// and invoices. No custom billing UI.
//
// Deploy: `supabase functions deploy stripe-portal`
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, returnUrl } = await req.json();
    if (!householdId || !returnUrl) return json({ error: "Missing householdId/returnUrl" }, 400);

    if (!stripe) {
      return json(
        { error: "Stripe is not configured — the STRIPE_SECRET_KEY environment variable is missing. Contact support to set this up." },
        503,
      );
    }

    const { data: household } = await admin
      .from("households")
      .select("stripe_customer_id")
      .eq("id", householdId)
      .single();

    const customerId = household?.stripe_customer_id as string | undefined;
    if (!customerId) {
      return json(
        { error: "No Stripe customer linked to this household yet. Did you complete a checkout first?" },
        400,
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "portal failed" }, 500);
  }
});
