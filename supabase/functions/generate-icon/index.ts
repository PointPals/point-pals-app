// AI icon generation (§9) — RATE-LIMITED per household so generation costs stay
// predictable. Each household gets a capped number of generations per calendar
// month; premium households get a higher cap. The ledger lives in
// public.icon_generations (see 0001_init.sql).
//
// Deploy: `supabase functions deploy generate-icon`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, plus your image provider key
//   (OPENAI_API_KEY / REPLICATE_API_TOKEN / etc.) wired where marked TODO.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Monthly caps by entitlement — tune freely; this is the cost guardrail.
const FREE_MONTHLY_CAP = 5;
const PREMIUM_MONTHLY_CAP = 60;

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, prompt } = await req.json();
    if (!householdId || !prompt) return json({ error: "Missing householdId/prompt" }, 400);

    const { data: household, error: hErr } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .single();
    if (hErr || !household) return json({ error: "Unknown household" }, 404);

    const premium =
      household.subscription_status === "active" || household.subscription_status === "trialing";
    const cap = premium ? PREMIUM_MONTHLY_CAP : FREE_MONTHLY_CAP;

    // Count this household's generations since the start of the month.
    const { count, error: cErr } = await admin
      .from("icon_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gte("created_at", monthStartISO());
    if (cErr) return json({ error: "rate check failed" }, 500);

    if ((count ?? 0) >= cap) {
      return json(
        { error: "monthly_limit_reached", cap, used: count, premium },
        429,
      );
    }

    // --- TODO: call your image provider here and upload the result to Storage.
    // Kept provider-agnostic; wire OPENAI_API_KEY / REPLICATE_API_TOKEN, then:
    //   const img = await generateWithProvider(prompt);
    //   const path = `generated/${householdId}/${crypto.randomUUID()}.png`;
    //   await admin.storage.from("assets").upload(path, img, { contentType: "image/png" });
    const storagePath = `generated/${householdId}/${crypto.randomUUID()}.png`;

    // Record the generation for rate-limiting + auditing.
    await admin.from("icon_generations").insert({
      household_id: householdId,
      prompt,
      storage_path: storagePath,
    });

    return json({
      ok: true,
      storagePath,
      remaining: cap - (count ?? 0) - 1,
      note: "Provider call is stubbed — wire your image API where marked TODO.",
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "generation failed" }, 500);
  }
});
