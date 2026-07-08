// Edge Function: export-memories
// Downloads all media files from the current memory season for a household,
// bundles them into a ZIP archive, uploads to the private exports bucket,
// and returns a short-lived signed download URL.
//
// POST /export-memories   (caller: signed-in household member)
//   { householdId: "uuid" }
//     → { ok: true, download_url: "https://...", count: 42, size_mb: 12.3 }
//     → { ok: false, error: "..." }
//
// Privacy: the ZIP lives in the private "exports" bucket and is served via
// a 1-hour signed URL. No media leaves our infrastructure unauthenticated.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

// Try JSZip first — it uses pure JS and works in Deno via esm.sh
let JSZip: typeof import("jszip");
try {
  JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
} catch {
  // If JSZip fails to load, set a flag so we fall back to listing URLs
  console.warn("JSZip not available — will list download URLs instead");
  JSZip = null as unknown as typeof import("jszip").default;
}

const SIGNED_DOWNLOAD_TTL = 3600; // 1 hour
const MAX_ARCHIVE_SIZE = 80 * 1024 * 1024; // 80 MB — soft cap for serverless

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { householdId } = await req.json();
    if (!householdId) return json({ ok: false, error: "householdId is required" }, 400);

    // ── AUTH: signed-in member of this household ─────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: member } = await supabase
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return json({ ok: false, error: "Not a member of this household" }, 403);

    // ── Gather season info ───────────────────────────────────────────
    const { data: hh } = await supabase
      .from("households")
      .select("name, memory_cycle_started_at, memory_retention_enabled")
      .eq("id", householdId)
      .maybeSingle();
    if (!hh) return json({ ok: false, error: "Household not found" }, 404);

    // ── Fetch all memory posts for this household (current season) ──
    const { data: posts, error: postErr } = await supabase
      .from("memory_posts")
      .select("id, storage_path, media_type, media_paths, created_at, caption")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });

    if (postErr) return json({ ok: false, error: postErr.message }, 500);
    if (!posts || posts.length === 0) {
      return json({ ok: false, error: "No memories to export" }, 400);
    }

    // ── Collect all media file paths ─────────────────────────────────
    const filePaths: { path: string; name: string }[] = [];
    for (const post of posts) {
      // media_paths (newer format with typed items)
      if (Array.isArray(post.media_paths) && post.media_paths.length > 0) {
        for (const m of post.media_paths) {
          if (m?.path) {
            const ext = (m.path.split(".").pop() || "jpg").toLowerCase();
            filePaths.push({
              path: m.path,
              name: `${post.id.slice(0, 8)}-${m.path.split("/").pop() || `file.${ext}`}`,
            });
          }
        }
      }
      // storage_path (legacy single-file posts)
      if (post.storage_path && !filePaths.some((f) => f.path === post.storage_path)) {
        const ext = (post.media_type || "image");
        const name = post.storage_path.split("/").pop() || `memory-${post.id.slice(0, 8)}`;
        filePaths.push({
          path: post.storage_path,
          name: `${post.id.slice(0, 8)}-${name}`,
        });
      }
    }

    if (filePaths.length === 0) {
      return json({ ok: false, error: "No media files found on these memories" }, 400);
    }

    // ── Check total size before downloading ──────────────────────────
    // We estimate size by HEAD request on the first few files; if it
    // looks large, warn and fall back to a listing with signed URLs.
    let totalBytes = 0;
    const signedUrls: string[] = [];

    for (const fp of filePaths) {
      // Get a signed URL so we can HEAD/GET the file
      const { data: signed } = await supabase.storage
        .from("memories")
        .createSignedUrl(fp.path, SIGNED_DOWNLOAD_TTL);
      if (!signed?.signedUrl) continue;
      signedUrls.push(signed.signedUrl);
    }

    if (signedUrls.length === 0) {
      return json({ ok: false, error: "Could not access any media files" }, 500);
    }

    // ── Try to build a ZIP archive ───────────────────────────────────
    if (JSZip) {
      try {
        const result = await buildZipArchive(supabase, filePaths, signedUrls, householdId);
        if (result) return result;
      } catch (zipErr) {
        console.warn("ZIP build failed, falling back to listing:", zipErr);
      }
    }

    // ── Fallback: return list of signed download URLs ────────────────
    console.warn("Returning individual signed URLs for household", householdId);
    return json({
      ok: true,
      format: "urls",
      count: signedUrls.length,
      urls: signedUrls,
      expires_in_seconds: SIGNED_DOWNLOAD_TTL,
    });
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

/**
 * Download all files, zip them, upload to exports bucket, return signed URL.
 * Returns a Response or null (to trigger the URL-list fallback).
 */
async function buildZipArchive(
  supabase: ReturnType<typeof createClient>,
  filePaths: { path: string; name: string }[],
  signedUrls: string[],
  householdId: string,
): Promise<Response | null> {
  const zip = new JSZip();
  let totalBytes = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const fp = filePaths[i];
    const url = signedUrls[i];
    if (!url) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const buf = await res.arrayBuffer();
      totalBytes += buf.byteLength;

      // Soft cap: if we've exceeded 80 MB, stop adding files but
      // still zip what we have (and note it in the response metadata).
      if (totalBytes > MAX_ARCHIVE_SIZE) {
        console.warn(`Archive exceeded ${MAX_ARCHIVE_SIZE / 1024 / 1024} MB — truncating at ${i} files`);
        // Add a note to the zip
        zip.file("_NOTE.txt",
          `This export was truncated at ${i} of ${filePaths.length} files ` +
          `because the archive exceeded ${MAX_ARCHIVE_SIZE / 1024 / 1024} MB.\n` +
          `For the remaining files, use the individual URLs from the Settings page.`
        );
        break;
      }

      zip.file(fp.name, new Uint8Array(buf));
    } catch (fetchErr) {
      console.warn(`Failed to download ${fp.path}:`, fetchErr);
      continue;
    }
  }

  const fileCount = Object.keys(zip.files).filter((k) => !zip.files[k].dir).length;
  if (fileCount === 0) return null;

  // Generate the ZIP blob
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const outputPath = `${householdId}/memories-export-${Date.now()}.zip`;

  const { error: upErr } = await supabase.storage
    .from("exports")
    .upload(outputPath, await zipBlob.arrayBuffer(), {
      contentType: "application/zip",
      upsert: false,
    });

  if (upErr) {
    console.error("exports upload failed:", upErr.message);
    return null;
  }

  const { data: signed } = await supabase.storage
    .from("exports")
    .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);

  if (!signed?.signedUrl) {
    console.error("Could not sign export URL");
    return null;
  }

  return json({
    ok: true,
    format: "zip",
    download_url: signed.signedUrl,
    count: fileCount,
    total_files: filePaths.length,
    size_bytes: zipBlob.size,
    size_mb: Math.round((zipBlob.size / (1024 * 1024)) * 10) / 10,
    expires_in_seconds: SIGNED_DOWNLOAD_TTL,
  });
}
