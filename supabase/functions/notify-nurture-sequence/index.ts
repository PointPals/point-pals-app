// Edge Function: notify-nurture-sequence
// Cron-driven nurture email sequence. Called three times daily with a "tip"
// parameter (day3 / day7 / month1) to send the right parenting tip.
//
// Idempotent: stamps email_tip_*_sent_at on each household.
// Timing is relative to households.created_at (household signup date).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendTemplate } from "../_shared/resend-send.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: format a UTC ISO string as a readable NZ date (e.g. "9 July 2026").
function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
}

type TipConfig = {
  templateId: string;
  idempotencyCol: string;
  windowStartDays: number; // min days since created_at
  windowEndDays: number;   // max days since created_at
};

const TIP_CONFIG: Record<string, TipConfig> = {
  day3: {
    templateId: TEMPLATES.PARENTING_TIP_START_SMALL,
    idempotencyCol: "email_tip_day3_sent_at",
    windowStartDays: 2,
    windowEndDays: 4,
  },
  day7: {
    templateId: TEMPLATES.PARENTING_TIP_LABEL_PRAISE,
    idempotencyCol: "email_tip_day7_sent_at",
    windowStartDays: 6,
    windowEndDays: 9,
  },
  month1: {
    templateId: TEMPLATES.HABIT_FADING_TIPS,
    idempotencyCol: "email_tip_month1_sent_at",
    windowStartDays: 28,
    windowEndDays: 35,
  },
};

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

  // Read tip type from request body
  let tip: string;
  try {
    const body = await req.json();
    tip = body.tip;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body, expected { tip: 'day3'|'day7'|'month1' }" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const config = TIP_CONFIG[tip];
  if (!config) {
    return new Response(
      JSON.stringify({ error: `Unknown tip '${tip}'. Use day3, day7, or month1.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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

  // ── FIND HOUSEHOLDS IN THE TIP WINDOW ─────────────────────────────────
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowEndDays * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() - config.windowStartDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, created_at")
    .is(config.idempotencyCol, null)
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log(`[nurture-${tip}] No households in window.`);
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[nurture-${tip}] Found ${households.length} households.`);
  let sent = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      // ── FIND THE PRIMARY ADMIN MEMBER ────────────────────────────────
      const { data: members, error: memErr } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", hh.id)
        .in("role", ["admin", "parent"])
        .order("created_at", { ascending: true })
        .limit(1);

      if (memErr || !members || members.length === 0) {
        console.warn(`[nurture-${tip}] Household ${hh.id} has no admin/parent — skipping`);
        continue;
      }

      const userId = members[0].user_id;

      // ── LOOK UP THE USER'S EMAIL ─────────────────────────────────────
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !userData?.user?.email) {
        console.warn(`[nurture-${tip}] User ${userId} not found — skipping`);
        continue;
      }

      const email = userData.user.email;
      const meta = userData.user.user_metadata ?? {};
      const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";

      // ── SEND THE EMAIL ───────────────────────────────────────────────
      const variables: Record<string, unknown> = {
        first_name: firstName,
      };

      if (tip === "month1") {
        variables.trial_end_date = "soon"; // placeholder — actual value from billing
      }

      const result = await sendResendTemplate(resendKey, {
        to: email,
        templateId: config.templateId,
        from: FROM_ADDRESS,
        variables,
      });

      if (!result.ok) {
        console.warn(`[nurture-${tip}] Failed to send to ${email}: ${result.status} ${result.body}`);
        errors.push(`${email}: ${result.status}`);
        continue;
      }

      // ── STAMP IDEMPOTENCY ────────────────────────────────────────────
      await supabase
        .from("households")
        .update({ [config.idempotencyCol]: new Date().toISOString() })
        .eq("id", hh.id);

      sent++;
      console.log(`[nurture-${tip}] Sent to ${email} (${hh.name})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[nurture-${tip}] Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, tip, sent, errors: errors.length > 0 ? errors : undefined }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
