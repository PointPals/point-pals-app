// Edge Function: notify-memory-expiry
// Cron-driven: finds households whose memory-feed season ends in the next
// 0–4 days and sends a "your memories are about to refresh" email with a
// link to download the season montage first.
//
// Scheduled via the CRON_SECRET auth pattern (same as notify-trial-ending).
// Idempotent: stamps email_memory_expiry_sent_at on each household.
// The purge (purge-expired-memories) refuses to wipe any household whose
// stamp is missing or fresher than 24 hours — nobody loses memories unwarned.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendHtml } from "../_shared/resend-send.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildEmailHtml(vars: {
  firstName: string;
  familyName: string;
  cycleEndDate: string;
  memoryCount: number;
  retentionDays: number;
  exportUrl: string;
  keepUrl: string;
}): string {
  const plural = vars.memoryCount === 1 ? "memory" : "memories";
  return `
<div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #2d2a26;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Your memory feed refreshes soon 📸</h1>
  <p style="font-size: 15px; line-height: 1.6;">Hi ${escapeHtml(vars.firstName)},</p>
  <p style="font-size: 15px; line-height: 1.6;">
    The <strong>${escapeHtml(vars.familyName)}</strong> family's memory feed refreshes on
    <strong>${escapeHtml(vars.cycleEndDate)}</strong>. That means the
    <strong>${vars.memoryCount} ${plural}</strong> from this season will be cleared to make room
    for the next one — we keep photos and videos of your family for one
    ${vars.retentionDays}-day season, then delete them for good. It's a privacy feature, not a
    storage limit: we don't hoard your kids' photos.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Before the refresh, you can turn this season into a keepsake:
  </p>
  <p style="margin: 24px 0;">
    <a href="${vars.exportUrl}"
       style="background: #2d2a26; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-size: 15px; font-weight: 600; display: inline-block;">
      Download your season montage
    </a>
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #6b6660;">
    Prefer to keep the feed as it is? You can switch off the seasonal refresh any time in
    <a href="${vars.keepUrl}" style="color: #6b6660;">Settings → Your data</a>.
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #6b6660; margin-top: 24px;">
    — The PointPals team
  </p>
</div>`.trim();
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

  // ── FIND SEASONS ENDING IN 0–4 DAYS ─────────────────────────────────────
  // Window starts at "now" (not +1 day like trial-ending) so a household
  // whose end date slipped past is still warned before the purge — the purge
  // requires this stamp to be at least 24h old before it will touch anything.
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_retention_days, memory_cycle_ends_at")
    .eq("memory_retention_enabled", true)
    .is("email_memory_expiry_sent_at", null)
    .gte("memory_cycle_ends_at", now.toISOString())
    .lte("memory_cycle_ends_at", windowEnd);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households with a memory season ending in 0–4 days.");
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${households.length} households with a memory season ending soon.`);

  let sent = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      // Only email households that actually have memories to lose. Empty
      // feeds are rolled over silently by purge-expired-memories.
      const { count } = await supabase
        .from("memory_posts")
        .select("id", { count: "exact", head: true })
        .eq("household_id", hh.id);
      const memoryCount = count ?? 0;
      if (memoryCount === 0) {
        console.log(`Household ${hh.id} has an empty feed — skipping email`);
        continue;
      }

      // Primary admin/parent member (oldest = billing contact)
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

      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
        members[0].user_id,
      );
      if (userErr || !userData?.user?.email) {
        console.warn(`User ${members[0].user_id} not found or has no email — skipping`);
        continue;
      }

      const email = userData.user.email;
      const meta = userData.user.user_metadata ?? {};
      const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";
      const cycleEndDate = hh.memory_cycle_ends_at ? formatNzDate(hh.memory_cycle_ends_at) : "soon";

      const result = await sendResendHtml(resendKey, {
        to: email,
        from: FROM_ADDRESS,
        subject: `Your memory feed refreshes on ${cycleEndDate} — download your montage first`,
        html: buildEmailHtml({
          firstName,
          familyName: hh.name,
          cycleEndDate,
          memoryCount,
          retentionDays: hh.memory_retention_days ?? 90,
          exportUrl: `${APP_URL}/memories`,
          keepUrl: `${APP_URL}/settings`,
        }),
      });

      if (!result.ok) {
        console.warn(`Failed to send to ${email}: ${result.status} ${result.body}`);
        errors.push(`${email}: ${result.status}`);
        continue;
      }

      await supabase
        .from("households")
        .update({ email_memory_expiry_sent_at: new Date().toISOString() })
        .eq("id", hh.id);

      sent++;
      console.log(`Sent memory-expiry email to ${email} (${hh.name})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors: errors.length > 0 ? errors : undefined }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
