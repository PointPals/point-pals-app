import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_KIDS,
  INITIAL_CHORES,
  INITIAL_SKILLS,
  INITIAL_HOUSEHOLD,
  INITIAL_HISTORY,
  INITIAL_PROPOSALS,
  type Kid,
  type Chore,
  type Skill,
  type PointEvent,
  type RewardProposal,
  type PastelKey,
} from "./mock-data";

// Client-side app state for the PointPals prototype.
//
// Backend note: this is intentionally a swappable seam. Every mutation below is
// a pure state transition that maps 1:1 to a Supabase table write (households,
// kids, chores, skills, point_events, reward_proposals — see
// supabase/migrations). When the project is reachable, replace the useState
// backing with react-query mutations against those tables; the component API
// (useApp) stays identical. State is persisted to localStorage so the app feels
// continuous across reloads in the meantime.

export type Household = {
  id: string;
  name: string;
  sharedPool: number;
  rewardTarget: number;
  // Entitlement layer (§5) — checked to gate parent-facing premium features.
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "free";
  trialEndsAt: number | null;
  onboarded: boolean;
};

// A reversible award batch, kept only until its undo window closes (§2).
export type AwardBatch = {
  id: string;
  at: number;
  kidIds: string[];
  item: { name: string; icon: string; points: number };
  poolDelta: number;
};

type Ctx = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: PointEvent[];
  proposals: RewardProposal[];
  streakByKid: Record<string, number>;
  hydrated: boolean;
  awardPoints: (
    kidIds: string[],
    item: { name: string; icon: string; points: number },
  ) => AwardBatch;
  undoBatch: (batch: AwardBatch) => void;
  addChore: (c: Omit<Chore, "id">) => void;
  addSkill: (s: Omit<Skill, "id">) => void;
  updateChore: (id: string, patch: Partial<Omit<Chore, "id">>) => void;
  updateSkill: (id: string, patch: Partial<Omit<Skill, "id">>) => void;
  updateKid: (id: string, patch: Partial<Omit<Kid, "id">>) => void;
  removeChore: (id: string) => void;
  removeSkill: (id: string) => void;
  addProposal: (kidId: string, name: string) => void;
  voteProposal: (kidId: string, proposalId: string) => void;
  selectReward: (proposalId: string) => string | null;
  setRewardTarget: (n: number) => void;
  setHouseholdName: (n: string) => void;
  setSubscriptionStatus: (s: Household["subscriptionStatus"]) => void;
  completeOnboarding: () => void;
  resetHousehold: () => void;
  addKid: (name: string, color: PastelKey, companionId?: string) => void;
  removeKid: (id: string) => void;
  exportData: () => string;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);
const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

const STORAGE_KEY = "pointpals.state.v2";

type Persisted = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: PointEvent[];
  proposals: RewardProposal[];
};

function initialState(): Persisted {
  return {
    household: INITIAL_HOUSEHOLD,
    kids: INITIAL_KIDS,
    chores: INITIAL_CHORES,
    skills: INITIAL_SKILLS,
    history: INITIAL_HISTORY,
    proposals: INITIAL_PROPOSALS,
  };
}

