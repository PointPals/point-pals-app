// Edge Function: notify-memory-expiry
// Cron-driven: finds households whose current memory cycle ends in 4-8 days
// and sends a reminder email + in-app notification.
//
// A "cycle" is a fixed 90-day window anchored at memory_cycle_started_at.
// We calculate the *next* cycle boundary and warn when it's approaching.
//
// Idempotent: stamps memory_cycle_reminded_at per household, per cycle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendTemplate } from "../_shared/resend-send.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland",
  });
}

/**
 * Count posts in the current cycle for a household.
 */
async function postCountInCycle(supabase: ReturnType<typeof createClient>, householdId: string, cycleStart: string): Promise<number> {
  const { count } = await supabase
    .from("memory_posts")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId)
    .gte("created_at", cycleStart);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // CRON_SECRET auth
  const cronSecret = Deno.env.get("CRON_SECRET");
  const xCron = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || (xCron !== cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("Missing RESEND_API_KEY");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // ── FETCH ALL HOUSEHOLDS WITH A CYCLE ANCHOR ────────────────────────────
  // We'll iterate and check each one rather than trying to encode 90-day
  // math in SQL (the "current cycle boundary" calculation is clearest in JS).
  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_cycle_started_at, memory_cycle_reminded_at, memory_auto_purge")
    .not("memory_cycle_started_at", "is", null);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households with a memory cycle anchor.");
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      const anchor = new Date(hh.memory_cycle_started_at);
      const msSinceAnchor = now.getTime() - anchor.getTime();
      const daysSinceAnchor = msSinceAnchor / (24 * 60 * 60 * 1000);

      // Which cycle number are we in? (0-indexed)
      const cycleNumber = Math.floor(daysSinceAnchor / 90);
      // When does this cycle end?
      const cycleEnd = new Date(anchor.getTime() + (cycleNumber + 1) * 90 * 24 * 60 * 60 * 1000);
      // When does the next cycle start?
      const nextCycleStart = new Date(cycleEnd.getTime());
      const daysUntilEnd = (cycleEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

      // Only alert if the cycle ends in 4–8 days (window for reminder).
      if (daysUntilEnd < 4 || daysUntilEnd > 8) continue;

      // Idempotency: skip if reminded_at is within this cycle (within last 85 days).
      if (hh.memory_cycle_reminded_at) {
        const remindedSince = now.getTime() - new Date(hh.memory_cycle_reminded_at).getTime();
        const daysSinceReminded = remindedSince / (24 * 60 * 60 * 1000);
        if (daysSinceReminded < 85) continue;
      }

      // ── FIND PRIMARY ADMIN ──────────────────────────────────────────────
      const { data: members, error: memErr } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", hh.id)
        .in("role", ["admin", "parent"])
        .order("created_at", { ascending: true })
        .limit(1);

      if (memErr || !members || members.length === 0) {
        console.warn(`Household ${hh.id} has no admin/parent members — skipping`);
        continue;
      }

      const userId = members[0].user_id;
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (!userData?.user?.email) {
        console.warn(`User ${userId} not found or has no email — skipping`);
        continue;
      }

      const email = userData.user.email;
      const meta = userData.user.user_metadata ?? {};
      const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";

      const expiryDate = formatNzDate(cycleEnd.toISOString());
      const postCount = await postCountInCycle(supabase, hh.id, new Date(anchor.getTime() + cycleNumber * 90 * 24 * 60 * 60 * 1000).toISOString());

      // ── SEND EMAIL ──────────────────────────────────────────────────────
      const result = await sendResendTemplate(resendKey, {
        to: email,
        templateId: TEMPLATES.MEMORY_EXPIRY_WARNING,
        from: FROM_ADDRESS,
        variables: {
          first_name: firstName,
          family_name: hh.name,
          expiry_date: expiryDate,
          post_count: postCount,
          memories_url: `${APP_URL}/memories`,
          montage_url: `${APP_URL}/memories?export=montage`,
          auto_purge: hh.memory_auto_purge ? "Yes" : "No",
        },
      });

      if (!result.ok) {
        console.warn(`Failed to send to ${email}: ${result.status} ${result.body}`);
        errors.push(`${email}: ${result.status}`);
        continue;
      }

      // ── STAMP IDEMPOTENCY ──────────────────────────────────────────────
      await supabase
        .from("households")
        .update({ memory_cycle_reminded_at: nowIso })
        .eq("id", hh.id);

      sent++;
      console.log(`Sent memory-expiry reminder to ${email} (${hh.name}), ${Math.round(daysUntilEnd)} days until purge`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors: errors.length > 0 ? errors : undefined }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
