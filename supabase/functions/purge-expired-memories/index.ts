// Edge Function: purge-expired-memories
// Cron-driven: for each household whose memory season has ended, deletes the
// season's memory posts (storage objects + rows) and rolls the cycle anchor
// forward to start the next season.
//
// Safety rails:
//  - A household with memories is purged only once the expiry reminder was
//    sent (email_memory_expiry_sent_at) at least 24 hours ago — or, if no
//    reminder could be delivered (no reachable admin email), once the season
//    is MAX_UNWARNED_DAYS overdue. Retention wins in the end: data never
//    lingers indefinitely because an email bounced.
//  - If the season's recap montage is still rendering, the purge waits for
//    it (same overdue cap), since the render reads the files being deleted.
//  - Rows are deleted only after their storage objects are gone, so a failed
//    storage call is retried on the next run instead of orphaning files.
//  - Households with an empty feed are rolled forward silently (no email
//    was needed, nothing to delete).
//  - Only posts created BEFORE the season end are deleted — anything posted
//    after the cutoff already belongs to the new season.
//  - Pass { "dry_run": true } in the body to report without deleting.
//
// Each run also:
//  - finishes any recap montages started by notify-memory-expiry (pulls the
//    MP4 into the exports bucket and emails the family), and
//  - sweeps files that aren't tied to memory rows: memory ZIP exports after
//    1 day, montage MP4s and support screenshots after 90 days.
//
// Scheduled via the CRON_SECRET auth pattern (same as notify-trial-ending).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_GRACE_MS = DAY_MS;
const MAX_UNWARNED_DAYS = 7;
const STORAGE_BATCH = 100;

