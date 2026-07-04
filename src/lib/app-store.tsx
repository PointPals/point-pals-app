import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_KIDS, INITIAL_CHORES, INITIAL_SKILLS, INITIAL_HOUSEHOLD,
  INITIAL_HISTORY, INITIAL_PROPOSALS, COMPANIONS,
  type Kid, type Chore, type Skill, type PointEvent, type RewardProposal, type PastelKey,
} from "./mock-data";

type Household = { name: string; sharedPool: number; rewardTarget: number };

type Ctx = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: PointEvent[];
  proposals: RewardProposal[];
  unlockedCompanionIds: string[];
  awardPoints: (kidIds: string[], item: { name: string; icon: string; points: number }) => void;
  addChore: (c: Omit<Chore, "id">) => void;
  addSkill: (s: Omit<Skill, "id">) => void;
  removeChore: (id: string) => void;
  removeSkill: (id: string) => void;
  addProposal: (kidId: string, name: string) => void;
  voteProposal: (kidId: string, proposalId: string) => void;
  selectReward: (proposalId: string) => void;
  setRewardTarget: (n: number) => void;
  setHouseholdName: (n: string) => void;
  addKid: (name: string, color: PastelKey) => void;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export function AppProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household>(INITIAL_HOUSEHOLD);
  const [kids, setKids] = useState<Kid[]>(INITIAL_KIDS);
  const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES);
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [history, setHistory] = useState<PointEvent[]>(INITIAL_HISTORY);
  const [proposals, setProposals] = useState<RewardProposal[]>(INITIAL_PROPOSALS);

  const unlockedCompanionIds = useMemo(
    () => COMPANIONS.filter((c) => household.sharedPool >= c.unlockAt).map((c) => c.id),
    [household.sharedPool],
  );

  const value: Ctx = {
    household,
    kids,
    chores,
    skills,
    history,
    proposals,
    unlockedCompanionIds,
    awardPoints: (kidIds, item) => {
      setKids((prev) =>
        prev.map((k) =>
          kidIds.includes(k.id) ? { ...k, points: Math.max(0, k.points + item.points) } : k,
        ),
      );
      // Shared pool grows only on positive points, and only once per multi-kid tap
      // (household earns the base value, not multiplied by kid count).
      if (item.points > 0) {
        setHousehold((h) => ({ ...h, sharedPool: h.sharedPool + item.points }));
      }
      const now = Date.now();
      setHistory((prev) => [
        ...kidIds.map((kid, i) => ({
          id: uid() + i,
          kidId: kid,
          itemName: item.name,
          itemIcon: item.icon,
          points: item.points,
          at: now,
        })),
        ...prev,
      ].slice(0, 100));
    },
    addChore: (c) => setChores((prev) => [...prev, { ...c, id: uid() }]),
    addSkill: (s) => setSkills((prev) => [...prev, { ...s, id: uid() }]),
    removeChore: (id) => setChores((prev) => prev.filter((c) => c.id !== id)),
    removeSkill: (id) => setSkills((prev) => prev.filter((s) => s.id !== id)),
    addProposal: (kidId, name) =>
      setProposals((prev) => [...prev, { id: uid(), proposedByKidId: kidId, name, votes: [kidId] }]),
    voteProposal: (kidId, proposalId) =>
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== proposalId) return { ...p, votes: p.votes.filter((v) => v !== kidId) };
          return p.votes.includes(kidId) ? p : { ...p, votes: [...p.votes, kidId] };
        }),
      ),
    selectReward: (proposalId) => {
      const chosen = proposals.find((p) => p.id === proposalId);
      if (!chosen) return;
      setProposals([]);
      setHousehold((h) => ({ ...h, sharedPool: Math.max(0, h.sharedPool - h.rewardTarget) }));
      // eslint-disable-next-line no-alert
      alert(`🎉 Reward chosen: ${chosen.name}!`);
    },
    setRewardTarget: (n) => setHousehold((h) => ({ ...h, rewardTarget: n })),
    setHouseholdName: (name) => setHousehold((h) => ({ ...h, name })),
    addKid: (name, color) =>
      setKids((prev) => [...prev, { id: uid(), name, color, points: 0 }]),
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside <AppProvider>");
  return ctx;
}
