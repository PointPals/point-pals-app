// Memory seasons + montage export (client side).
//
// The memory feed runs in fixed "seasons" (90 days by default). Season state
// lives on the households row (maintained by the retention cron jobs); the
// montage itself is rendered asynchronously by the render-montage edge
// function and polled here until the MP4 is ready.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export type SeasonInfo = {
  enabled: boolean;
  retentionDays: number;
  startedAt: number;
  endsAt: number;
  daysLeft: number;
};

export async function fetchSeasonInfo(householdId: string): Promise<SeasonInfo | null> {
  const { data, error } = await db
    .from("households")
    .select(
      "memory_retention_enabled, memory_retention_days, memory_cycle_started_at, memory_cycle_ends_at",
    )
    .eq("id", householdId)
    .maybeSingle();
  if (error || !data || !data.memory_cycle_ends_at) return null;
  const endsAt = new Date(data.memory_cycle_ends_at).getTime();
  return {
    enabled: data.memory_retention_enabled ?? true,
    retentionDays: data.memory_retention_days ?? 90,
    startedAt: new Date(data.memory_cycle_started_at).getTime(),
    endsAt,
    daysLeft: Math.max(0, Math.ceil((endsAt - Date.now()) / (24 * 60 * 60 * 1000))),
  };
}

/** Settings opt-out: turn the seasonal refresh on/off for a household. */
export async function setSeasonRefreshEnabled(
  householdId: string,
  enabled: boolean,
): Promise<boolean> {
  const { error } = await db
    .from("households")
    .update({ memory_retention_enabled: enabled })
    .eq("id", householdId);
  return !error;
}

// ── Montage rendering ──────────────────────────────────────────────────────

export type MontageResult =
  | { ok: true; jobId: string; status: "queued" | "rendering" | "done"; url?: string }
  | { ok: false; error: string };

async function invokeRenderMontage(body: Record<string, unknown>): Promise<MontageResult> {
  const { data, error } = await supabase.functions.invoke("render-montage", { body });
  if (error) {
    // Non-2xx responses carry a JSON body with a machine-readable error code
    // (not_configured / season_limit_reached / no_memories) — surface it.
    let code = error.message || "montage failed";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const payload = await ctx.json().catch(() => null);
      if (payload?.error) code = payload.error;
    }
    return { ok: false, error: code };
  }
  const out = data as {
    ok?: boolean;
    jobId?: string;
    status?: string;
    url?: string;
    error?: string;
  } | null;
  if (!out?.ok) return { ok: false, error: out?.error ?? "montage failed" };
  if (out.status === "failed") return { ok: false, error: out.error ?? "render failed" };
  return {
    ok: true,
    jobId: out.jobId ?? "",
    status: (out.status as "queued" | "rendering" | "done") ?? "rendering",
    url: out.url,
  };
}

export function startMontage(householdId: string): Promise<MontageResult> {
  return invokeRenderMontage({ householdId, action: "start" });
}

export function pollMontage(householdId: string, jobId: string): Promise<MontageResult> {
  return invokeRenderMontage({ householdId, action: "status", jobId });
}

/** Export all household memories as a ZIP archive (or list of signed URLs). */
export type ExportMemoriesResult =
  | { ok: true; format: "zip"; download_url: string; count: number; total_files: number; size_mb: number; expires_in_seconds: number }
  | { ok: true; format: "urls"; count: number; urls: string[]; expires_in_seconds: number }
  | { ok: false; error: string };

export async function exportMemoriesZip(householdId: string): Promise<ExportMemoriesResult> {
  const { data, error } = await supabase.functions.invoke("export-memories", {
    body: { householdId },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let msg = error.message || "export failed";
    if (ctx && typeof ctx.json === "function") {
      const payload = await ctx.json().catch(() => null);
      if (payload?.error) msg = payload.error;
    }
    return { ok: false, error: msg };
  }
  const out = data as ExportMemoriesResult | null;
  if (!out || !out.ok) return { ok: false, error: (out as { error?: string })?.error ?? "export failed" };
  if (out.format === "zip") {
    return {
      ok: true,
      format: "zip",
      download_url: out.download_url,
      count: out.count,
      total_files: out.total_files,
      size_mb: out.size_mb,
      expires_in_seconds: out.expires_in_seconds,
    };
  }
  return {
    ok: true,
    format: "urls",
    count: out.count,
    urls: out.urls,
    expires_in_seconds: out.expires_in_seconds,
  };
}

/** Human-readable copy for montage error codes. */
export function montageErrorMessage(code: string): string {
  switch (code) {
    case "not_configured":
      return "Montage rendering isn't switched on yet — it's coming soon.";
    case "season_limit_reached":
      return "You've already made this season's montage. Subscribers can render a few extra takes.";
    case "no_memories":
      return "Nothing in the feed this season yet — add some memories first.";
    default:
      return "Couldn't create the montage right now — please try again later.";
  }
}
