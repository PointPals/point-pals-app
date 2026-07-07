// Edge Function: purge-memories
// Cron-driven: hard-deletes memory_posts older than the household's current
// cycle boundary.
//
// Safety gates (never deletes without explicit consent):
// 1. Only processes households with memory_auto_purge = true (opt-in).
// 2. Only deletes if the reminder was sent (memory_cycle_reminded_at is set
//    within this cycle — i.e., the household was warned) AND the reminder is
//    at least 24h old (a late reminder never precedes a same-day purge).
// 3. Supports {"dry_run": true} — reports what would be deleted without
//    touching anything. Recommended for the first production runs.
//
// Montage exports live in the private "exports" bucket, so originals always
// purge with their season — nothing here needs to know about montages.
//
// 🛑 v1 safety: we hard-delete, but only after double-checking the
//    household was warned AND they haven't opted out.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // {"dry_run": true} → report what would be purged, delete nothing.
  const dryRun = await req.json().then((b) => b?.dry_run === true).catch(() => false);

  const now = new Date();

  // ── FETCH HOUSEHOLDS WITH AUTO-PURGE ENABLED ────────────────────────────
  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_cycle_started_at, memory_cycle_reminded_at")
    .eq("memory_auto_purge", true)
    .not("memory_cycle_started_at", "is", null);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households with auto-purge enabled.");
    return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalDeleted = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      const anchor = new Date(hh.memory_cycle_started_at);

      // ── CALCULATE CURRENT CYCLE BOUNDARY ────────────────────────────────
      const msSinceAnchor = now.getTime() - anchor.getTime();
      const daysSinceAnchor = msSinceAnchor / (24 * 60 * 60 * 1000);
      const cycleNumber = Math.floor(daysSinceAnchor / 90);

      // Posts older than this are fair game for this cycle.
      // (cycleNumber * 90) days after the anchor.
      const cycleBoundary = new Date(anchor.getTime() + cycleNumber * 90 * 24 * 60 * 60 * 1000);

      // Safety gate: did we warn this household within this cycle?
      // The reminder fires 4-8 days before the cycle end. If the reminder
      // was sent within the last 90 days, we consider this cycle warned —
      // but never purge within 24h of a reminder (a late reminder, e.g.
      // after an email outage, must not precede a same-day purge).
      let warned = false;
      if (hh.memory_cycle_reminded_at) {
        const reminded = new Date(hh.memory_cycle_reminded_at);
        const daysSinceReminded = (now.getTime() - reminded.getTime()) / (24 * 60 * 60 * 1000);
        warned = daysSinceReminded >= 1 && daysSinceReminded < 90;
      }

      if (!warned) {
        console.log(`Household ${hh.id}: not warned this cycle (or warned <24h ago) — skipping purge`);
        continue;
      }

      // ── FIND STORAGE PATHS TO DELETE ────────────────────────────────────
      const { data: postsToDelete, error: fetchErr } = await supabase
        .from("memory_posts")
        .select("id, storage_path, media_paths")
        .eq("household_id", hh.id)
        .lt("created_at", cycleBoundary.toISOString());

      if (fetchErr) {
        console.error(`Error fetching posts for household ${hh.id}: ${fetchErr.message}`);
        errors.push(`${hh.id}: ${fetchErr.message}`);
        continue;
      }

      if (!postsToDelete || postsToDelete.length === 0) {
        console.log(`Household ${hh.id}: no aged-out posts to purge`);
        continue;
      }

      console.log(`Household ${hh.id}: ${postsToDelete.length} posts to purge`);

      // ── DELETE FROM STORAGE (memories bucket) ───────────────────────────
      // Media lives either in storage_path (single-media posts) or in the
      // media_paths jsonb array ([{path, kind}, …] — composer v2). Both must
      // go, or the "purge" leaves the actual files behind.
      const storagePaths = postsToDelete.flatMap((p) => {
        const paths: string[] = [];
        if (p.storage_path) paths.push(p.storage_path);
        if (Array.isArray(p.media_paths)) {
          for (const m of p.media_paths as { path?: string }[]) {
            if (m?.path) paths.push(m.path);
          }
        }
        return paths;
      });

      if (dryRun) {
        totalDeleted += postsToDelete.length;
        console.log(`[dry run] Household ${hh.id}: would purge ${postsToDelete.length} posts, ${storagePaths.length} storage objects`);
        continue;
      }

      if (storagePaths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from("memories")
          .remove(storagePaths);

        if (storageErr) {
          console.warn(`Storage cleanup for household ${hh.id} had errors: ${storageErr.message}`);
        }
      }

      // ── DELETE DB ROWS (cascades to memory_post_kids, likes, comments) ───
      const postIds = postsToDelete.map((p) => p.id);
      const { error: deleteErr } = await supabase
        .from("memory_posts")
        .delete()
        .in("id", postIds);

      if (deleteErr) {
        console.error(`DB delete failed for household ${hh.id}: ${deleteErr.message}`);
        errors.push(`${hh.id}: ${deleteErr.message}`);
        continue;
      }

      totalDeleted += postsToDelete.length;
      console.log(`Purged ${postsToDelete.length} posts for household ${hh.id} (${hh.name})`);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, dry_run: dryRun || undefined, deleted: totalDeleted, errors: errors.length > 0 ? errors : undefined }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
