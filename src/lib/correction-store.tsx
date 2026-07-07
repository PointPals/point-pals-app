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
    },
    [live, household.id, kids, resetRewardCycle],
  );

  const setActiveReward = useCallback((name: string, targetPoints: number) => {
    setActiveRewardState({ name, targetPoints });
  }, []);

  const clearActiveReward = useCallback(() => {
    setActiveRewardState(null);
  }, []);

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
