// Edge Function: notify-memory-expiry
// Cron-driven: finds households whose memory-feed season ends in the next
// 0–4 days (or has already ended without a warning) and sends a "your
// memories are about to refresh" email, then starts the family's season
// recap montage so it's ready before the purge (purge-expired-memories
// finishes the render and emails the download link).
//
// Scheduled via the CRON_SECRET auth pattern (same as notify-trial-ending).
// Idempotent: stamps email_memory_expiry_sent_at on each household.
// The purge (purge-expired-memories) refuses to wipe any household whose
// stamp is missing or fresher than 24 hours — nobody loses memories unwarned.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Inline shared helpers ─────────────────────────────────────────────────

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://pointpals.co.nz";
const FROM_ADDRESS = "PointPals <hello@pointpals.co.nz>";

interface ResendTemplateOptions {
  to: string | string[];
  templateId: string;
  variables?: Record<string, unknown>;
  from: string;
  subject?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

function stringifyVars(vars?: Record<string, unknown>): Record<string, string> {
  if (!vars) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === null || v === undefined) {
      out[k] = "";
    } else if (typeof v === "string") {
      out[k] = v;
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

async function sendResendTemplate(
  apiKey: string,
  opts: ResendTemplateOptions,
): Promise<{ ok: boolean; status: number; body: string }> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const payload: Record<string, unknown> = {
    from: opts.from,
    to,
    template: {
      id: opts.templateId,
      variables: stringifyVars(opts.variables),
    },
  };
  if (opts.subject) payload.subject = opts.subject;
  if (opts.replyTo) payload.reply_to = opts.replyTo;
  if (opts.headers) payload.headers = opts.headers;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
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

  // ── FIND SEASONS ENDING IN ≤4 DAYS, INCLUDING OVERDUE ONES ──────────────
  // No lower bound: a household whose end date already slipped past without
  // a warning (a failed send, a newly-enabled season) is still warned before
  // the purge — the purge requires this stamp to be at least 24h old.
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_retention_days, memory_cycle_ends_at")
    .eq("memory_retention_enabled", true)
    .is("email_memory_expiry_sent_at", null)
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
  let recaps = 0;
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
      // The purge runs at least 24h after this email, so an overdue season
      // refreshes tomorrow at the earliest — never show a date in the past.
      const refreshAt = Math.max(
        new Date(hh.memory_cycle_ends_at).getTime(),
        now.getTime() + 24 * 60 * 60 * 1000,
      );
      const cycleEndDate = formatNzDate(new Date(refreshAt).toISOString());

      const memoryPlural = memoryCount === 1 ? "memory" : "memories";

      const result = await sendResendTemplate(resendKey, {
        to: email,
        from: FROM_ADDRESS,
        subject: `Your memory feed refreshes on ${cycleEndDate} — save your memories`,
        templateId: "f2ebbe00-23ea-42e6-bb75-be7f6f555ac1",
        variables: {
          first_name: firstName,
          family_name: hh.name,
          cycle_end_date: cycleEndDate,
          memory_count: memoryCount,
          memory_plural: memoryPlural,
          retention_days: String(hh.memory_retention_days ?? 90),
          settings_url: `${APP_URL}/settings`,
          memories_url: `${APP_URL}/memories`,
          keep_url: `${APP_URL}/settings`,
          unsubscribe_url: "https://pointpals.co.nz/settings",
        },
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

      if (await startSeasonRecap(supabase, hh.id, hh.memory_cycle_ends_at)) recaps++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, recaps, errors: errors.length > 0 ? errors : undefined }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

/** Kick off this season's recap montage unless the family already has one
 * (made, or in progress). Uses render-montage's cron path; returns true if a
 * render was started. A household without SHOTSTACK configured just gets a
 * logged "not_configured". */
async function startSeasonRecap(
  supabase: SupabaseClient,
  householdId: string,
  cycleEndsAt: string,
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from("montage_jobs")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("cycle_ends_at", cycleEndsAt)
      .in("status", ["queued", "rendering", "done"]);
    if ((count ?? 0) > 0) return false;

    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/render-montage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
      },
      body: JSON.stringify({ householdId, action: "start" }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      console.warn(`Recap for ${householdId} not started: ${body?.error ?? res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Recap for ${householdId} failed to start:`, e instanceof Error ? e.message : e);
    return false;
  }
}
