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
  type Kid,
  type Chore,
  type Skill,
  type PointEvent,
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
import { subscribeMemoriesRealtime } from "./memories";
import { triggerAwardFeedback } from "./feedback";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Client-side app state for the PointPals prototype.
//
// Backend note: this is intentionally a swappable seam. Every mutation below is
// a pure state transition that maps 1:1 to a Supabase table write (households,
// kids, chores, skills, point_events, reward_history - see
// supabase/migrations). When the project is reachable, replace the useState
// backing with react-query mutations against those tables; the component API
// (useApp) stays identical. State is persisted to localStorage so the app feels
// continuous across reloads in the meantime.

export type Household = {
  id: string;
  name: string;
  sharedPool: number;
  rewardTarget: number;
  // Entitlement layer (§5) - checked to gate parent-facing premium features.
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "free" | "founding_tester";
  trialEndsAt: number | null;
  foundingTester: boolean;
  onboarded: boolean;
  // Individual jar settings (optional, default OFF)
  splitJarsEnabled: boolean;
  splitRatio: number; // percentage (0-100) that goes to the shared jar; rest is personal
  /**
   * "percentage" - split each award between shared + personal per splitRatio.
   * "match" (1:1) - full award points go to BOTH the shared jar AND personal jar.
   */
  splitMode: "percentage" | "match";
  /** When false, the shared family jar is hidden entirely. All points flow to
   *  individual personal jars only. A mini MarbleJar per kid is shown on home. */
  sharedJarEnabled: boolean;
  activeRewardName: string | null;
  activeRewardTarget: number | null;
};

// A reversible award batch, kept only until its undo window closes (§2).
export type AwardBatch = {
  id: string;
  at: number;
  kidIds: string[];
  item: { name: string; icon: string; points: number };
  poolDelta: number;
  /** When split jars are enabled, this is the per-kid personal jar delta. */
  personalDelta?: number;
};