// Consecutive days (ending today or yesterday) on which a kid completed at least
// one must-do (daily) chore. A broken streak just quietly resets — no penalty
// state is ever surfaced (§4).
function computeStreaks(
  kids: Kid[],
  chores: Chore[],
  history: PointEvent[],
): Record<string, number> {
  const mustDo = new Set(chores.filter((c) => c.recurrence === "daily").map((c) => c.name));
  const out: Record<string, number> = {};
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  for (const kid of kids) {
    const days = new Set(
      history
        .filter((e) => e.kidId === kid.id && e.points > 0 && mustDo.has(e.itemName))
        .map((e) => dayKey(e.at)),
    );
    // Anchor to today if active today, else yesterday (so an as-yet-untouched
    // "today" doesn't zero an existing streak until the day actually lapses).
    let cursor = days.has(today) ? Date.now() : days.has(yesterday) ? Date.now() - 86400000 : null;
    let streak = 0;
    while (cursor !== null && days.has(dayKey(cursor))) {
      streak++;
      cursor -= 86400000;
    }
    out[kid.id] = streak;
  }
  return out;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const didHydrate = useRef(false);

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState((prev) => ({
          household: { ...prev.household, ...parsed.household },
          kids: parsed.kids ?? prev.kids,
          chores: parsed.chores ?? prev.chores,
          skills: parsed.skills ?? prev.skills,
          history: parsed.history ?? prev.history,
          proposals: parsed.proposals ?? prev.proposals,
        }));
      }
    } catch {
      /* corrupt/old state — fall back to seed */
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration, to avoid clobbering saved state).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked — session-only */
    }
  }, [state, hydrated]);

  const { household, kids, chores, skills, history, proposals } = state;

  const streakByKid = useMemo(() => computeStreaks(kids, chores, history), [kids, chores, history]);

  const value: Ctx = {
    household,
    kids,
    chores,
    skills,
    history,
    proposals,
    streakByKid,
    hydrated,
    awardPoints: (kidIds, item) => {
      const now = Date.now();
      // Both positive and negative awards move the shared pool now — negatives
      // cause a marble to dissolve from the jar (§3 marble jar), which only
      // works if the pool actually shrinks. Clamped at 0 below.
      const poolDelta = item.points;
      const batch: AwardBatch = { id: uid(), at: now, kidIds, item, poolDelta };
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          kidIds.includes(k.id) ? { ...k, points: Math.max(0, k.points + item.points) } : k,
        ),
        // Shared pool moves once per tap (not × kid count), clamped at 0.
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool + poolDelta),
        },
        history: [
          ...kidIds.map((kid, i) => ({
            id: batch.id + i,
            kidId: kid,
            itemName: item.name,
            itemIcon: item.icon,
            points: item.points,
            at: now,
          })),
          ...s.history,
        ].slice(0, 200),
      }));
      return batch;
    },
    undoBatch: (batch) =>
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          batch.kidIds.includes(k.id)
            ? { ...k, points: Math.max(0, k.points - batch.item.points) }
            : k,
        ),
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool - batch.poolDelta),
        },
        history: s.history.filter((e) => !e.id.startsWith(batch.id)),
      })),
    addChore: (c) => setState((s) => ({ ...s, chores: [...s.chores, { ...c, id: uid() }] })),
    addSkill: (sk) => setState((s) => ({ ...s, skills: [...s.skills, { ...sk, id: uid() }] })),
    updateChore: (id, patch) =>
      setState((s) => ({
        ...s,
        chores: s.chores.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    updateSkill: (id, patch) =>
      setState((s) => ({
        ...s,
        skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...patch } : sk)),
      })),
    updateKid: (id, patch) =>
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) => (k.id === id ? { ...k, ...patch } : k)),
      })),
    removeChore: (id) => setState((s) => ({ ...s, chores: s.chores.filter((c) => c.id !== id) })),
    removeSkill: (id) => setState((s) => ({ ...s, skills: s.skills.filter((sk) => sk.id !== id) })),
    addProposal: (kidId, name) =>
      setState((s) => ({
        ...s,
        proposals: [...s.proposals, { id: uid(), proposedByKidId: kidId, name, votes: [kidId] }],
      })),
    voteProposal: (kidId, proposalId) =>
      setState((s) => ({
        ...s,
        proposals: s.proposals.map((p) => {
          if (p.id !== proposalId) return { ...p, votes: p.votes.filter((v) => v !== kidId) };
          return p.votes.includes(kidId) ? p : { ...p, votes: [...p.votes, kidId] };
        }),
      })),
    selectReward: (proposalId) => {
      const chosen = proposals.find((p) => p.id === proposalId);
      if (!chosen) return null;
      setState((s) => ({
        ...s,
        proposals: [],
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool - s.household.rewardTarget),
        },
      }));
      return chosen.name;
    },
    setRewardTarget: (n) =>
      setState((s) => ({ ...s, household: { ...s.household, rewardTarget: n } })),
    setHouseholdName: (name) => setState((s) => ({ ...s, household: { ...s.household, name } })),
    setSubscriptionStatus: (status) =>
      setState((s) => ({ ...s, household: { ...s.household, subscriptionStatus: status } })),
    completeOnboarding: () =>
      setState((s) => ({ ...s, household: { ...s.household, onboarded: true } })),
    resetHousehold: () => {
      setState(initialState());
    },
    addKid: (name, color, companionId) =>
      setState((s) => ({
        ...s,
        kids: [...s.kids, { id: uid(), name, color, points: 0, companionId }],
      })),
    removeKid: (id) =>
      setState((s) => ({
        ...s,
        kids: s.kids.filter((k) => k.id !== id),
        history: s.history.filter((e) => e.kidId !== id),
        // Also drop proposals this kid made, and their votes on remaining ones.
        proposals: s.proposals
          .filter((p) => p.proposedByKidId !== id)
          .map((p) => ({ ...p, votes: p.votes.filter((v) => v !== id) })),
      })),
    exportData: () =>
      JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, ...state }, null, 2),
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside <AppProvider>");
  return ctx;
}
