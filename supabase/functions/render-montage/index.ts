// Edge Function: render-montage
// Turns a household's current memory season into an MP4 slideshow montage via
// the Shotstack render API, storing the result in the private "exports"
// bucket and handing back short-lived signed URLs.
//
// POST /render-montage   (caller: signed-in household member)
//   { householdId: "uuid", action: "start" }            → { jobId, status }
//   { householdId: "uuid", action: "status", jobId }    → { status, url? }
//
// Privacy: only time-limited signed URLs ever leave this function — the
// render service never sees the raw bucket, and the finished video is pulled
// back into our own private storage as soon as the render completes.
//
// Cost control: one montage per season on the free tier, a small cap for
// active subscribers. A queued/rendering job is returned as-is (idempotent).
//
// Secrets: SHOTSTACK_API_KEY (required to render), SHOTSTACK_ENV ("v1" prod /
// "stage" sandbox, default "v1"), SHOTSTACK_SOUNDTRACK_URL (optional music).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Inline shared helpers (avoid _shared/ import bundling issues) ──────────

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

// ── End of inlined helpers ─────────────────────────────────────────────────

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const IMAGE_SECONDS = 3;
const VIDEO_SECONDS = 5;
const TITLE_SECONDS = 3;
const MAX_CLIPS = 60; // keeps renders/downloads a sane size
const SIGNED_ASSET_TTL = 24 * 60 * 60; // renders can queue — give sources a day
const SIGNED_DOWNLOAD_TTL = 60 * 60;
const FREE_MONTAGES_PER_SEASON = 1;
const PAID_MONTAGES_PER_SEASON = 5;

function shotstackBase(): string {
  const env = Deno.env.get("SHOTSTACK_ENV") ?? "v1";
  return `https://api.shotstack.io/edit/${env}`;
}

type MediaItem = { path: string; kind: "image" | "video" };

type PostRow = {
  id: string;
  storage_path: string | null;
  media_type: "image" | "video" | null;
  media_paths: MediaItem[] | null;
  created_at: string;
};

function postMedia(p: PostRow): MediaItem[] {
  if (Array.isArray(p.media_paths) && p.media_paths.length > 0) {
    return p.media_paths.filter((m) => m?.path);
  }
  if (p.storage_path) return [{ path: p.storage_path, kind: p.media_type ?? "image" }];
  return [];
}

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { householdId, action, jobId } = await req.json();
    if (!householdId) return json({ ok: false, error: "householdId is required" }, 400);

    // ── AUTH: signed-in member of this household ────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: member } = await admin
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return json({ ok: false, error: "Not a member of this household" }, 403);

    if (action === "status") {
      if (!jobId) return json({ ok: false, error: "jobId is required" }, 400);
      return await handleStatus(householdId, jobId);
    }
    return await handleStart(householdId, user.id);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ── START: build the edit and submit the render ──────────────────────────