type Ctx = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: PointEvent[];
  streakByKid: Record<string, number>;
  hydrated: boolean;
  loading: boolean;
  mode: "demo" | "live";
  needsHousehold: boolean;
  awardPoints: (
    kidIds: string[],
    item: { name: string; icon: string; points: number },
  ) => AwardBatch;
  undoBatch: (batch: AwardBatch) => void;
  /** Reverse a single logged award (used by the Recent Activity undo). */
  undoEvent: (eventId: string) => void;
  addChore: (c: Omit<Chore, "id">) => void;
  addSkill: (s: Omit<Skill, "id">) => void;
  updateChore: (id: string, patch: Partial<Omit<Chore, "id">>) => void;
  updateSkill: (id: string, patch: Partial<Omit<Skill, "id">>) => void;
  updateKid: (id: string, patch: Partial<Omit<Kid, "id">>) => void;
  removeChore: (id: string) => void;
  removeSkill: (id: string) => void;
  /** Reward claimed: zero every kid's currentPoints and the shared pool.
   *  allTimePoints is deliberately untouched - that's the permanent record. */
  resetRewardCycle: () => void;
  /** Manual fix for an accidental tap - adjusts BOTH totals and logs a
   *  neutral "correction" history entry (never styled as behaviour). */
  correctPoints: (kidId: string, delta: number, reason?: string) => void;
  setRewardTarget: (n: number) => void;
  setHouseholdName: (n: string) => void;
  setSubscriptionStatus: (s: Household["subscriptionStatus"]) => void;
  completeOnboarding: () => void;
  resetHousehold: () => void;
  addKid: (name: string, color: PastelKey, companionId?: string) => void;
  removeKid: (id: string) => void;
  exportData: () => string;
  /** Called by /welcome-back after a household is created - reboots into live. */
  refreshFromServer: () => Promise<void>;
  // ── Individual jar settings ────────────────────────────────────────
  setSplitJarsEnabled: (enabled: boolean) => void;
  setSplitRatio: (ratio: number) => void;
  /** "percentage" - split per splitRatio; "match" (1:1) - full to both. */
  setSplitMode: (mode: "percentage" | "match") => void;
  /** Show the shared family jar alongside personal jars. */
  setSharedJarEnabled: (enabled: boolean) => void;
  /** Set or clear a kid's personal jar target and reward. Set target to 0 to disable. */
  setPersonalTarget: (kidId: string, target: number, reward?: string) => void;
  /** Claim a kid's personal reward - resets only that kid's personalPool. */
  claimPersonalReward: (kidId: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

const STORAGE_KEY = "pointpals.state.v2";
// Separate key for jar/column settings - persists in BOTH demo and live mode
// so the user's split/match/shared-jar choices survive even if a DB column
// migration is pending (e.g. split_mode, shared_jar_enabled).
const JAR_SETTINGS_KEY = "pointpals.jar-settings.v1";

function loadJarSettings(): Partial<Household> | null {
  try {
    const raw = window.localStorage.getItem(JAR_SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Household>) : null;
  } catch {
    return null;
  }
}

function saveJarSettings(hh: Household) {
  try {
    window.localStorage.setItem(
      JAR_SETTINGS_KEY,
      JSON.stringify({
        splitJarsEnabled: hh.splitJarsEnabled,
        splitRatio: hh.splitRatio,
        splitMode: hh.splitMode,
        sharedJarEnabled: hh.sharedJarEnabled,
        activeRewardName: hh.activeRewardName,
        activeRewardTarget: hh.activeRewardTarget,
        rewardTarget: hh.rewardTarget,
      }),
    );
  } catch {
    /* storage blocked */
  }
}

type Persisted = {
  household: Household;
  kids: Kid[];
  chores: Chore[];
  skills: Skill[];
  history: PointEvent[];
};

function initialState(): Persisted {
  return {
    household: INITIAL_HOUSEHOLD,
    kids: INITIAL_KIDS,
    chores: INITIAL_CHORES,
    skills: INITIAL_SKILLS,
    history: INITIAL_HISTORY,
  };
}

// Consecutive days (ending today or yesterday) on which a kid completed at least
// one must-do (daily) chore. A broken streak just quietly resets - no penalty
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [needsHousehold, setNeedsHousehold] = useState(false);
  const householdIdRef = useRef<string | null>(null);
  // The signed-in user id, stamped onto point_events.awarded_by (Reports
  // attribution). Null in signed-out demo mode.
  const userIdRef = useRef<string | null>(null);
  // Row ids we just wrote - used to suppress realtime echoes of our own writes.
  const echoIds = useRef<Set<string>>(new Set());
  const markEcho = (id: string) => {
    echoIds.current.add(id);
    // Free memory after a while - realtime round-trip is < 2s in practice.
    setTimeout(() => echoIds.current.delete(id), 15000);
  };
  const didHydrate = useRef(false);

  // Safety net: never stay stuck on the splash screen longer than 8 s, even if
  // getSession / bootLive hangs or the Supabase session can't be recovered.
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timer);
  }, []);

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
        }));
      }
    } catch {
      /* corrupt/old state - fall back to seed */
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
      /* storage blocked - session-only */
    }
  }, [state, hydrated, mode]);

  // Cross-tab demo sync via the `storage` event. In live mode, realtime does
  // the job across every device - this is just for the signed-out marketing
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
  const seedDefaultsIfEmpty = async (hid: string) => {
    // If chores or skills are empty for this household, seed from defaults.
    const { data: existingChores } = await supabase
      .from("chores")
      .select("id")
      .eq("household_id", hid)
      .limit(1);
    const { data: existingSkills } = await supabase
      .from("skills")
      .select("id")
      .eq("household_id", hid)
      .limit(1);
    const { INITIAL_CHORES, INITIAL_SKILLS } = await import("./mock-data");

    if (!existingChores?.length) {
      for (const c of INITIAL_CHORES) {
        await supabase.from("chores").insert({
          id: uid(),
          household_id: hid,
          name: c.name,
          icon: c.icon,
          color: c.color,
          points: c.points,
          recurrence: c.recurrence,
          tags: c.tags ?? [],
          assigned_kid_ids: null,
        } as never);
      }
    }
    if (!existingSkills?.length) {
      for (const sk of INITIAL_SKILLS) {
        await supabase.from("skills").insert({
          id: uid(),
          household_id: hid,
          name: sk.name,
          icon: sk.icon,
          color: sk.color,
          points: sk.points,
          is_positive: sk.isPositive,
          assigned_kid_ids: null,
        } as never);
      }
    }
  };

  const bootLive = async (userId: string) => {
    userIdRef.current = userId;
    const hid = await fetchPrimaryHouseholdId(userId);
    if (!hid) {
      setNeedsHousehold(true);
      setMode("demo"); // stay on seeded data until they create/join
      return;
    }
    setNeedsHousehold(false);

    // Seed defaults when this household has nothing yet (first run)
    await seedDefaultsIfEmpty(hid);

    const bundle = await fetchHouseholdBundle(hid);
    if (!bundle) return;
    householdIdRef.current = hid;

    // ── Boot-time trial expiry check (§5) ─────────────────────────────
    // If the server says we're trialing but the trial timestamp is in the
    // past, transition to "free" locally AND on the server so the route
    // guard (see _authenticated.tsx) redirects to the paywall.
    const hh = bundle.household;
    if (hh.subscriptionStatus === "trialing" && hh.trialEndsAt && Date.now() > hh.trialEndsAt) {
      // Founding testers keep full access automatically (no Stripe coupon needed).
      hh.subscriptionStatus = hh.foundingTester ? "active" : "free";
      // Fire-and-forget server write - we won't block boot on it.
      void supabase
        .from("households")
        .update({ subscription_status: hh.subscriptionStatus })
        .eq("id", hid)
        .then();
    }

    // ── Apply local jar settings as overrides ────────────────────────
    // The server may lack some columns (e.g. split_mode, shared_jar_enabled)
    // if a migration is pending. Restore from localStorage to avoid losing
    // settings on every reload.
    const localJar = loadJarSettings();
    if (localJar) {
      Object.assign(hh, {
        splitJarsEnabled: localJar.splitJarsEnabled ?? hh.splitJarsEnabled,
        splitRatio: localJar.splitRatio ?? hh.splitRatio,
        splitMode: localJar.splitMode ?? hh.splitMode,
        sharedJarEnabled: localJar.sharedJarEnabled ?? hh.sharedJarEnabled,
        activeRewardName: localJar.activeRewardName ?? hh.activeRewardName,
        activeRewardTarget: localJar.activeRewardTarget ?? hh.activeRewardTarget,
        rewardTarget: localJar.rewardTarget ?? hh.rewardTarget,
      });
    }

    setState({
      household: hh,
      kids: bundle.kids,
      chores: bundle.chores,
      skills: bundle.skills,
      history: bundle.history,
    });
    setMode("live");
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        void bootLive(data.session.user.id).then(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        if (!cancelled) setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        void bootLive(session.user.id).then(() => {
          if (!cancelled) setLoading(false);
        });
      } else if (event === "SIGNED_OUT") {
        householdIdRef.current = null;
        userIdRef.current = null;
        setMode("demo");
        setNeedsHousehold(false);
        setState(initialState());
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime subscriptions - one channel per household, torn down on switch.
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
            // Remote award - play sound + haptics so the jar feels alive
            triggerAwardFeedback(
              (newRow as { points?: number }).points != null && newRow.points >= 0
                ? "positive"
                : "needs-work",
            );
            const event = mapEvent(newRow);
            const pts = event.points;
            setState((s) => {
              const sharedDelta = s.household.splitJarsEnabled
                ? s.household.splitMode === "match"
                  ? pts
                  : Math.floor((pts * s.household.splitRatio) / 100)
                : pts;
              return {
                ...s,
                history: [event, ...s.history].slice(0, 200),
                household: {
                  ...s.household,
                  sharedPool: Math.max(0, s.household.sharedPool + sharedDelta),
                },
                kids: s.kids.map((k) =>
                  k.id === event.kidId
                    ? {
                        ...k,
                        currentPoints: Math.max(0, k.currentPoints + pts),
                        allTimePoints: Math.max(0, k.allTimePoints + pts),
                        personalPool: s.household.splitJarsEnabled
                          ? Math.max(
                              0,
                              k.personalPool +
                                (s.household.splitMode === "match" ? pts : pts - sharedDelta),
                            )
                          : k.personalPool,
                      }
                    : k,
                ),
              };
            });
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
          const mapped = mapHousehold(row);
          // Preserve localStorage jar settings if DB columns haven't migrated yet
          const localJar = loadJarSettings();
          if (localJar) {
            Object.assign(mapped, {
              splitJarsEnabled: localJar.splitJarsEnabled ?? mapped.splitJarsEnabled,
              splitRatio: localJar.splitRatio ?? mapped.splitRatio,
              splitMode: localJar.splitMode ?? mapped.splitMode,
              sharedJarEnabled: localJar.sharedJarEnabled ?? mapped.sharedJarEnabled,
              activeRewardName: localJar.activeRewardName ?? mapped.activeRewardName,
              activeRewardTarget: localJar.activeRewardTarget ?? mapped.activeRewardTarget,
              rewardTarget: localJar.rewardTarget ?? mapped.rewardTarget,
            });
          }
          setState((s) => ({ ...s, household: mapped }));
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
                ? s.chores.map((x) => (x.id === c.id ? { ...x, ...c } : x))
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

  // Separate channel for memory-posts / likes / comments - same lifecycle.
  useEffect(() => {
    if (mode !== "live" || !householdIdRef.current) return;
    return subscribeMemoriesRealtime(householdIdRef.current);
  }, [mode]);

  const { household, kids, chores, skills, history } = state;

  const streakByKid = useMemo(() => computeStreaks(kids, chores, history), [kids, chores, history]);

  // ---------------------------------------------------------------------------
  // Write-through helpers. In demo mode these are no-ops; in live mode we push
  // to Supabase and mark the row id so realtime doesn't re-apply our own write.
  // Errors are surfaced to console - the optimistic local update is left in
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
    streakByKid,
    hydrated,
    loading,
    mode,
    needsHousehold,
    refreshFromServer: async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await bootLive(data.session.user.id);
    },
    awardPoints: (kidIds, item) => {
      const now = Date.now();
      const batchId = uid();

      // ── Compute shared vs personal jar portions ───────────────────
      //   splitJars OFF       → legacy single-jar mode (all to shared)
      //   sharedJarEnabled OFF → individual j.ars only (all to personal)
      //   splitMode "match"    → 1:1 - full points to BOTH jars
      //   splitMode "%"        → split per splitRatio
      let sharedPoints: number;
      let personalPoints: number;
      if (!household.splitJarsEnabled) {
        sharedPoints = item.points;
        personalPoints = 0;
      } else if (!household.sharedJarEnabled) {
        sharedPoints = 0;
        personalPoints = item.points;
      } else if (household.splitMode === "match") {
        sharedPoints = item.points;
        personalPoints = item.points;
      } else {
        sharedPoints = Math.floor((item.points * household.splitRatio) / 100);
        personalPoints = item.points - sharedPoints;
      }
      const poolDelta = sharedPoints;

      const eventRows = kidIds.map((kidId) => ({
        id: uid(),
        kid_id: kidId,
        item_name: item.name,
        item_icon: item.icon,
        points: item.points,
        batch_id: batchId,
      }));
      const batch: AwardBatch = {
        id: batchId,
        at: now,
        kidIds,
        item,
        poolDelta,
        personalDelta: household.splitJarsEnabled ? personalPoints : undefined,
      };
      setState((s) => {
        // Recompute split logic from latest state in case realtime changed settings
        const hh = s.household;
        let pp = 0;
        if (!hh.splitJarsEnabled) pp = 0;
        else if (!hh.sharedJarEnabled) pp = item.points;
        else if (hh.splitMode === "match") pp = item.points;
        else pp = item.points - Math.floor((item.points * hh.splitRatio) / 100);
        return {
          ...s,
          kids: s.kids.map((k) =>
            kidIds.includes(k.id)
              ? {
                  ...k,
                  currentPoints: Math.max(0, k.currentPoints + item.points),
                  allTimePoints: Math.max(0, k.allTimePoints + item.points),
                  personalPool: hh.splitJarsEnabled
                    ? Math.max(0, k.personalPool + pp)
                    : k.personalPool,
                }
              : k,
          ),
          household: {
            ...hh,
            sharedPool: Math.max(0, hh.sharedPool + poolDelta),
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
        };
      });
      if (live) {
        const snap = stateRef.current;
        const nextPool = Math.max(0, snap.household.sharedPool + poolDelta);
        void dbWrite(
          async () =>
            await supabase
              .from("point_events")
              .insert(
                eventRows.map(
                  (r) => ({ ...r, household_id: hid(), awarded_by: userIdRef.current }) as never,
                ),
              ),
          eventRows.map((r) => r.id),
        );
        void dbWrite(
          async () =>
            await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
        // Sync per-kid totals - update current_points, all_time_points, and personal_pool.
        kidIds.forEach((kidId) => {
          const kid = snap.kids.find((k) => k.id === kidId);
          if (!kid) return;
          const nextCur = Math.max(0, kid.currentPoints + item.points);
          const nextAll = Math.max(0, kid.allTimePoints + item.points);
          const nextPersonal = snap.household.splitJarsEnabled
            ? Math.max(0, kid.personalPool + personalPoints)
            : kid.personalPool;
          const dbPatch: Record<string, unknown> = {
            current_points: nextCur,
            all_time_points: nextAll,
          };
          if (snap.household.splitJarsEnabled) dbPatch.personal_pool = nextPersonal;
          void dbWrite(
            async () =>
              await supabase
                .from("kids")
                .update(dbPatch as never)
                .eq("id", kidId),
          );
        });
      }
      return batch;
    },
    undoBatch: (batch) => {
      const personalDelta = batch.personalDelta ?? 0;
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          batch.kidIds.includes(k.id)
            ? {
                ...k,
                currentPoints: Math.max(0, k.currentPoints - batch.item.points),
                allTimePoints: Math.max(0, k.allTimePoints - batch.item.points),
                personalPool:
                  personalDelta > 0 ? Math.max(0, k.personalPool - personalDelta) : k.personalPool,
              }
            : k,
        ),
        household: {
          ...s.household,
          sharedPool: Math.max(0, s.household.sharedPool - batch.poolDelta),
        },
        history: s.history.filter(
          (e) =>
            (e as PointEvent & { batchId?: string }).batchId !== batch.id &&
            !e.id.startsWith(batch.id),
        ),
      }));
      if (live) {
        void dbWrite(
          async () => await supabase.from("point_events").delete().eq("batch_id", batch.id),
        );
        const nextPool = Math.max(0, household.sharedPool - batch.poolDelta);
        void dbWrite(
          async () =>
            await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
        batch.kidIds.forEach((kidId) => {
          const kid = kids.find((k) => k.id === kidId);
          if (!kid) return;
          const nextCur = Math.max(0, kid.currentPoints - batch.item.points);
          const nextAll = Math.max(0, kid.allTimePoints - batch.item.points);
          const dbPatch: Record<string, unknown> = {
            current_points: nextCur,
            all_time_points: nextAll,
          };
          if (personalDelta > 0) {
            const nextPersonal = Math.max(0, kid.personalPool - personalDelta);
            dbPatch.personal_pool = nextPersonal;
          }
          void dbWrite(
            async () =>
              await supabase
                .from("kids")
                .update(dbPatch as never)
                .eq("id", kidId),
          );
        });
      }
    },
    undoEvent: (eventId) => {
      const ev = history.find((e) => e.id === eventId);
      if (!ev) return;
      const points = ev.points;
      // Recompute the shared/personal split with current settings — accurate
      // for a recent mis-tap (the jar hasn't been reset/reconfigured between).
      let shared: number;
      let personal: number;
      if (!household.splitJarsEnabled) {
        shared = points;
        personal = 0;
      } else if (!household.sharedJarEnabled) {
        shared = 0;
        personal = points;
      } else if (household.splitMode === "match") {
        shared = points;
        personal = points;
      } else {
        shared = Math.floor((points * household.splitRatio) / 100);
        personal = points - shared;
      }

      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          k.id === ev.kidId
            ? {
                ...k,
                currentPoints: Math.max(0, k.currentPoints - points),
                allTimePoints: Math.max(0, k.allTimePoints - points),
                personalPool: household.splitJarsEnabled
                  ? Math.max(0, k.personalPool - personal)
                  : k.personalPool,
              }
            : k,
        ),
        household: { ...s.household, sharedPool: Math.max(0, s.household.sharedPool - shared) },
        history: s.history.filter((e) => e.id !== eventId),
      }));

      if (live) {
        void dbWrite(async () => await supabase.from("point_events").delete().eq("id", eventId));
        const nextPool = Math.max(0, household.sharedPool - shared);
        void dbWrite(
          async () =>
            await supabase.from("households").update({ shared_pool: nextPool }).eq("id", hid()),
        );
        const kid = kids.find((k) => k.id === ev.kidId);
        if (kid) {
          const dbPatch: Record<string, unknown> = {
            current_points: Math.max(0, kid.currentPoints - points),
            all_time_points: Math.max(0, kid.allTimePoints - points),
          };
          if (household.splitJarsEnabled) {
            dbPatch.personal_pool = Math.max(0, kid.personalPool - personal);
          }
          void dbWrite(
            async () =>
              await supabase
                .from("kids")
                .update(dbPatch as never)
                .eq("id", ev.kidId),
          );
        }
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
              tags: c.tags ?? [],
              assigned_kid_ids: c.assignedKidIds?.length ? c.assignedKidIds : null,
            } as never),
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
              assigned_kid_ids: sk.assignedKidIds?.length ? sk.assignedKidIds : null,
            } as never),
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
        const dbPatch: Database["public"]["Tables"]["chores"]["Update"] & Record<string, unknown> =
          {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.icon !== undefined) dbPatch.icon = patch.icon;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.points !== undefined) dbPatch.points = patch.points;
        if (patch.recurrence !== undefined) dbPatch.recurrence = patch.recurrence;
        if (patch.tags !== undefined) dbPatch.tags = patch.tags;
        if (patch.assignedKidIds !== undefined)
          dbPatch.assigned_kid_ids = patch.assignedKidIds?.length ? patch.assignedKidIds : null;
        if (Object.keys(dbPatch).length) {
          void dbWrite(
            async () =>
              await supabase
                .from("chores")
                .update(dbPatch as never)
                .eq("id", id),
          );
        }
      }
    },
    updateSkill: (id, patch) => {
      setState((s) => ({
        ...s,
        skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...patch } : sk)),
      }));
      if (live) {
        const dbPatch: Database["public"]["Tables"]["skills"]["Update"] & Record<string, unknown> =
          {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.icon !== undefined) dbPatch.icon = patch.icon;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.points !== undefined) dbPatch.points = patch.points;
        if (patch.isPositive !== undefined) dbPatch.is_positive = patch.isPositive;
        if (patch.assignedKidIds !== undefined)
          dbPatch.assigned_kid_ids = patch.assignedKidIds?.length ? patch.assignedKidIds : null;
        if (Object.keys(dbPatch).length) {
          void dbWrite(
            async () =>
              await supabase
                .from("skills")
                .update(dbPatch as never)
                .eq("id", id),
          );
        }
      }
    },
    updateKid: (id, patch) => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) => (k.id === id ? { ...k, ...patch } : k)),
      }));
      if (live) {
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.currentPoints !== undefined) dbPatch.current_points = patch.currentPoints;
        if (patch.allTimePoints !== undefined) dbPatch.all_time_points = patch.allTimePoints;
        if (patch.companionId !== undefined) dbPatch.avatar_key = patch.companionId;
        if (patch.personalPool !== undefined) dbPatch.personal_pool = patch.personalPool;
        if (patch.personalTarget !== undefined) dbPatch.personal_target = patch.personalTarget;
        if (patch.personalReward !== undefined)
          dbPatch.personal_reward = patch.personalReward || null;
        if (Object.keys(dbPatch).length) {
          void dbWrite(
            async () =>
              await supabase
                .from("kids")
                .update(dbPatch as never)
                .eq("id", id),
          );
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
    resetRewardCycle: () => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) => ({ ...k, currentPoints: 0, personalPool: 0 })),
        household: { ...s.household, sharedPool: 0 },
      }));
      if (live) {
        void dbWrite(
          async () => await supabase.from("households").update({ shared_pool: 0 }).eq("id", hid()),
        );
        for (const kid of kids) {
          void dbWrite(
            async () =>
              await supabase
                .from("kids")
                .update({ current_points: 0, personal_pool: 0 } as never)
                .eq("id", kid.id),
          );
        }
      }
    },
    correctPoints: (kidId, delta, reason) => {
      const kid = kids.find((k) => k.id === kidId);
      if (!kid || delta === 0) return;
      const eventId = uid();
      const now = Date.now();
      const nextCur = Math.max(0, kid.currentPoints + delta);
      const nextAll = Math.max(0, kid.allTimePoints + delta);
      const itemName = reason ? `Correction: ${reason}` : "Correction";
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          k.id === kidId ? { ...k, currentPoints: nextCur, allTimePoints: nextAll } : k,
        ),
        // Corrections deliberately do NOT touch the shared pool: the jar is the
        // family-facing celebration surface, and an admin fix shouldn't yank
        // marbles out in front of the kids unless a real award is undone.
        history: [
          {
            id: eventId,
            kidId,
            itemName,
            itemIcon: "🛠️",
            points: delta,
            at: now,
            type: "correction" as const,
          },
          ...s.history,
        ].slice(0, 200),
      }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase.from("point_events").insert({
              id: eventId,
              household_id: hid(),
              kid_id: kidId,
              item_name: itemName,
              item_icon: "🛠️",
              points: delta,
              batch_id: `corr_${eventId}`,
              awarded_by: userIdRef.current,
            } as never),
          [eventId],
        );
        void dbWrite(
          async () =>
            await supabase
              .from("kids")
              .update({ current_points: nextCur, all_time_points: nextAll } as never)
              .eq("id", kidId),
        );
      }
    },
    setRewardTarget: (n) => {
      setState((s) => {
        const next = { ...s, household: { ...s.household, rewardTarget: n } };
        saveJarSettings(next.household);
        return next;
      });
      if (live) {
        void dbWrite(
          async () =>
            await supabase.from("households").update({ reward_target: n }).eq("id", hid()),
        );
      }
    },
    setHouseholdName: (name) => {
      setState((s) => ({ ...s, household: { ...s.household, name } }));
      if (live) {
        void dbWrite(
          async () => await supabase.from("households").update({ name }).eq("id", hid()),
        );
      }
    },
    setSubscriptionStatus: (status) =>
      // Server-managed by Stripe webhook - local only, for the Paywall's "simulate
      // activation" fallback when Stripe isn't wired up.
      setState((s) => ({ ...s, household: { ...s.household, subscriptionStatus: status } })),
    completeOnboarding: () => {
      setState((s) => ({ ...s, household: { ...s.household, onboarded: true } }));
      if (live) {
        void dbWrite(
          async () => await supabase.from("households").update({ onboarded: true }).eq("id", hid()),
        );
      }
    },
    resetHousehold: () => {
      setState(initialState());
      // In live mode this only clears the local view - server data survives, and
      // will re-populate on the next fetch. That's intentional: "delete all"
      // wiping a shared household from a single member would be surprising.
    },
    addKid: (name, color, companionId) => {
      const id = uid();
      setState((s) => ({
        ...s,
        kids: [
          ...s.kids,
          {
            id,
            name,
            color,
            currentPoints: 0,
            allTimePoints: 0,
            companionId,
            personalPool: 0,
            personalTarget: 0,
          },
        ],
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
              personal_pool: 0,
              personal_target: 0,
            } as never),
          [id],
        );
      }
    },
    // ── Individual jar settings ────────────────────────────────────────
    setSplitJarsEnabled: (enabled) => {
      setState((s) => {
        const next = { ...s, household: { ...s.household, splitJarsEnabled: enabled } };
        saveJarSettings(next.household);
        return next;
      });
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("households")
              .update({ split_jars_enabled: enabled } as never)
              .eq("id", hid()),
        );
      }
    },
    setSplitRatio: (ratio) => {
      const clamped = Math.max(0, Math.min(100, ratio));
      setState((s) => {
        const next = { ...s, household: { ...s.household, splitRatio: clamped } };
        saveJarSettings(next.household);
        return next;
      });
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("households")
              .update({ split_ratio: clamped } as never)
              .eq("id", hid()),
        );
      }
    },
    setSplitMode: (mode) => {
      setState((s) => {
        const next = { ...s, household: { ...s.household, splitMode: mode } };
        saveJarSettings(next.household);
        return next;
      });
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("households")
              .update({ split_mode: mode } as never)
              .eq("id", hid()),
        );
      }
    },
    setSharedJarEnabled: (enabled) => {
      setState((s) => {
        const next = { ...s, household: { ...s.household, sharedJarEnabled: enabled } };
        saveJarSettings(next.household);
        return next;
      });
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("households")
              .update({ shared_jar_enabled: enabled } as never)
              .eq("id", hid()),
        );
      }
    },

    setPersonalTarget: (kidId, target, reward) => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) =>
          k.id === kidId
            ? { ...k, personalTarget: Math.max(0, target), personalReward: reward }
            : k,
        ),
      }));
      if (live) {
        const dbPatch: Record<string, unknown> = { personal_target: Math.max(0, target) };
        if (reward !== undefined) dbPatch.personal_reward = reward || null;
        void dbWrite(
          async () =>
            await supabase
              .from("kids")
              .update(dbPatch as never)
              .eq("id", kidId),
        );
      }
    },
    claimPersonalReward: (kidId) => {
      setState((s) => ({
        ...s,
        kids: s.kids.map((k) => (k.id === kidId ? { ...k, personalPool: 0 } : k)),
      }));
      if (live) {
        void dbWrite(
          async () =>
            await supabase
              .from("kids")
              .update({ personal_pool: 0 } as never)
              .eq("id", kidId),
        );
      }
    },
    removeKid: (id) => {
      // Scrub the kid from any assignment allow-lists. If they were the only
      // assigned kid the list becomes empty, which reads as universal again -
      // better than a chore that silently applies to nobody.
      const scrub = <T extends { assignedKidIds?: string[] | null }>(item: T): T =>
        item.assignedKidIds?.includes(id)
          ? { ...item, assignedKidIds: item.assignedKidIds.filter((k) => k !== id) }
          : item;
      setState((s) => ({
        ...s,
        kids: s.kids.filter((k) => k.id !== id),
        history: s.history.filter((e) => e.kidId !== id),
        chores: s.chores.map(scrub),
        skills: s.skills.map(scrub),
      }));
      if (live) {
        void dbWrite(async () => await supabase.from("kids").delete().eq("id", id));
        // Persist the allow-list scrub for affected rows.
        for (const c of chores) {
          if (c.assignedKidIds?.includes(id)) {
            const next = c.assignedKidIds.filter((k) => k !== id);
            void dbWrite(
              async () =>
                await supabase
                  .from("chores")
                  .update({ assigned_kid_ids: next.length ? next : null } as never)
                  .eq("id", c.id),
            );
          }
        }
        for (const sk of skills) {
          if (sk.assignedKidIds?.includes(id)) {
            const next = sk.assignedKidIds.filter((k) => k !== id);
            void dbWrite(
              async () =>
                await supabase
                  .from("skills")
                  .update({ assigned_kid_ids: next.length ? next : null } as never)
                  .eq("id", sk.id),
            );
          }
        }
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
