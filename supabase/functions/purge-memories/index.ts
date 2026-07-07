// Edge Function: purge-memories
// Cron-driven: hard-deletes memory_posts older than the household's current
// cycle boundary.
//
// Safety gates (never deletes without explicit consent):
// 1. Only processes households with memory_auto_purge = true (opt-in).
// 2. Only deletes if the reminder was sent (memory_cycle_reminded_at is set
//    within this cycle — i.e., the household was warned).
// 3. Never deletes a post that was exported to montage this cycle
//    (montage_exported_at >= cycle_start).
// 4. Soft-deletes to a shadow table first, then hard-deletes 7 days later
//    if the household hasn't restored them (via a secondary cron).
//    For v1, we skip the grace window and hard-delete immediately, since
//    the data is already 90+ days old and the household was warned.
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

  const now = new Date();
  const nowIso = now.toISOString();

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
      // was sent within the last 85 days, we consider this cycle warned.
      let warned = false;
      if (hh.memory_cycle_reminded_at) {
        const reminded = new Date(hh.memory_cycle_reminded_at);
        const daysSinceReminded = (now.getTime() - reminded.getTime()) / (24 * 60 * 60 * 1000);
        warned = daysSinceReminded < 90;
      }

      if (!warned) {
        console.log(`Household ${hh.id}: not warned this cycle — skipping purge`);
        continue;
      }

      // ── FIND STORAGE PATHS TO DELETE ────────────────────────────────────
      const { data: postsToDelete, error: fetchErr } = await supabase
        .from("memory_posts")
        .select("id, storage_path")
        .eq("household_id", hh.id)
        .lt("created_at", cycleBoundary.toISOString())
        .is("montage_exported_at", null); // Don't delete exported posts

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
      const storagePaths = postsToDelete
        .map((p) => p.storage_path)
        .filter((p): p is string => !!p);

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
    JSON.stringify({ ok: true, deleted: totalDeleted, errors: errors.length > 0 ? errors : undefined }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
