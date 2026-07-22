// Shareable read-only "Kids' view" link (family-wide).
//
// A per-household token backs a public /k/<token> page kids open on their own
// device (no login, no PIN). Settings generates/copies/regenerates the link;
// the public route fetches the data via the get_kids_view RPC. See the
// 20260721000000_kids_view_link.sql migration.
//
// NOTE: kids_view_token / get_kids_view aren't in the generated Supabase types
// yet, so the calls are cast (mirroring the existing `as never` casts used for
// other freshly-added columns/tables in this codebase).

import { supabase } from "@/integrations/supabase/client";

export type KidsViewKid = {
  id: string;
  name: string;
  color: string;
  companionId: string | null;
  currentPoints: number;
  allTimePoints: number;
  personalPool: number;
  personalTarget: number;
};

export type KidsViewData = {
  household: {
    name: string;
    sharedPool: number;
    rewardTarget: number;
    rewardName?: string | null;
    splitJarsEnabled: boolean;
    sharedJarEnabled: boolean;
  };
  kids: KidsViewKid[];
};

/** The public URL a kid opens / saves to their home screen. */
export function kidsViewLinkUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://pointpals.co.nz";
  return `${origin}/k/${token}`;
}

// The generated client is typed against a placeholder schema that predates the
// RPC, so call it through a minimal structural cast.
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type KidsViewResult =
  | { status: "ok"; data: KidsViewData }
  | { status: "empty" } // the RPC ran but no household matched the token
  | { status: "error" }; // transient / network / RPC failure — safe to retry

/** Public read: fetch the read-only jars/points for a share token. */
export async function fetchKidsView(token: string): Promise<KidsViewResult> {
  try {
    const { data, error } = await (supabase as unknown as RpcClient).rpc("get_kids_view", {
      p_token: token.trim(),
    });
    if (error) return { status: "error" };
    if (!data) return { status: "empty" };
    return { status: "ok", data: data as KidsViewData };
  } catch {
    return { status: "error" };
  }
}

/** Parent (authed): the household's current share token, or null. */
export async function fetchKidsViewToken(householdId: string): Promise<string | null> {
  const { data } = await supabase
    .from("households")
    .select("kids_view_token" as never)
    .eq("id", householdId)
    .maybeSingle();
  return (data as { kids_view_token?: string } | null)?.kids_view_token ?? null;
}

/** Parent (authed): rotate the token, invalidating any previously shared link. */
export async function regenerateKidsViewToken(householdId: string): Promise<string | null> {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { error } = await supabase
    .from("households")
    .update({ kids_view_token: token } as never)
    .eq("id", householdId);
  return error ? null : token;
}
