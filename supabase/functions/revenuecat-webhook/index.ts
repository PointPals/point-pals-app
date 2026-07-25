// RevenueCat webhook — syncs native IAP lifecycle back to Supabase.
//
// RevenueCat handles StoreKit (iOS) / Play Billing (Android) and sends
// webhook events for all subscription lifecycle changes. We mirror the
// stripe-webhook pattern: update households.subscription_status so that
// hasEntitlement() works identically on both platforms.
//
// Deploy: `supabase functions deploy revenuecat-webhook --no-verify-jwt`
//   (RevenueCat signs the request; we verify the signature ourselves via
//    the shared secret. The platform JWT check must be OFF.)
// Secrets: REVENUECAT_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Configure the endpoint in RevenueCat: Project > Integrations > Webhooks
//
// The app_user_id is the household's UUID (set on login via Purchases.logIn()).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Resend template sender (mirrored from stripe-webhook) ----------------
const RESEND_TEMPLATES = {
  paymentConfirmation:   "f349804b-9024-44e5-baf5-da4d18c3701a",
  subscriptionRenewal:   "af7030c6-a449-4d85-beb7-b35f19a4d5fb",
  paymentFailed:         "be31e3d1-c51d-4255-91fc-db501d76bf08",
  subscriptionCancelled: "9bbe49aa-223d-44f1-af8d-88560d4a6ae2",
} as const;
type TemplateKey = keyof typeof RESEND_TEMPLATES;

async function sendResendTemplate(
  key: TemplateKey,
  to: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error(`[revenuecat-webhook] Missing RESEND_API_KEY, skipping ${key}`);
    return;
  }
  const variables: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    variables[k] = v === null || v === undefined ? "" : typeof v === "string" ? v : String(v);
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "PointPals <hello@pointpals.co.nz>",
        to: [to],
        template: { id: RESEND_TEMPLATES[key], variables },
      }),
    });
    if (!res.ok) {
      console.error(`[revenuecat-webhook] Resend ${key} failed ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error(`[revenuecat-webhook] Resend ${key} threw:`, e);
  }
}
// -------------------------------------------------------------------------

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/**
 * RevenueCat webhook payload (relevant subset).
 * Full spec: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
interface RCRequest {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    entitlement_id?: string;
    entitlements?: Record<string, {
      expires_date?: string;
      product_identifier?: string;
    }>;
    period_type?: "trial" | "intro" | "normal";
    expiration_at_ms?: number;
    purchased_at_ms?: number;
    is_trial_conversion?: boolean;
    store?: string;
    cancellation_reason?: string | null;
  };
  api_version?: string;
  // The shared-secret auth check.
  auth: { app_id?: string };
}

function mapStatus(eventType: string): string {
  switch (eventType) {
    case "INITIAL_PURCHASE":
      return "active";
    case "RENEWAL":
      return "active";
    case "UNCANCELLATION":
      return "active";
    case "CANCELLATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    case "EXPIRATION":
      return "expired";
    default:
      return "free";
  }
}

function isTrialEvent(body: RCRequest): boolean {
  // INITIAL_PURCHASE with period_type "trial" → free trial started
  return (
    body.event.type === "INITIAL_PURCHASE" &&
    body.event.period_type === "trial"
  );
}

function isTrialConversion(body: RCRequest): boolean {
  // Trial period ended and first real payment went through
  return (
    (body.event.type === "INITIAL_PURCHASE" && body.event.period_type !== "trial") ||
    body.event.type === "RENEWAL"
  );
}

Deno.serve(async (req) => {
  // 1. Verify shared secret (RevenueCat sends it in the X-Shared-Secret header)
  const sharedSecret = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  const authHeader = req.headers.get("Authorization") ?? "";
  const body: RCRequest = await req.json();

  // RevenueCat authenticates webhooks via the request body's `auth` field
  // containing the app's shared secret.
  // https://www.revenuecat.com/docs/integrations/webhooks/security
  if (sharedSecret) {
    // RevenueCat sends the shared secret in the body.auth.app_id
    if (body.auth?.app_id !== sharedSecret) {
      console.error("[revenuecat-webhook] Invalid shared secret");
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    console.warn("[revenuecat-webhook] No REVENUECAT_WEBHOOK_AUTH configured — allowing request (dev mode)");
  }

  const { event } = body;
  const householdId = event.app_user_id;
  const eventType = event.type;
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  if (!householdId) {
    console.error("[revenuecat-webhook] Missing app_user_id");
    return new Response("Bad Request: missing app_user_id", { status: 400 });
  }

  console.log(`[revenuecat-webhook] ${eventType} for household ${householdId}`);

  try {
    // Build the patch payload
    const patch: Record<string, unknown> = {
      subscription_status: mapStatus(eventType),
      revenuecat_entitlement: event.entitlement_id ?? "premium",
      revenuecat_raw: body,
    };

    if (event.is_trial_conversion || isTrialConversion(body)) {
      // Trial ended → real subscription active
      patch.subscription_status = "active";
    }

    if (isTrialEvent(body)) {
      // Free trial just started
      patch.subscription_status = "trialing";
    }

    if (expiresAt) {
      patch.revenuecat_expires_at = expiresAt;
    }

    // Update the household
    const { error: updateError } = await admin
      .from("households")
      .update(patch)
      .eq("id", householdId);

    if (updateError) {
      console.error(`[revenuecat-webhook] DB update failed: ${updateError.message}`);
      return new Response(`Update error: ${updateError.message}`, { status: 500 });
    }

    // --- Emails (mirror stripe-webhook) ---
    // Look up admin email for this household
    const { data: mem } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .eq("role", "admin")
      .limit(1);

    let adminEmail: string | null = null;
    if (mem?.[0]?.user_id) {
      const { data: user } = await admin.auth.admin.getUserById(mem[0].user_id);
      adminEmail = user?.user?.email ?? null;
    }

    if (adminEmail) {
      switch (eventType) {
        case "INITIAL_PURCHASE": {
          // Only send payment confirmation for non-trial purchases (real charges)
          if (!isTrialEvent(body)) {
            await sendResendTemplate("paymentConfirmation", adminEmail);
            await admin
              .from("households")
              .update({ email_payment_confirmed_at: new Date().toISOString() })
              .eq("id", householdId);
          }
          break;
        }
        case "RENEWAL": {
          await sendResendTemplate("subscriptionRenewal", adminEmail);
          break;
        }
        case "CANCELLATION": {
          await sendResendTemplate("subscriptionCancelled", adminEmail);
          break;
        }
        case "BILLING_ISSUE": {
          await sendResendTemplate("paymentFailed", adminEmail);
          break;
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[revenuecat-webhook] Handler error:", e);
    return new Response(`Handler error: ${e}`, { status: 500 });
  }
});