async function handleStart(householdId: string, userId: string): Promise<Response> {
  const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "not_configured" }, 501);
  }

  const { data: hh } = await admin
    .from("households")
    .select("name, subscription_status, memory_cycle_started_at, memory_cycle_ends_at")
    .eq("id", householdId)
    .maybeSingle();
  if (!hh) return json({ ok: false, error: "Household not found" }, 404);

  // Idempotency: an in-flight job for this season is simply returned.
  const { data: existing } = await admin
    .from("montage_jobs")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("cycle_ends_at", hh.memory_cycle_ends_at)
    .in("status", ["queued", "rendering"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing && existing.length > 0) {
    return json({ ok: true, jobId: existing[0].id, status: existing[0].status });
  }

  // Per-season cap: 1 on the free tier, a small cap for subscribers.
  const paid = hh.subscription_status === "active" || hh.subscription_status === "trialing";
  const cap = paid ? PAID_MONTAGES_PER_SEASON : FREE_MONTAGES_PER_SEASON;
  const { count: doneCount } = await admin
    .from("montage_jobs")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("cycle_ends_at", hh.memory_cycle_ends_at)
    .eq("status", "done");
  if ((doneCount ?? 0) >= cap) {
    return json({ ok: false, error: "season_limit_reached", limit: cap }, 429);
  }

  // ── Gather the season, oldest first ─────────────────────────────────
  const { data: posts, error: postErr } = await admin
    .from("memory_posts")
    .select("id, storage_path, media_type, media_paths, created_at")
    .eq("household_id", householdId)
    .gte("created_at", hh.memory_cycle_started_at)
    .order("created_at", { ascending: true });
  if (postErr) return json({ ok: false, error: postErr.message }, 500);

  const items: MediaItem[] = (posts ?? []).flatMap((p) => postMedia(p as PostRow)).slice(0, MAX_CLIPS);
  if (items.length === 0) {
    return json({ ok: false, error: "no_memories" }, 400);
  }

  // ── Build the Shotstack edit: title card, then one clip per item.
  // Sources are 24h signed URLs — the render service never sees the bucket.
  const clips: Record<string, unknown>[] = [];
  let cursor = 0;

  clips.push({
    asset: {
      type: "title",
      text: `The ${hh.name} family\n${formatNzDate(hh.memory_cycle_started_at)} – ${formatNzDate(hh.memory_cycle_ends_at)}`,
      style: "chunk",
      size: "small",
    },
    start: cursor,
    length: TITLE_SECONDS,
    transition: { in: "fade", out: "fade" },
  });
  cursor += TITLE_SECONDS;

  for (const item of items) {
    const { data: signed, error: signErr } = await admin.storage
      .from("memories")
      .createSignedUrl(item.path, SIGNED_ASSET_TTL);
    if (signErr || !signed?.signedUrl) continue;

    if (item.kind === "video") {
      clips.push({
        asset: { type: "video", src: signed.signedUrl, trim: 0, volume: 1 },
        start: cursor,
        length: VIDEO_SECONDS,
        transition: { in: "fade", out: "fade" },
      });
      cursor += VIDEO_SECONDS;
    } else {
      clips.push({
        asset: { type: "image", src: signed.signedUrl },
        start: cursor,
        length: IMAGE_SECONDS,
        effect: "zoomIn",
        transition: { in: "fade", out: "fade" },
      });
      cursor += IMAGE_SECONDS;
    }
  }

  if (clips.length <= 1) {
    return json({ ok: false, error: "could not sign any media" }, 500);
  }

  const timeline: Record<string, unknown> = {
    background: "#000000",
    tracks: [{ clips }],
  };
  const soundtrack = Deno.env.get("SHOTSTACK_SOUNDTRACK_URL");
  if (soundtrack) {
    timeline.soundtrack = { src: soundtrack, effect: "fadeInFadeOut" };
  }

  const edit = {
    timeline,
    output: { format: "mp4", resolution: "hd", fps: 25 },
  };

  const res = await fetch(`${shotstackBase()}/render`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
  const body = await res.json().catch(() => null);
  const renderId = body?.response?.id;
  if (!res.ok || !renderId) {
    console.error("Shotstack submit failed:", res.status, JSON.stringify(body));
    return json({ ok: false, error: "render submit failed" }, 502);
  }

  const { data: job, error: jobErr } = await admin
    .from("montage_jobs")
    .insert({
      household_id: householdId,
      requested_by: userId,
      status: "rendering",
      provider: "shotstack",
      provider_render_id: renderId,
      cycle_ends_at: hh.memory_cycle_ends_at,
      post_count: posts?.length ?? 0,
    })
    .select("id")
    .single();
  if (jobErr || !job) return json({ ok: false, error: jobErr?.message ?? "job insert failed" }, 500);

  return json({ ok: true, jobId: job.id, status: "rendering" });
}

// ── STATUS: poll the provider, land the MP4 in our own bucket ─────────────

async function sendMontageReadyEmail(
  householdId: string,
  jobId: string,
  outputPath: string,
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.log("No RESEND_API_KEY — skipping montage-ready email");
    return;
  }

  try {
    // Household name
    const { data: hh } = await admin
      .from("households")
      .select("name, memory_cycle_started_at, memory_cycle_ends_at")
      .eq("id", householdId)
      .maybeSingle();
    if (!hh) {
      console.warn(`Household ${householdId} not found — skipping email`);
      return;
    }

    // Job detail (post_count, cycle_ends_at)
    const { data: jobRow } = await admin
      .from("montage_jobs")
      .select("post_count, cycle_ends_at")
      .eq("id", jobId)
      .maybeSingle();

    // Primary admin/parent for the billing contact
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .in("role", ["admin", "parent"])
      .order("created_at", { ascending: true })
      .limit(1);
    if (!members || members.length === 0) {
      console.warn(`Household ${householdId} has no admin/parent — skipping email`);
      return;
    }

    const { data: userData } = await admin.auth.admin.getUserById(members[0].user_id);
    if (!userData?.user?.email) {
      console.warn(`User ${members[0].user_id} has no email — skipping`);
      return;
    }

    const email = userData.user.email;
    const meta = userData.user.user_metadata ?? {};
    const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";
    const seasonLabel = hh.memory_cycle_ends_at
      ? `${formatNzDate(hh.memory_cycle_started_at)} \u2013 ${formatNzDate(hh.memory_cycle_ends_at)}`
      : "this season";

    const { data: hhSub } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .maybeSingle();
    const paid = hhSub?.subscription_status === "active" || hhSub?.subscription_status === "trialing";

    const { data: signed } = await admin.storage
      .from("exports")
      .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);
    if (!signed?.signedUrl) {
      console.warn("Could not sign export URL for email — skipping");
      return;
    }

    const memoryPlural = (jobRow?.post_count ?? 0) === 1 ? "memory" : "memories";

    const result = await sendResendTemplate(resendKey, {
      to: email,
      from: FROM_ADDRESS,
      subject: `Your ${hh.name} family season montage is ready \uD83C\uDFAC`,
      templateId: "0988eb46-0a1b-4564-8f59-d4b241a336d9",
      variables: {
        first_name: firstName,
        family_name: hh.name,
        season_label: seasonLabel,
        memory_count: String(jobRow?.post_count ?? 0),
        memory_plural: memoryPlural,
        has_videos: "false",
        download_url: signed.signedUrl,
        expires_in_hours: String(Math.floor(SIGNED_DOWNLOAD_TTL / 3600)),
        season_limit: String(paid ? PAID_MONTAGES_PER_SEASON : FREE_MONTAGES_PER_SEASON),
        memories_url: `${APP_URL}/memories`,
        unsubscribe_url: "https://pointpals.co.nz/settings",
      },
    });

    if (result.ok) {
      console.log(`Montage-ready email sent to ${email} (${hh.name})`);
    } else {
      console.warn(`Failed to send montage-ready email to ${email}: ${result.status}`);
    }
  } catch (e) {
    // Log but don't fail — the render already succeeded
    console.error("sendMontageReadyEmail error:", e instanceof Error ? e.message : String(e));
  }
}

