// Edge Function: export-memories (v2 — hardened)
//
// Downloads all media files from the current memory season for a household,
// bundles them into a ZIP archive, uploads to the private exports bucket,
// and returns a short-lived signed download URL.
//
// POST /export-memories
//   { householdId: "uuid" }
//     → { ok: true, format:"zip", download_url:"...", count:42, size_mb:12.3 }
//     → { ok: true, format:"urls", count:3, urls:[...] }  (fallback)
//     → { ok: false, error:"..." }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Inline shared helpers ─────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Try JSZip — pure-JS zip, works in Deno via esm.sh
let JSZip: typeof import("jszip");
try {
  JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
} catch {
  console.warn("JSZip not available");
  JSZip = null as unknown as typeof import("jszip").default;
}

const SIGNED_DOWNLOAD_TTL = 3600; // 1 hour
const MAX_ARCHIVE_SIZE = 80 * 1024 * 1024; // 80 MB
const MEMORIES_BUCKET = "memories";
const EXPORTS_BUCKET = "exports";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { householdId } = await req.json();
    if (!householdId) return json({ ok: false, error: "householdId is required" }, 400);

    // ── AUTH ────────────────────────────────────────────────────────
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

    // ── Fetch memories ──────────────────────────────────────────────
    const { data: posts, error: postErr } = await supabase
      .from("memory_posts")
      .select("id, storage_path, media_type, media_paths, caption")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });

    if (postErr) return json({ ok: false, error: postErr.message }, 500);
    if (!posts || posts.length === 0)
      return json({ ok: false, error: "No memories to export" }, 404);

    // ── Collect file paths ──────────────────────────────────────────
    const filePaths: { path: string; name: string }[] = [];
    for (const post of posts) {
      if (Array.isArray(post.media_paths) && post.media_paths.length > 0) {
        for (const m of post.media_paths) {
          if (m?.path) {
            const fileName = m.path.split("/").pop() || `file.${(m.path.split(".").pop() || "jpg").toLowerCase()}`;
            filePaths.push({ path: m.path, name: `${post.id.slice(0, 8)}-${fileName}` });
          }
        }
      }
      if (post.storage_path && !filePaths.some((f) => f.path === post.storage_path)) {
        const name = post.storage_path.split("/").pop() || `memory-${post.id.slice(0, 8)}`;
        filePaths.push({ path: post.storage_path, name: `${post.id.slice(0, 8)}-${name}` });
      }
    }

    if (filePaths.length === 0)
      return json({ ok: false, error: "No media files found on these memories" }, 400);

    // ── Get signed URLs for all files ────────────────────────────────
    const signedUrls: string[] = [];
    for (const fp of filePaths) {
      const { data: signed } = await supabase.storage
        .from(MEMORIES_BUCKET)
        .createSignedUrl(fp.path, SIGNED_DOWNLOAD_TTL);
      if (signed?.signedUrl) signedUrls.push(signed.signedUrl);
    }

    if (signedUrls.length === 0)
      return json({ ok: false, error: "Could not access any media files" }, 500);

    // ── Build ZIP ────────────────────────────────────────────────────
    if (JSZip) {
      try {
        const zipResult = await buildZip(supabase, filePaths, signedUrls, householdId);
        if (zipResult) return zipResult;
      } catch (zipErr) {
        console.warn("ZIP build failed, falling back:", zipErr);
      }
    }

    // ── Fallback: return signed URLs ────────────────────────────────
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

async function buildZip(
  supabase: ReturnType<typeof createClient>,
  filePaths: { path: string; name: string }[],
  signedUrls: string[],
  householdId: string,
): Promise<Response | null> {
  // Ensure exports bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === EXPORTS_BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(EXPORTS_BUCKET, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024,
    });
    if (createErr) {
      console.warn("Could not create exports bucket:", createErr.message);
      return null;
    }
    console.log("Created exports bucket");
  }

  const zip = new JSZip();
  let totalBytes = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const url = signedUrls[i];
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      totalBytes += buf.byteLength;
      if (totalBytes > MAX_ARCHIVE_SIZE) {
        zip.file("_NOTE.txt",
          `Export truncated at ${i} of ${filePaths.length} files (> ${MAX_ARCHIVE_SIZE / 1024 / 1024} MB).\n` +
          `Use individual URLs from Settings for the rest.`
        );
        break;
      }
      zip.file(filePaths[i].name, new Uint8Array(buf));
    } catch {
      continue;
    }
  }

  const fileCount = Object.keys(zip.files).filter((k) => !zip.files[k].dir).length;
  if (fileCount === 0) return null;

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const outputPath = `${householdId}/export-${Date.now()}.zip`;

  const { error: upErr } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(outputPath, await zipBlob.arrayBuffer(), {
      contentType: "application/zip",
      upsert: false,
    });

  if (upErr) {
    console.error("Upload failed:", upErr.message);
    // Try with upsert
    const { error: upErr2 } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .upload(outputPath, await zipBlob.arrayBuffer(), {
        contentType: "application/zip",
        upsert: true,
      });
    if (upErr2) {
      console.error("Upload (retry) failed:", upErr2.message);
      return null;
    }
  }

  const { data: signed } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);

  if (!signed?.signedUrl) return null;

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