// Files outside memory_posts, and how long each may live.
const SWEEPS = [
  { bucket: "exports", like: "%.zip", olderThan: "1 day" },
  { bucket: "exports", like: "%.mp4", olderThan: "90 days" },
  { bucket: "support_attachments", like: "%", olderThan: "90 days" },
] as const;

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

  // ── 0. Finish recap renders (started by notify-memory-expiry) ──────────
  const finished = dryRun ? 0 : await finishPendingMontages(supabase, cronSecret);

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

  let purged = 0;
  let rolled = 0;
  let skipped = 0;
  const errors: string[] = [];
  const report: Record<string, unknown>[] = [];

  for (const hh of households ?? []) {
    try {
      const endsAtMs = new Date(hh.memory_cycle_ends_at).getTime();
      const pastUnwarnedCap = now - endsAtMs > MAX_UNWARNED_DAYS * DAY_MS;

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
      // reminder job to pick up — the purge waits, never the other way round
      // (up to MAX_UNWARNED_DAYS, after which retention takes priority).
      if (rows.length > 0) {
        const sentAt = hh.email_memory_expiry_sent_at
          ? new Date(hh.email_memory_expiry_sent_at).getTime()
          : null;
        if (sentAt === null || now - sentAt < REMINDER_GRACE_MS) {
          if (!pastUnwarnedCap) {
            console.log(`Household ${hh.id}: season ended but reminder not sent/aged — skipping`);
            skipped++;
            continue;
          }
          console.warn(
            `Household ${hh.id}: no reminder after ${MAX_UNWARNED_DAYS} days overdue — purging anyway`,
          );
        }

        // Don't pull files out from under a recap that's still rendering.
        const { count: rendering } = await supabase
          .from("montage_jobs")
          .select("id", { count: "exact", head: true })
          .eq("household_id", hh.id)
          .in("status", ["queued", "rendering"]);
        if ((rendering ?? 0) > 0 && !pastUnwarnedCap) {
          console.log(`Household ${hh.id}: recap still rendering — purging next run`);
          skipped++;
          continue;
        }
      }

      const paths = collectPaths(rows);

      if (dryRun) {
        report.push({ household: hh.id, posts: rows.length, storage_objects: paths.length });
        continue;
      }

      // 1) Storage objects (photos, videos, voice notes), in batches. If any
      // batch fails, keep the rows so the next run retries the files.
      let storageFailed = false;
      for (let i = 0; i < paths.length; i += STORAGE_BATCH) {
        const chunk = paths.slice(i, i + STORAGE_BATCH);
        const { error: rmErr } = await supabase.storage.from("memories").remove(chunk);
        if (rmErr) {
          storageFailed = true;
          console.warn(`Household ${hh.id}: storage remove error: ${rmErr.message}`);
        }
      }
      if (storageFailed) {
        errors.push(`${hh.id}: storage remove failed — will retry next run`);
        continue;
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

  // ── Sweep files that aren't tied to memory rows ────────────────────────
  const swept: Record<string, number> = {};
  for (const sweep of SWEEPS) {
    const key = `${sweep.bucket}:${sweep.like}`;
    try {
      swept[key] = await sweepBucket(supabase, sweep, dryRun);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      montages_finished: finished,
      purged,
      rolled,
      skipped,
      swept,
      report: dryRun ? report : undefined,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

type Admin = SupabaseClient;

/** Poll render-montage for every recap still in flight, so the MP4 lands in
 * exports and the "your recap is ready" email goes out without anyone having
 * the app open. Returns how many jobs are now done. */
async function finishPendingMontages(supabase: Admin, cronSecret: string): Promise<number> {
  const { data: jobs, error } = await supabase
    .from("montage_jobs")
    .select("id, household_id, created_at")
    .in("status", ["queued", "rendering"])
    .lt("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .limit(50);
  if (error || !jobs) {
    if (error) console.warn("montage job query error:", error.message);
    return 0;
  }

  let done = 0;
  for (const job of jobs as { id: string; household_id: string; created_at: string }[]) {
    try {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/render-montage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret },
        body: JSON.stringify({ householdId: job.household_id, action: "status", jobId: job.id }),
      });
      const body = await res.json().catch(() => null);
      if (body?.status === "done") {
        done++;
      } else if (Date.now() - new Date(job.created_at).getTime() > 2 * DAY_MS) {
        // A render that hasn't landed in two days isn't coming; stop waiting
        // on it so the season can purge.
        await supabase
          .from("montage_jobs")
          .update({ status: "failed", error: "timed out" })
          .eq("id", job.id);
      }
    } catch (e) {
      console.warn(`montage ${job.id}: status poll failed:`, e instanceof Error ? e.message : e);
    }
  }
  return done;
}

/** Delete one bucket's expired files (in pages of up to 1000). Montage MP4s
 * also have their montage_jobs.output_path cleared so the app stops offering
 * a dead link. Returns the number of files removed (or found, on a dry run). */
async function sweepBucket(
  supabase: Admin,
  sweep: (typeof SWEEPS)[number],
  dryRun: boolean,
): Promise<number> {
  let total = 0;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase.rpc("expired_storage_objects", {
      p_bucket: sweep.bucket,
      p_older_than: sweep.olderThan,
      p_name_like: sweep.like,
      p_limit: 1000,
    });
    if (error) throw new Error(error.message);
    const names = ((data ?? []) as { name: string }[]).map((r) => r.name);
    if (names.length === 0) break;
    if (dryRun) return names.length;

    for (let i = 0; i < names.length; i += STORAGE_BATCH) {
      const chunk = names.slice(i, i + STORAGE_BATCH);
      const { error: rmErr } = await supabase.storage.from(sweep.bucket).remove(chunk);
      if (rmErr) throw new Error(`remove failed: ${rmErr.message}`);
      if (sweep.like === "%.mp4") {
        await supabase.from("montage_jobs").update({ output_path: null }).in("output_path", chunk);
      }
      total += chunk.length;
    }
    if (names.length < 1000) break;
  }
  if (total > 0) console.log(`Swept ${total} expired file(s) from ${sweep.bucket} (${sweep.like})`);
  return total;
}