async function handleStatus(householdId: string, jobId: string): Promise<Response> {
  const { data: job } = await admin
    .from("montage_jobs")
    .select("id, household_id, status, provider_render_id, output_path, error")
    .eq("id", jobId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!job) return json({ ok: false, error: "Job not found" }, 404);

  if (job.status === "done" && job.output_path) {
    const { data: signed } = await admin.storage
      .from("exports")
      .createSignedUrl(job.output_path, SIGNED_DOWNLOAD_TTL);
    return json({ ok: true, status: "done", url: signed?.signedUrl });
  }
  if (job.status === "failed") {
    return json({ ok: true, status: "failed", error: job.error });
  }

  const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
  if (!apiKey || !job.provider_render_id) {
    return json({ ok: true, status: job.status });
  }

  const res = await fetch(`${shotstackBase()}/render/${job.provider_render_id}`, {
    headers: { "x-api-key": apiKey },
  });
  const body = await res.json().catch(() => null);
  const providerStatus = body?.response?.status as string | undefined;

  if (providerStatus === "failed") {
    const reason = body?.response?.error ?? "render failed";
    await admin.from("montage_jobs").update({ status: "failed", error: reason }).eq("id", job.id);
    return json({ ok: true, status: "failed", error: reason });
  }

  if (providerStatus !== "done" || !body?.response?.url) {
    return json({ ok: true, status: "rendering" });
  }

  // Pull the finished MP4 into our private exports bucket, then serve it
  // with a signed URL — the provider's hosted copy expires on its own.
  const videoRes = await fetch(body.response.url);
  if (!videoRes.ok) {
    return json({ ok: true, status: "rendering" }); // transient — retry next poll
  }
  const outputPath = `${householdId}/montage-${job.id}.mp4`;
  const { error: upErr } = await admin.storage
    .from("exports")
    .upload(outputPath, await videoRes.blob(), { contentType: "video/mp4", upsert: true });
  if (upErr) {
    console.error("exports upload failed:", upErr.message);
    return json({ ok: true, status: "rendering" }); // retry next poll
  }

  // ── Idempotent done transition ─────────────────────────────────────
  const { data: current } = await admin
    .from("montage_jobs")
    .select("status")
    .eq("id", job.id)
    .single();

  if (current?.status !== "done") {
    await admin
      .from("montage_jobs")
      .update({ status: "done", output_path: outputPath })
      .eq("id", job.id);

    // Fire-and-forget: send email notification (logged internally)
    void sendMontageReadyEmail(householdId, jobId, outputPath);
  }

  const { data: signed } = await admin.storage
    .from("exports")
    .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);
  return json({ ok: true, status: "done", url: signed?.signedUrl });
}
