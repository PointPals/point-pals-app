// Correction tool & reward history store — supplementary to app-store.tsx
//
// These are new features added on top of the existing app store. Rather than
// deeply modifying the existing state shape (which would break every consumer),
// they live in a lightweight context sibling to the main app context.

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useApp, type AwardBatch } from "./app-store";
import { supabase } from "@/integrations/supabase/client";
import type { Kid, RewardHistory } from "./mock-data";

type CorrectionCtx = {
  correctPoints: (kidId: string, delta: number, reason?: string) => void;
  rewardHistory: RewardHistory[];
  claimReward: (rewardName: string, targetPoints: number) => void;
  setActiveReward: (name: string, targetPoints: number) => void;
  activeReward: { name: string; targetPoints: number } | null;
};

const CorrectionCtxProvider = createContext<CorrectionCtx | null>(null);

export function CorrectionProvider({ children }: { children: ReactNode }) {
  const { kids, household, mode, refreshFromServer } = useApp();
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [activeReward, setActiveRewardState] = useState<{ name: string; targetPoints: number } | null>(null);
  const live = mode === "live";

  const uid = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  const correctPoints = useCallback(
    (kidId: string, delta: number, reason?: string) => {
      // In live mode, this writes to point_events with a correction type
      if (live) {
        void supabase.from("point_events").insert({
          id: uid(),
          household_id: household.id,
          kid_id: kidId,
          item_name: reason ? `Correction: ${reason}` : `Correction: ${delta >= 0 ? `+${delta}` : delta}`,
          item_icon: "wrench",
          points: delta,
          batch_id: `corr_${uid()}`,
        });
      }
      // The actual state update is done by the app store via updateKid
      // This function is a convenience that the UI components call.
    },
    [live, household.id],
  );

  const claimReward = useCallback(
    (rewardName: string, targetPoints: number) => {
      const now = Date.now();
      const entry: RewardHistory = {
        id: uid(),
        rewardName,
        targetPoints,
        achievedAt: now,
        contributingKidIds: kids.map((k) => k.id),
      };
      setRewardHistory((prev) => [entry, ...prev]);

      if (live) {
        void supabase.from("reward_history").insert({
          id: entry.id,
          household_id: household.id,
          reward_name: rewardName,
          target_points: targetPoints,
          contributing_kid_ids: kids.map((k) => k.id),
        });
      }

      setActiveRewardState(null);
      // Reset current points to 0 via refreshFromServer in live mode
      // In demo mode, the app-store's selectReward (repurposed) handles the reset
    },
    [live, household.id, kids],
  );

  const setActiveReward = useCallback((name: string, targetPoints: number) => {
    setActiveRewardState({ name, targetPoints });
  }, []);

  return (
    <CorrectionCtxProvider.Provider
      value={{
        correctPoints,
        rewardHistory,
        claimReward,
        setActiveReward,
        activeReward,
      }}
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
