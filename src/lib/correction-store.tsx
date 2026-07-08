// Active reward + reward history, layered beside the main app store.
//
// Demo mode persists to localStorage so a reload keeps the reward the family
// set; live mode loads history from the reward_history table and writes claims
// back to it. The reset half of a claim (zeroing every kid's currentPoints and
// the shared pool) is delegated to the app store's resetRewardCycle so demo
// and live behave identically.

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useApp } from "./app-store";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RewardHistory } from "./mock-data";

// The generated types file is still the placeholder (see docs/OPERATIONS.md),
// so reward_history isn't in the client's table map yet.
const db = supabase as unknown as SupabaseClient;

type ActiveReward = { name: string; targetPoints: number } | null;

type CorrectionCtx = {
  rewardHistory: RewardHistory[];
  claimReward: (rewardName: string, targetPoints: number) => void;
  setActiveReward: (name: string, targetPoints: number) => void;
  clearActiveReward: () => void;
  activeReward: ActiveReward;
};

const REWARD_KEY = "pointpals.rewards.v1";

type PersistedRewards = { activeReward: ActiveReward; rewardHistory: RewardHistory[] };

function loadLocal(): PersistedRewards {
  if (typeof window === "undefined") return { activeReward: null, rewardHistory: [] };
  try {
    const raw = window.localStorage.getItem(REWARD_KEY);
    if (!raw) return { activeReward: null, rewardHistory: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedRewards>;
    return {
      activeReward: parsed.activeReward ?? null,
      rewardHistory: parsed.rewardHistory ?? [],
    };
  } catch {
    return { activeReward: null, rewardHistory: [] };
  }
}

const CorrectionCtxProvider = createContext<CorrectionCtx | null>(null);

export function CorrectionProvider({ children }: { children: ReactNode }) {
  const { kids, household, mode, resetRewardCycle } = useApp();
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [activeReward, setActiveRewardState] = useState<ActiveReward>(null);
  const [hydrated, setHydrated] = useState(false);
  const live = mode === "live";

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    const local = loadLocal();
    setActiveRewardState(local.activeReward);
    setRewardHistory(local.rewardHistory);
    setHydrated(true);
  }, []);

  // Live mode: hydrate active reward from household row (server source of truth).
  // IMPORTANT: Only hydrate if the DB has a value. The `else` branch that sets
  // null is deliberately omitted to avoid a race-condition bug:
  //   saveReward() fires TWO separate writes (persistActiveReward and
  //   setRewardTarget). If setRewardTarget's Realtime notification arrives
  //   first, the household has activeRewardName:null because persistActiveReward
  //   hasn't landed yet. The old `else` would then clear activeRewardState, and
  //   the persist-to-localStorage effect would save null — permanently losing
  //   the reward until the user re-sets it.
  // The reward is properly cleared via clearActiveReward() / claimReward().
  useEffect(() => {
    if (!live || !household.id) return;
    if (household.activeRewardName) {
      setActiveRewardState({
        name: household.activeRewardName,
        targetPoints: household.activeRewardTarget ?? household.rewardTarget,
      });
    }
  }, [live, household.id, household.activeRewardName, household.activeRewardTarget]);

  // Persist on change (both modes — the active reward has no server home yet,
  // and a cached copy of history is harmless if the server list loads over it).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(REWARD_KEY, JSON.stringify({ activeReward, rewardHistory }));
    } catch {
      /* storage blocked — session-only */
    }
  }, [activeReward, rewardHistory, hydrated]);

  // Live mode: the reward_history table is the source of truth for past rewards.
  useEffect(() => {
    if (!live || !household.id) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from("reward_history")
        .select("id, reward_name, target_points, achieved_at, contributing_kid_ids")
        .eq("household_id", household.id)
        .order("achieved_at", { ascending: false });
      if (cancelled || error || !data) return;
      setRewardHistory(
        (
          data as {
            id: string;
            reward_name: string;
            target_points: number;
            achieved_at: string;
            contributing_kid_ids: string[] | null;
          }[]
        ).map((r) => ({
          id: r.id,
          rewardName: r.reward_name,
          targetPoints: r.target_points,
          achievedAt: new Date(r.achieved_at).getTime(),
          contributingKidIds: r.contributing_kid_ids ?? [],
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [live, household.id]);

  const uid = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  // Live mode: the reward also lives on the households row so it survives
  // sign-out/sign-in and shows up on every family member's device.
  // We write active_reward_name/target AND reward_target atomically in one
  // UPDATE so there's no race condition with the app-store's setRewardTarget
  // write — both saveReward paths converge on the same single DB round-trip.
  const persistActiveReward = useCallback(
    (reward: ActiveReward) => {
      if (!live || !household.id) return;
      // When reward is null (clear), keep reward_target at its default value
      // but set active_reward_name/target to null.
      const name = reward !== null ? reward.name : null;
      const target = reward !== null ? reward.targetPoints : null;
      void db
        .from("households")
        .update({
          reward_target: target ?? household.rewardTarget,
          active_reward_name: name,
          active_reward_target: target,
        })
        .eq("id", household.id)
        .then(() => {
          /* success — Realtime syncs the rest */
        })
        .catch((err) => {
          console.error("persistActiveReward update failed:", err);
        });
    },
    [live, household.id, household.rewardTarget],
  );

  const claimReward = useCallback(
    (rewardName: string, targetPoints: number) => {
      const entry: RewardHistory = {
        id: uid(),
        rewardName,
        targetPoints,
        achievedAt: Date.now(),
        // "Who had marbles in the jar" — everyone currently on the roster.
        contributingKidIds: kids.map((k) => k.id),
      };
      setRewardHistory((prev) => [entry, ...prev]);

      if (live) {
        void db.from("reward_history").insert({
          id: entry.id,
          household_id: household.id,
          reward_name: rewardName,
          target_points: targetPoints,
          contributing_kid_ids: entry.contributingKidIds,
        });
      }

      // Start the next cycle: every kid's currentPoints and the pool go to 0
      // (allTimePoints untouched), and the parent is prompted for a new reward.
      resetRewardCycle();
      setActiveRewardState(null);
      persistActiveReward(null);
    },
    [live, household.id, kids, resetRewardCycle, persistActiveReward],
  );

  const setActiveReward = useCallback(
    (name: string, targetPoints: number) => {
      setActiveRewardState({ name, targetPoints });
      persistActiveReward({ name, targetPoints });
    },
    [persistActiveReward],
  );

  const clearActiveReward = useCallback(() => {
    setActiveRewardState(null);
    persistActiveReward(null);
  }, [persistActiveReward]);

  return (
    <CorrectionCtxProvider.Provider
      value={{ rewardHistory, claimReward, setActiveReward, clearActiveReward, activeReward }}
    >
      {children}
    </CorrectionCtxProvider.Provider>
  );
}

export function useCorrection(): CorrectionCtx {
  const ctx = useContext(CorrectionCtxProvider);
  if (!ctx) throw new Error("useCorrection must be inside <CorrectionProvider>");
  return ctx;
}
