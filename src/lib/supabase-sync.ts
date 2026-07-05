// Supabase read/write helpers for the app-store live mode.
//
// The app-store owns local state; this module is a thin translation layer that
// (a) fetches the full "household bundle" on sign-in and (b) exposes the
// canonical row shapes for realtime handlers. All writes still go through
// supabase directly from the store — those calls are one-liners not worth
// abstracting.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Household } from "./app-store";
import type { Chore, Kid, PointEvent, PastelKey, RewardProposal, Skill } from "./mock-data";

type DbKid = Database["public"]["Tables"]["kids"]["Row"];
type DbChore = Database["public"]["Tables"]["chores"]["Row"];
type DbSkill = Database["public"]["Tables"]["skills"]["Row"];
type DbHousehold = Database["public"]["Tables"]["households"]["Row"];
type DbEvent = Database["public"]["Tables"]["point_events"]["Row"];
type DbProposal = Database["public"]["Tables"]["reward_proposals"]["Row"];
type DbVote = Database["public"]["Tables"]["reward_votes"]["Row"];

export function mapKid(row: DbKid): Kid {
  return {
    id: row.id,
    name: row.name,
    color: (row.color as PastelKey) ?? "sky",
    currentPoints: (row as any).current_points ?? row.points,
    allTimePoints: (row as any).all_time_points ?? row.points,
    companionId: row.avatar_key ?? undefined,
  };
}

export function mapChore(row: DbChore): Chore {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: (row.color as PastelKey) ?? "sky",
    points: row.points,
    recurrence: (row.recurrence as Chore["recurrence"]) ?? "none",
    tags: [], // tags column not present in DB yet — local-only, resets on reload
  };
}

export function mapSkill(row: DbSkill): Skill {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: (row.color as PastelKey) ?? "sky",
    points: row.points,
    isPositive: row.is_positive,
  };
}

export function mapHousehold(row: DbHousehold): Household {
  return {
    id: row.id,
    name: row.name,
    sharedPool: row.shared_pool,
    rewardTarget: row.reward_target,
    subscriptionStatus:
      (row.subscription_status as Household["subscriptionStatus"]) ?? "trialing",
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null,
    onboarded: row.onboarded,
  };
}

export function mapEvent(row: DbEvent): PointEvent & { batchId?: string | null } {
  return {
    id: row.id,
    kidId: row.kid_id,
    itemName: row.item_name,
    itemIcon: row.item_icon,
    points: row.points,
    at: new Date(row.created_at).getTime(),
    batchId: row.batch_id,
  };
}

export type HouseholdBundle = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: (PointEvent & { batchId?: string | null })[];
  proposals: RewardProposal[];
};

/** Fetch the household for the current user, plus everything hanging off it. */
export async function fetchHouseholdBundle(
  householdId: string,
): Promise<HouseholdBundle | null> {
  const [hh, kids, chores, skills, events, proposals, votes] = await Promise.all([
    supabase.from("households").select("*").eq("id", householdId).maybeSingle(),
    supabase.from("kids").select("*").eq("household_id", householdId),
    supabase.from("chores").select("*").eq("household_id", householdId),
    supabase.from("skills").select("*").eq("household_id", householdId),
    supabase
      .from("point_events")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("reward_proposals").select("*").eq("household_id", householdId),
    supabase.from("reward_votes").select("*"),
  ]);
  if (hh.error || !hh.data) return null;

  const proposalRows = (proposals.data ?? []) as DbProposal[];
  const voteRows = (votes.data ?? []) as DbVote[];

  return {
    household: mapHousehold(hh.data),
    kids: (kids.data ?? []).map(mapKid),
    chores: (chores.data ?? []).map(mapChore),
    skills: (skills.data ?? []).map(mapSkill),
    history: (events.data ?? []).map(mapEvent),
    proposals: proposalRows.map((p) => ({
      id: p.id,
      proposedByKidId: p.proposed_by ?? "",
      name: p.name,
      votes: voteRows.filter((v) => v.proposal_id === p.id).map((v) => v.kid_id),
    })),
  };
}

/**
 * Look up the user's primary household. Picks the oldest membership when a user
 * belongs to more than one (rare — invite-based sharing).
 */
export async function fetchPrimaryHouseholdId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].household_id;
}
