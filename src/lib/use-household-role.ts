import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HouseholdRole = "admin" | "parent" | "contributor" | "viewer" | null;

// Returns the signed-in user's role in the given household, or null if
// unauthenticated / not a member. Signed-out demo mode returns null so
// role-gated UI silently allows everything (the localStorage store is the
// source of truth in demo mode).
export function useHouseholdRole(householdId: string | undefined) {
  const [role, setRole] = useState<HouseholdRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid || !householdId) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("household_members")
        .select("role")
        .eq("household_id", householdId)
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      setRole((data?.role as HouseholdRole) ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const isAdmin = role === "admin";
  const canAward = role === null || role === "admin" || role === "parent" || role === "contributor";
  const canEdit = role === null || role === "admin" || role === "parent";

  return { role, userId, loading, isAdmin, canAward, canEdit };
}