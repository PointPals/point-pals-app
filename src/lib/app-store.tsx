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
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchHouseholdBundle,
  fetchPrimaryHouseholdId,
  mapChore,
  mapEvent,
  mapHousehold,
  mapKid,
  mapSkill,
} from "./supabase-sync";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  mode: "demo" | "live";
  needsHousehold: boolean;
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
  /** Called by /welcome-back after a household is created — reboots into live. */
  refreshFromServer: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
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
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [needsHousehold, setNeedsHousehold] = useState(false);
  const householdIdRef = useRef<string | null>(null);
  // Row ids we just wrote — used to suppress realtime echoes of our own writes.
  const echoIds = useRef<Set<string>>(new Set());
  const markEcho = (id: string) => {
    echoIds.current.add(id);
    // Free memory after a while — realtime round-trip is < 2s in practice.
    setTimeout(() => echoIds.current.delete(id), 15000);
  };
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

  // Persist demo state on every change. Live-mode data is on the server; we
  // don't want to shadow it with stale local snapshots.
  useEffect(() => {
    if (!hydrated || mode !== "demo") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked — session-only */
    }
  }, [state, hydrated, mode]);

  // Cross-tab demo sync via the `storage` event. In live mode, realtime does
  // the job across every device — this is just for the signed-out marketing
  // preview so the walking-mascot demo stays lively across tabs.
  useEffect(() => {
    if (!hydrated || mode !== "demo") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as Partial<Persisted>;
        setState((prev) => ({
          household: { ...prev.household, ...parsed.household },
          kids: parsed.kids ?? prev.kids,
          chores: parsed.chores ?? prev.chores,
          skills: parsed.skills ?? prev.skills,
          history: parsed.history ?? prev.history,
          proposals: parsed.proposals ?? prev.proposals,
        }));
      } catch {
        /* ignore malformed cross-tab payload */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated, mode]);

  // ---------------------------------------------------------------------------
  // Live-mode bootstrap: sign-in → fetch bundle → subscribe realtime.
  // ---------------------------------------------------------------------------
  const bootLive = async (userId: string) => {
    const hid = await fetchPrimaryHouseholdId(userId);
    if (!hid) {
      setNeedsHousehold(true);
      setMode("demo"); // stay on seeded data until they create/join
      return;
    }
    setNeedsHousehold(false);
    const bundle = await fetchHouseholdBundle(hid);
    if (!bundle) return;
    householdIdRef.current = hid;
    setState({
      household: bundle.household,
      kids: bundle.kids,
      chores: bundle.chores,
      skills: bundle.skills,
      history: bundle.history,
      proposals: bundle.proposals,
    });
    setMode("live");
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) void bootLive(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void bootLive(session.user.id);
      } else if (event === "SIGNED_OUT") {
        householdIdRef.current = null;
        setMode("demo");
        setNeedsHousehold(false);
        setState(initialState());
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscriptions — one channel per household, torn down on switch.
  useEffect(() => {
    if (mode !== "live" || !householdIdRef.current) return;
    const hid = householdIdRef.current;
    const channel: RealtimeChannel = supabase
      .channel(`household:${hid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "point_events", filter: `household_id=eq.${hid}` },
        (payload) => {
          const newRow = payload.new as Database["public"]["Tables"]["point_events"]["Row"] | null;
          const oldRow = payload.old as { id?: string } | null;
          if (payload.eventType === "INSERT" && newRow) {
            if (echoIds.current.has(newRow.id)) return;
            setState((s) => ({
              ...s,
              history: [mapEvent(newRow), ...s.history].slice(0, 200),
            }));
          } else if (payload.eventType === "DELETE" && oldRow?.id) {
            setState((s) => ({ ...s, history: s.history.filter((e) => e.id !== oldRow.id) }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kids", filter: `household_id=eq.${hid}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as Parameters<typeof mapKid>[0];
            if (echoIds.current.has(row.id) && payload.eventType === "INSERT") return;
            const kid = mapKid(row);
            setState((s) => {
              const exists = s.kids.some((k) => k.id === kid.id);
              return {
                ...s,
                kids: exists ? s.kids.map((k) => (k.id === kid.id ? kid : k)) : [...s.kids, kid],
              };
            });
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setState((s) => ({ ...s, kids: s.kids.filter((k) => k.id !== id) }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${hid}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapHousehold>[0];
          setState((s) => ({ ...s, household: mapHousehold(row) }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chores", filter: `household_id=eq.${hid}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as Parameters<typeof mapChore>[0];
            if (echoIds.current.has(row.id) && payload.eventType === "INSERT") return;
            const c = mapChore(row);
            setState((s) => ({
              ...s,
              chores: s.chores.some((x) => x.id === c.id)
                ? s.chores.map((x) => (x.id === c.id ? { ...x, ...c, tags: x.tags } : x))
                : [...s.chores, c],
            }));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setState((s) => ({ ...s, chores: s.chores.filter((c) => c.id !== id) }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skills", filter: `household_id=eq.${hid}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as Parameters<typeof mapSkill>[0];
            if (echoIds.current.has(row.id) && payload.eventType === "INSERT") return;
            const sk = mapSkill(row);
            setState((s) => ({
              ...s,
              skills: s.skills.some((x) => x.id === sk.id)
                ? s.skills.map((x) => (x.id === sk.id ? sk : x))
                : [...s.skills, sk],
            }));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setState((s) => ({ ...s, skills: s.skills.filter((sk) => sk.id !== id) }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode]);

  const { household, kids, chores, skills, history, proposals } = state;

  const streakByKid = useMemo(() => computeStreaks(kids, chores, history), [kids, chores, history]);

  // ---------------------------------------------------------------------------
  // Write-through helpers. In demo mode these are no-ops; in live mode we push
  // to Supabase and mark the row id so realtime doesn't re-apply our own write.
  // Errors are surfaced to console — the optimistic local update is left in
  // place so the UI doesn't jitter; realtime will eventually reconcile.
  // ---------------------------------------------------------------------------
  const live = mode === "live" && householdIdRef.current;
  const hid = () => householdIdRef.current!;
  const dbWrite = async (
    fn: () => Promise<{ error: { message: string } | null }>,
    ids: string[] = [],
  ) => {
    if (!live) return;
    ids.forEach(markEcho);
    const { error } = await fn();
    if (error) console.error("[pointpals] supabase write failed:", error.message);
  };

  const value: Ctx = {
    household,
    kids,
    chores,
    skills,
    history,
    proposals,
    streakByKid,
    hydrated,
    mode,
    needsHousehold,
    refreshFromServer: async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await bootLive(data.session.user.id);
    },
    awardPoints: (kidIds, item) => {
      const now = Date.now();
      const poolDelta = item.points;
      const batchId = uid();
      const eventRows = kidIds.map((kidId) => ({
        id: uid(),
        kid_id: kidId,
        item_name: item.name,
        item_icon: item.icon,
        points: item.points,
        batch_id: batchId,
      }));
      const batch: AwardBatch = { id: batchId, at: now, kidIds, item, poolDelta };
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          kidIds.includes(k.id)
            ? { ...k, currentPoints: Math.max(0, k.currentPoints + item.points), allTimePoints: Math.max(0, k.allTimePoints + item.points) }
            : k,
        ),
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool + poolDelta),
        },
        history: [
          ...eventRows.map((row) => ({
            id: row.id,
            kidId: row.kid_id,
            itemName: item.name,
            itemIcon: item.icon,
            points: item.points,
            at: now,
          })),
          ...s.history,
        ].slice(0, 200),
      }));
      if (live) {
        const nextPool = Math.max(0, household.sharedPool + poolDelta);
        void dbWrite(
          async () =>
            await supabase
              .from("point_events")
              .insert(eventRows.map((r) => ({ ...r, household_id: hid() }))),
          eventRows.map((r) => r.id),
        );
        void dbWrite(async () =>
          await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
        // Sync per-kid totals — update BOTH current_points and all_time_points.
        kidIds.forEach((kidId) => {
          const kid = kids.find((k) => k.id === kidId);
          if (!kid) return;
          const nextCur = Math.max(0, kid.currentPoints + item.points);
          const nextAll = Math.max(0, kid.allTimePoints + item.points);
          void dbWrite(async () =>
            await supabase
              .from("kids")
              .update({ current_points: nextCur, all_time_points: nextAll } as any)
              .eq("id", kidId),
          );
        });
      }
      return batch;
    },
    undoBatch: (batch) => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          batch.kidIds.includes(k.id)
            ? { ...k, currentPoints: Math.max(0, k.currentPoints - batch.item.points), allTimePoints: Math.max(0, k.allTimePoints - batch.item.points) }
            : k,
        ),
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool - batch.poolDelta),
        },
        history: s.history.filter((e) => (e as PointEvent & { batchId?: string }).batchId !== batch.id && !e.id.startsWith(batch.id)),
      }));
      if (live) {
        void dbWrite(async () =>
          await supabase.from("point_events").delete().eq("batch_id", batch.id),
        );
        const nextPool = Math.max(0, household.sharedPool - batch.poolDelta);
        void dbWrite(async () =>
          await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
        batch.kidIds.forEach((kidId) => {
          const kid = kids.find((k) => k.id === kidId);
          if (!kid) return;
          const nextCur = Math.max(0, kid.currentPoints - batch.item.points);
          const nextAll = Math.max(0, kid.allTimePoints - batch.item.points);
          void dbWrite(async () =>
            await supabase
              .from("kids")
              .update({ current_points: nextCur, all_time_points: nextAll } as any)
              .eq("id", kidId),
          );
        });
      }
    },
    addChore: (c) => {
      const id = uid();
      setState((s) => ({ ...s, chores: [...s.chores, { ...c, id }] }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase.from("chores").insert({
              id,
              household_id: hid(),
              name: c.name,
              icon: c.icon,
              color: c.color,
              points: c.points,
              recurrence: c.recurrence,
            }),
          [id],
        );
      }
    },
    addSkill: (sk) => {
      const id = uid();
      setState((s) => ({ ...s, skills: [...s.skills, { ...sk, id }] }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase.from("skills").insert({
              id,
              household_id: hid(),
              name: sk.name,
              icon: sk.icon,
              color: sk.color,
              points: sk.points,
              is_positive: sk.isPositive,
            }),
          [id],
        );
      }
    },
    updateChore: (id, patch) => {
      setState((s) => ({
        ...s,
        chores: s.chores.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
      if (live) {
        const dbPatch: Database["public"]["Tables"]["chores"]["Update"] = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.icon !== undefined) dbPatch.icon = patch.icon;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.points !== undefined) dbPatch.points = patch.points;
        if (patch.recurrence !== undefined) dbPatch.recurrence = patch.recurrence;
        if (Object.keys(dbPatch).length) {
          void dbWrite(async () => await supabase.from("chores").update(dbPatch).eq("id", id));
        }
      }
    },
    updateSkill: (id, patch) => {
      setState((s) => ({
        ...s,
        skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...patch } : sk)),
      }));
      if (live) {
        const dbPatch: Database["public"]["Tables"]["skills"]["Update"] = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.icon !== undefined) dbPatch.icon = patch.icon;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.points !== undefined) dbPatch.points = patch.points;
        if (patch.isPositive !== undefined) dbPatch.is_positive = patch.isPositive;
        if (Object.keys(dbPatch).length) {
          void dbWrite(async () => await supabase.from("skills").update(dbPatch).eq("id", id));
        }
      }
    },
    updateKid: (id, patch) => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) => (k.id === id ? { ...k, ...patch } : k)),
      }));
      if (live) {
        const dbPatch: Database["public"]["Tables"]["kids"]["Update"] = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.currentPoints !== undefined) (dbPatch as any).current_points = patch.currentPoints;
        if (patch.allTimePoints !== undefined) (dbPatch as any).all_time_points = patch.allTimePoints;
        if (patch.companionId !== undefined) dbPatch.avatar_key = patch.companionId;
        if (Object.keys(dbPatch).length) {
          void dbWrite(async () => await supabase.from("kids").update(dbPatch).eq("id", id));
        }
      }
    },
    removeChore: (id) => {
      setState((s) => ({ ...s, chores: s.chores.filter((c) => c.id !== id) }));
      if (live) {
        void dbWrite(async () => await supabase.from("chores").delete().eq("id", id));
      }
    },
    removeSkill: (id) => {
      setState((s) => ({ ...s, skills: s.skills.filter((sk) => sk.id !== id) }));
      if (live) {
        void dbWrite(async () => await supabase.from("skills").delete().eq("id", id));
      }
    },
    addProposal: (kidId, name) => {
      const id = uid();
      setState((s) => ({
        ...s,
        proposals: [...s.proposals, { id, proposedByKidId: kidId, name, votes: [kidId] }],
      }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("reward_proposals")
              .insert({ id, household_id: hid(), name, proposed_by: kidId }),
          [id],
        );
        void dbWrite(async () =>
          await supabase.from("reward_votes").insert({ proposal_id: id, kid_id: kidId }),
        );
      }
    },
    voteProposal: (kidId, proposalId) => {
      // A vote is exclusive per kid — clear any of their votes on other proposals first.
      const previousProposalIds = proposals
        .filter((p) => p.votes.includes(kidId) && p.id !== proposalId)
        .map((p) => p.id);
      const alreadyVoted = proposals.find((p) => p.id === proposalId)?.votes.includes(kidId);
      setState((s) => ({
        ...s,
        proposals: s.proposals.map((p) => {
          if (p.id !== proposalId) return { ...p, votes: p.votes.filter((v) => v !== kidId) };
          return p.votes.includes(kidId) ? p : { ...p, votes: [...p.votes, kidId] };
        }),
      }));
      if (live) {
        if (previousProposalIds.length) {
          void dbWrite(async () =>
            await supabase
              .from("reward_votes")
              .delete()
              .eq("kid_id", kidId)
              .in("proposal_id", previousProposalIds),
          );
        }
        if (!alreadyVoted) {
          void dbWrite(async () =>
            await supabase
              .from("reward_votes")
              .insert({ proposal_id: proposalId, kid_id: kidId }),
          );
        }
      }
    },
    selectReward: (proposalId) => {
      const chosen = proposals.find((p) => p.id === proposalId);
      if (!chosen) return null;
      const nextPool = Math.max(0, household.sharedPool - household.rewardTarget);
      setState((s) => ({
        ...s,
        proposals: [],
        household: {
          ...s.household,
          sharedPool: nextPool,
        },
      }));
      if (live) {
        void dbWrite(async () =>
          await supabase.from("reward_proposals").delete().eq("household_id", hid()),
        );
        void dbWrite(async () =>
          await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
      }
      return chosen.name;
    },
    setRewardTarget: (n) => {
      setState((s) => ({ ...s, household: { ...s.household, rewardTarget: n } }));
      if (live) {
        void dbWrite(async () =>
          await supabase.from("households").update({ reward_target: n }).eq("id", hid()),
        );
      }
    },
    setHouseholdName: (name) => {
      setState((s) => ({ ...s, household: { ...s.household, name } }));
      if (live) {
        void dbWrite(async () =>
          await supabase.from("households").update({ name }).eq("id", hid()),
        );
      }
    },
    setSubscriptionStatus: (status) =>
      // Server-managed by Stripe webhook — local only, for the Paywall's "simulate
      // activation" fallback when Stripe isn't wired up.
      setState((s) => ({ ...s, household: { ...s.household, subscriptionStatus: status } })),
    completeOnboarding: () => {
      setState((s) => ({ ...s, household: { ...s.household, onboarded: true } }));
      if (live) {
        void dbWrite(async () =>
          await supabase.from("households").update({ onboarded: true }).eq("id", hid()),
        );
      }
    },
    resetHousehold: () => {
      setState(initialState());
      // In live mode this only clears the local view — server data survives, and
      // will re-populate on the next fetch. That's intentional: "delete all"
      // wiping a shared household from a single member would be surprising.
    },
    addKid: (name, color, companionId) => {
      const id = uid();
      setState((s) => ({
        ...s,
        kids: [...s.kids, { id, name, color, currentPoints: 0, allTimePoints: 0, companionId }],
      }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase.from("kids").insert({
              id,
              household_id: hid(),
              name,
              color,
              current_points: 0,
              all_time_points: 0,
              points: 0,
              avatar_key: companionId ?? null,
            } as any),
          [id],
        );
      }
    },
    removeKid: (id) => {
      setState((s) => ({
        ...s,
        kids: s.kids.filter((k) => k.id !== id),
        history: s.history.filter((e) => e.kidId !== id),
        // Also drop proposals this kid made, and their votes on remaining ones.
        proposals: s.proposals
          .filter((p) => p.proposedByKidId !== id)
          .map((p) => ({ ...p, votes: p.votes.filter((v) => v !== id) })),
      }));
      if (live) {
        void dbWrite(async () => await supabase.from("kids").delete().eq("id", id));
      }
    },
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
