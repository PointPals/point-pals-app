// Visiting friends — kids who are over for the day and want to earn points
// too. They live only on this device (never in the household's database), so
// their points can't leak into the family jar, reports or charts. When the
// visit ends, the parent sends a report home: a picture to text the friend's
// parent, plus a link that shows the visit and lets a PointPals family add
// the points to their own child in one tap.

import { useSyncExternalStore } from "react";
import { isIconKey } from "@/lib/icons";
import type { Kid, PastelKey } from "@/lib/mock-data";

export type VisitAward = { name: string; icon: string; points: number; at: number };

export type Visitor = {
  id: string;
  name: string;
  color: PastelKey;
  companionId: string;
  startedAt: number;
  awards: VisitAward[];
};

const STORAGE_KEY = "pointpals.visitors.v1";
/** Visits left open longer than this are dropped — a visit is a day, not a week. */
const MAX_VISIT_MS = 3 * 24 * 60 * 60 * 1000;
const EMPTY: Visitor[] = [];

let cache: Visitor[] | null = null;
const listeners = new Set<() => void>();

function read(): Visitor[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Visitor[]) : [];
    const cutoff = Date.now() - MAX_VISIT_MS;
    cache = Array.isArray(parsed) ? parsed.filter((v) => v && v.startedAt > cutoff) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Visitor[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the visit still works until the page reloads */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useVisitors(): Visitor[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function isVisitorId(id: string | null | undefined): boolean {
  return !!id && id.startsWith("visit_");
}

export function addVisitor(input: { name: string; color: PastelKey; companionId: string }) {
  const visitor: Visitor = {
    id: `visit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim().slice(0, 40),
    color: input.color,
    companionId: input.companionId,
    startedAt: Date.now(),
    awards: [],
  };
  write([...read(), visitor]);
  return visitor;
}

export function addVisitAwards(
  id: string,
  items: { name: string; icon: string; points: number }[],
) {
  const at = Date.now();
  write(
    read().map((v) =>
      v.id === id ? { ...v, awards: [...v.awards, ...items.map((it) => ({ ...it, at }))] } : v,
    ),
  );
}

/** Undo the last `count` awards (the undo toast). */
export function removeLastVisitAwards(id: string, count: number) {
  write(
    read().map((v) =>
      v.id === id ? { ...v, awards: v.awards.slice(0, Math.max(0, v.awards.length - count)) } : v,
    ),
  );
}

export function endVisit(id: string) {
  write(read().filter((v) => v.id !== id));
}

export function visitTotal(v: Pick<Visitor, "awards">): number {
  return v.awards.reduce((sum, a) => sum + a.points, 0);
}

/** A visitor shaped like a Kid, so the award sheet and cards can show them. */
export function visitorAsKid(v: Visitor): Kid {
  const total = visitTotal(v);
  return {
    id: v.id,
    name: v.name,
    color: v.color,
    companionId: v.companionId,
    currentPoints: total,
    allTimePoints: total,
    personalPool: 0,
    personalTarget: 0,
  };
}

// ── The report a visit sends home ──────────────────────────────────────────

export type VisitLine = { name: string; icon: string; points: number; count: number };

export type VisitReport = {
  friend: string;
  host: string;
  date: string; // ISO date the visit started
  color?: PastelKey;
  companionId?: string;
  lines: VisitLine[];
};

/** Same deed twice = one line with ×2, in the order they first happened. */
export function groupAwards(awards: VisitAward[]): VisitLine[] {
  const byKey = new Map<string, VisitLine>();
  for (const a of awards) {
    const key = `${a.name}\u0000${a.points}`;
    const line = byKey.get(key);
    if (line) line.count++;
    else byKey.set(key, { name: a.name, icon: a.icon, points: a.points, count: 1 });
  }
  return [...byKey.values()];
}

export function reportTotal(r: Pick<VisitReport, "lines">): number {
  return r.lines.reduce((sum, l) => sum + l.points * l.count, 0);
}

export function visitReport(v: Visitor, host: string): VisitReport {
  return {
    friend: v.name,
    host,
    date: new Date(v.startedAt).toISOString().slice(0, 10),
    color: v.color,
    companionId: v.companionId,
    lines: groupAwards(v.awards),
  };
}

// Link format: /visit#v=<base64url JSON>. The hash never reaches a server,
// so a child's name and what they did don't end up in anyone's access logs.
// The link isn't signed — the receiving parent reviews it before adding
// anything — so decoding clamps every field to sane bounds.
const MAX_LINES = 30;
const MAX_POINTS_PER_DEED = 20;
const MAX_COUNT = 10;

type Wire = {
  v: 1;
  f: string;
  h: string;
  d: string;
  c?: string;
  k?: string;
  l: [string, number, number, string?][];
};

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

export function encodeVisitReport(r: VisitReport): string {
  const wire: Wire = {
    v: 1,
    f: r.friend,
    h: r.host,
    d: r.date,
    c: r.color,
    k: r.companionId,
    // Registry icon keys are short; uploaded-image URLs would bloat the link,
    // so those fall back to a star on the other side.
    l: r.lines.slice(0, MAX_LINES).map((l) => {
      const row: [string, number, number, string?] = [l.name, l.points, l.count];
      if (isIconKey(l.icon) || [...l.icon].length <= 2) row.push(l.icon);
      return row;
    }),
  };
  return toBase64Url(JSON.stringify(wire));
}

const clampText = (s: unknown, max: number) =>
  typeof s === "string"
    ? s
        .replace(/\p{Cc}/gu, "")
        .trim()
        .slice(0, max)
    : "";
const clampInt = (n: unknown, min: number, max: number) =>
  typeof n === "number" && isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;

export function decodeVisitReport(encoded: string): VisitReport | null {
  try {
    const wire = JSON.parse(fromBase64Url(encoded)) as Partial<Wire>;
    if (wire.v !== 1 || !Array.isArray(wire.l)) return null;
    const friend = clampText(wire.f, 40);
    if (!friend) return null;
    const lines = wire.l.slice(0, MAX_LINES).flatMap((row): VisitLine[] => {
      if (!Array.isArray(row)) return [];
      const name = clampText(row[0], 60);
      if (!name) return [];
      // Only icons from the built-in set (or a short emoji) survive the trip.
      const icon = clampText(row[3], 80);
      const safeIcon = isIconKey(icon) || (icon && [...icon].length <= 4) ? icon : "⭐";
      return [
        {
          name,
          points: clampInt(row[1], 1, MAX_POINTS_PER_DEED),
          count: clampInt(row[2], 1, MAX_COUNT),
          icon: safeIcon,
        },
      ];
    });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(wire.d)) ? String(wire.d) : "";
    return {
      friend,
      host: clampText(wire.h, 60) || "a friend’s place",
      date,
      color: wire.c as PastelKey | undefined,
      companionId: clampText(wire.k, 20) || undefined,
      lines,
    };
  } catch {
    return null;
  }
}

export function visitReportUrl(r: VisitReport, origin = window.location.origin): string {
  return `${origin}/visit#v=${encodeVisitReport(r)}`;
}

/** Remember which reports this device already added, so a re-opened link
 * can't add the same visit twice. */
const IMPORTED_KEY = "pointpals.visits.imported.v1";

/** FNV-1a — a short, stable fingerprint of the whole link. */
function fingerprint(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export function wasImported(encoded: string): boolean {
  try {
    const list = JSON.parse(window.localStorage.getItem(IMPORTED_KEY) ?? "[]") as string[];
    return list.includes(fingerprint(encoded));
  } catch {
    return false;
  }
}

export function markImported(encoded: string) {
  try {
    const list = JSON.parse(window.localStorage.getItem(IMPORTED_KEY) ?? "[]") as string[];
    list.push(fingerprint(encoded));
    window.localStorage.setItem(IMPORTED_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    /* storage blocked — nothing to remember */
  }
}

/** A report link opened while signed out: kept for this tab so that after
 * logging in (sign-in lands on Home) the parent is taken straight back to it. */
const PENDING_KEY = "pointpals.visit.pending";

export function rememberPendingVisit(encoded: string) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, encoded);
  } catch {
    /* storage blocked — they can reopen the link */
  }
}

export function takePendingVisit(): string | null {
  try {
    const v = window.sessionStorage.getItem(PENDING_KEY);
    if (v) window.sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return null;
  }
}
