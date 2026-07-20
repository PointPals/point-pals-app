// Device-local chore order for the printable chart + Library grid.
//
// Parents want to control the order chores print in — e.g. morning chores first,
// then afternoon. There is no `sort_order` column in the DB, so (like
// settings.ts) this order is stored per-device in localStorage and applied when
// the printable weekly chart is generated (printable-chart.ts `weeklyChores`)
// and when the Library lists chores for reordering. New/unknown chores fall to
// the end in their existing order until they're moved.

import { useSyncExternalStore } from "react";

const KEY = "pointpals.choreOrder.v1";

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let order: string[] = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist(next: string[]) {
  order = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(order));
    } catch {
      /* storage unavailable — order stays in memory for this session */
    }
  }
  emit();
}

export function getChoreOrder(): string[] {
  return order;
}

export function useChoreOrder(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => order,
    () => order,
  );
}

/** Sort items by the saved order. Ids not in the order keep their incoming
 *  relative position, after all ordered ones. Pure — safe to call in render. */
export function orderChores<T extends { id: string }>(items: T[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i] as const));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra == null && rb == null) return 0; // both unknown — keep input order (stable sort)
    if (ra == null) return 1; // unknown sorts after known
    if (rb == null) return -1;
    return ra - rb;
  });
}

/** Move `id` one step earlier (-1) or later (+1) within `ids` (the ordered id
 *  list currently shown) and persist the full order. */
export function moveChore(ids: string[], id: string, dir: -1 | 1): void {
  const list = [...ids];
  const from = list.indexOf(id);
  if (from === -1) return;
  const to = from + dir;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  persist(list);
}
