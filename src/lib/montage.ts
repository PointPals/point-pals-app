// Season montage export (client side).
//
// The memory feed runs in fixed 90-day cycles (see the cycle banner on the
// Memories page — cycle state lives on the households row, maintained by the
// retention cron jobs). The montage itself is rendered asynchronously by the
// render-montage edge function and polled here until the MP4 is ready.

import { supabase } from "@/integrations/supabase/client";

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

/** Human-readable copy for montage error codes. */
export function montageErrorMessage(code: string): string {
  switch (code) {
    case "not_configured":
      return "Montage rendering isn't switched on yet — it's coming soon.";
    case "season_limit_reached":
      return "You've already made this cycle's montage. Subscribers can render a few extra takes.";
    case "no_memories":
      return "Nothing in the feed this cycle yet — add some memories first.";
    default:
      return "Couldn't create the montage right now — please try again later.";
  }
}
