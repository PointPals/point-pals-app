// Get icon generation usage for the current household this month.
// Returns { used, cap } so the UI can show "3/10 used" or similar.
//
// Deploy: `supabase functions deploy get-icon-usage --no-verify-jwt`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CAP = 10; // same as MONTHLY_CAP in generate-icon / upload-icon

/** ISO string for the start of the current calendar month (UTC). */
function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { householdId } = await req.json() as { householdId: string };
    if (!householdId) return json({ error: "householdId required" }, 400);

    const { count, error: cErr } = await admin
      .from("icon_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gte("created_at", monthStartISO());

    if (cErr) return json({ error: "count query failed" }, 500);

    const used = count ?? 0;
    return json({ ok: true, used, cap: CAP, remaining: CAP - used });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "unknown error" },
      500,
    );
  }
});
