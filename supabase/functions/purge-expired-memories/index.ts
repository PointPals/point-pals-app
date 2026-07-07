// Edge Function: purge-expired-memories
// Cron-driven: for each household whose memory season has ended, deletes the
// season's memory posts (storage objects + rows) and rolls the cycle anchor
// forward to start the next season.
//
// Safety rails:
//  - Never purges a household with memories unless the expiry reminder was
//    sent (email_memory_expiry_sent_at) at least 24 hours ago.
//  - Households with an empty feed are rolled forward silently (no email
//    was needed, nothing to delete).
//  - Only posts created BEFORE the season end are deleted — anything posted
//    after the cutoff already belongs to the new season.
//  - Pass { "dry_run": true } in the body to report without deleting.
//
// Scheduled via the CRON_SECRET auth pattern (same as notify-trial-ending).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000;
const STORAGE_BATCH = 100;

type PostRow = {
  id: string;
  storage_path: string | null;
  media_paths: { path?: string }[] | null;
  audio_path: string | null;
};

function collectPaths(posts: PostRow[]): string[] {
  const paths = new Set<string>();
  for (const p of posts) {
    if (Array.isArray(p.media_paths)) {
      for (const m of p.media_paths) if (m?.path) paths.add(m.path);
    }
    if (p.storage_path) paths.add(p.storage_path);
    if (p.audio_path) paths.add(p.audio_path);
  }
  return [...paths];
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

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    /* empty body is fine */
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_retention_days, memory_cycle_ends_at, email_memory_expiry_sent_at")
    .eq("memory_retention_enabled", true)
    .lte("memory_cycle_ends_at", new Date(now).toISOString());

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households past their memory season end.");
    return new Response(JSON.stringify({ ok: true, purged: 0, rolled: 0, dry_run: dryRun }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let purged = 0;
  let rolled = 0;
  let skipped = 0;
  const errors: string[] = [];
  const report: Record<string, unknown>[] = [];

  for (const hh of households) {
    try {
      const endsAtMs = new Date(hh.memory_cycle_ends_at).getTime();

      // Season contents = posts created before the cutoff.
      const { data: posts, error: postErr } = await supabase
        .from("memory_posts")
        .select("id, storage_path, media_paths, audio_path")
        .eq("household_id", hh.id)
        .lt("created_at", hh.memory_cycle_ends_at);

      if (postErr) {
        errors.push(`${hh.id}: ${postErr.message}`);
        continue;
      }

      const rows = (posts ?? []) as PostRow[];

      // SAFETY: a household with memories is only purged if it was warned,
      // and the warning is at least 24h old. Otherwise leave it for the
      // reminder job to pick up — the purge waits, never the other way round.
      if (rows.length > 0) {
        const sentAt = hh.email_memory_expiry_sent_at
          ? new Date(hh.email_memory_expiry_sent_at).getTime()
          : null;
        if (sentAt === null || now - sentAt < REMINDER_GRACE_MS) {
          console.log(`Household ${hh.id}: season ended but reminder not sent/aged — skipping`);
          skipped++;
          continue;
        }
      }

      const paths = collectPaths(rows);

      if (dryRun) {
        report.push({ household: hh.id, posts: rows.length, storage_objects: paths.length });
        continue;
      }

      // 1) Storage objects (photos, videos, voice notes), in batches.
      for (let i = 0; i < paths.length; i += STORAGE_BATCH) {
        const chunk = paths.slice(i, i + STORAGE_BATCH);
        const { error: rmErr } = await supabase.storage.from("memories").remove(chunk);
        if (rmErr) console.warn(`Household ${hh.id}: storage remove error: ${rmErr.message}`);
      }

      // 2) Post rows (kids/likes/comments cascade via FKs).
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        for (let i = 0; i < ids.length; i += STORAGE_BATCH) {
          const { error: delErr } = await supabase
            .from("memory_posts")
            .delete()
            .in("id", ids.slice(i, i + STORAGE_BATCH));
          if (delErr) throw new Error(`post delete failed: ${delErr.message}`);
        }
      }

      // 3) Roll the cycle. Normally the new anchor is the old end date so
      // seasons stay back-to-back; if the job was down long enough that even
      // the next season would already be over, restart from now instead of
      // purging the household again on the very next run.
      const days = hh.memory_retention_days ?? 90;
      const nextEndMs = endsAtMs + days * 24 * 60 * 60 * 1000;
      const newAnchor = nextEndMs < now ? new Date(now).toISOString() : hh.memory_cycle_ends_at;

      const { error: rollErr } = await supabase
        .from("households")
        .update({
          memory_cycle_started_at: newAnchor,
          email_memory_expiry_sent_at: null,
        })
        .eq("id", hh.id);
      if (rollErr) throw new Error(`cycle roll failed: ${rollErr.message}`);

      if (rows.length > 0) {
        purged++;
        console.log(
          `Purged household ${hh.id} (${hh.name}): ${rows.length} posts, ${paths.length} storage objects`,
        );
      } else {
        rolled++;
        console.log(`Rolled empty-feed household ${hh.id} (${hh.name}) to a new season`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error purging household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      purged,
      rolled,
      skipped,
      report: dryRun ? report : undefined,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
