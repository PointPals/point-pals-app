// Reports data helpers — date-range math and the point_events fetch.
//
// point_events is an append-only ledger (see the awarded_by migration note):
// a reward-claim reset only zeroes the derived kids.current_points/pool, so
// this log is safe to report on across any range, including "All time".

import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { PointEvent } from "./mock-data";

export type DateRangeKey =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "all-time"
  | "custom";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-week": "Last week",
  "this-month": "This month",
  "last-month": "Last month",
  "all-time": "All time",
  custom: "Custom range",
};

export function resolveRange(
  key: DateRangeKey,
  custom?: { start: string; end: string },
): { start: number; end: number } | null {
  const now = new Date();
  switch (key) {
    case "today":
      return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y).getTime(), end: endOfDay(y).getTime() };
    }
    case "this-week":
      return { start: startOfWeek(now).getTime(), end: endOfWeek(now).getTime() };
    case "last-week": {
      const w = subDays(now, 7);
      return { start: startOfWeek(w).getTime(), end: endOfWeek(w).getTime() };
    }
    case "this-month":
      return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() };
    case "last-month": {
      const m = subMonths(now, 1);
      return { start: startOfMonth(m).getTime(), end: endOfMonth(m).getTime() };
    }
    case "all-time":
      return null; // no bound
    case "custom":
      if (!custom?.start || !custom?.end) return null;
      return {
        start: startOfDay(new Date(custom.start)).getTime(),
        end: endOfDay(new Date(custom.end)).getTime(),
      };
  }
}

export type ReportEvent = PointEvent & { awardedBy?: string | null };

/**
 * Live mode: query point_events directly rather than the client's capped
 * 200-row in-memory history, since a busy household can blow past that for
 * "This month" / "All time" ranges. Demo mode has no server, so it filters
 * the in-memory history instead (which is all that exists locally).
 */
export async function fetchReportEvents(opts: {
  mode: "demo" | "live";
  householdId: string;
  history: ReportEvent[];
  range: { start: number; end: number } | null;
  kidId?: string | null;
}): Promise<ReportEvent[]> {
  const { mode, householdId, history, range, kidId } = opts;

  if (mode === "demo") {
    return history.filter((e) => {
      if (kidId && e.kidId !== kidId) return false;
      if (range && (e.at < range.start || e.at > range.end)) return false;
      return true;
    });
  }

  // The generated types file is still the placeholder (see docs/OPERATIONS.md),
  // so it doesn't know about awarded_by yet — select("*") and cast rather than
  // fight the stale column list.
  let query = supabase
    .from("point_events")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (kidId) query = query.eq("kid_id", kidId);
  if (range) {
    query = query
      .gte("created_at", new Date(range.start).toISOString())
      .lte("created_at", new Date(range.end).toISOString());
  }
  const { data, error } = await query;
  if (error || !data) return [];
  type Row = {
    id: string;
    kid_id: string;
    item_name: string;
    item_icon: string;
    points: number;
    batch_id: string | null;
    awarded_by: string | null;
    created_at: string;
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    kidId: r.kid_id,
    itemName: r.item_name,
    itemIcon: r.item_icon,
    points: r.points,
    at: new Date(r.created_at).getTime(),
    batchId: r.batch_id,
    awardedBy: r.awarded_by,
    type: r.batch_id?.startsWith("corr_") ? ("correction" as const) : undefined,
  }));
}

/** % positive is computed by event COUNT, not point value, excluding corrections. */
export function computeGauge(events: ReportEvent[]): {
  positive: number;
  needsWork: number;
  pctPositive: number | null;
} {
  const scored = events.filter((e) => e.type !== "correction");
  const positive = scored.filter((e) => e.points > 0).length;
  const needsWork = scored.filter((e) => e.points < 0).length;
  const total = positive + needsWork;
  return { positive, needsWork, pctPositive: total > 0 ? (positive / total) * 100 : null };
}

export function eventsToCsv(
  events: ReportEvent[],
  kidName: (id: string) => string,
  awarderName?: (id?: string | null) => string | null,
): string {
  const header = ["date", "kid", "item name", "points", "type", "awarded_by"];
  const rows = events.map((e) => [
    new Date(e.at).toISOString(),
    kidName(e.kidId),
    e.itemName,
    String(e.points),
    e.type === "correction" ? "correction" : e.points >= 0 ? "positive" : "needs-work",
    (awarderName ? awarderName(e.awardedBy) : e.awardedBy) ?? "",
  ]);
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
