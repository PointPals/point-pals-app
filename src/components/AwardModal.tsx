import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, PlusCircle, Search, Sparkles, HandHeart, Check } from "lucide-react";
import type { Kid } from "@/lib/mock-data";
import { PASTEL_HEX, appliesToKid } from "@/lib/mock-data";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { haptic, primeAudio } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { CompanionAvatar } from "./CompanionAvatar";
import { IconTile, TileIcon } from "./IconTile";
import { KidMode } from "./kid-mode/KidMode";

type AwardItem = { name: string; icon: string; points: number };
type Tab = "chores" | "positive" | "needs-work";

const TABS: { k: Tab; label: string }[] = [
  { k: "chores", label: "Chores" },
  { k: "positive", label: "Kind & brave" },
  { k: "needs-work", label: "Needs work" },
];

export function AwardModal({
  kid,
  onAwardBatch,
  onClose,
  visitor = false,
}: {
  kid: Kid;
  onAwardBatch: (items: AwardItem[]) => void;
  onClose: () => void;
  /** A friend who's visiting: every chore is open to them (assignments are
   *  for your own kids), and there's no needs-work tab — that's a
   *  conversation for their own family. */
  visitor?: boolean;
}) {
  const { chores, skills, household, updateChore } = useApp();
  const { canEdit } = useHouseholdRole(household.id);
  const [tab, setTab] = useState<Tab>("chores");
  const [pointsFlash, setPointsFlash] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [kidMode, setKidMode] = useState(false);
  // Batch tray: tapping tiles adds them here; "Add to jar" awards them all at
  // once so N marbles drop together instead of one award closing the sheet.
  const [tray, setTray] = useState<AwardItem[]>([]);
  const trayPoints = tray.reduce((sum, it) => sum + it.points, 0);
  const prevPoints = useRef(kid.currentPoints);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Per-kid assignment: this modal awards to exactly one kid, so hide anything
  // narrowed to other kids. Must stay in lockstep with the printable-chart
  // filter (KidChartCard) — the live tiles and the PDF must always agree.
  const eligibleChores = useMemo(
    () => (visitor ? chores : chores.filter((c) => appliesToKid(c, kid.id))),
    [chores, kid.id, visitor],
  );
  const tabs = visitor ? TABS.filter((t) => t.k !== "needs-work") : TABS;
  // Positive and needs-work behaviours are NOT assigned per child — every
  // positive/negative point is always awardable for whichever kid is selected,
  // no tagging required. (Chores above still respect per-kid assignment.)
  const positive = useMemo(() => skills.filter((s) => s.isPositive), [skills]);
  const needsWork = useMemo(() => skills.filter((s) => !s.isPositive), [skills]);

  // Collect all unique tags from chores for filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    eligibleChores.forEach((c) => (c.tags ?? []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [eligibleChores]);

  const filteredChores = useMemo(() => {
    let result = [...eligibleChores];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (tagFilter) result = result.filter((c) => (c.tags ?? []).includes(tagFilter));
    return result;
  }, [eligibleChores, search, tagFilter]);

  const filteredSkills = useMemo(() => {
    const items = tab === "positive" ? positive : needsWork;
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((s) => s.name.toLowerCase().includes(q));
  }, [positive, needsWork, search, tab]);

  const list = tab === "chores" ? filteredChores : filteredSkills;
  const empty = chores.length === 0 && skills.length === 0;
  // First-run dead end: the family has chores, but none are assigned to this
  // child yet. Offer to assign them right here instead of a trip to Chores.
  const unassignedForKid = tab === "chores" && eligibleChores.length === 0 && chores.length > 0;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tray) m.set(t.name, (m.get(t.name) ?? 0) + 1);
    return m;
  }, [tray]);

  // Bounce the header point count when it changes.
  useEffect(() => {
    if (kid.currentPoints === prevPoints.current) return;
    prevPoints.current = kid.currentPoints;
    setPointsFlash(true);
    const t = setTimeout(() => setPointsFlash(false), 600);
    return () => clearTimeout(t);
  }, [kid.currentPoints]);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !kidMode && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, kidMode]);

  // Focus search on the chores tab — only with a physical keyboard. On touch
  // devices focusing pops the on-screen keyboard over the whole icon grid.
  useEffect(() => {
    if (tab === "chores" && !window.matchMedia("(pointer: coarse)").matches) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [tab]);

  const assignAll = () => {
    for (const c of chores) {
      const ids = c.assignedKidIds ?? [];
      if (!ids.includes(kid.id)) updateChore(c.id, { assignedKidIds: [...ids, kid.id] });
    }
    haptic("success");
  };
  const assignOne = (id: string) => {
    const c = chores.find((x) => x.id === id);
    if (!c) return;
    const ids = c.assignedKidIds ?? [];
    if (!ids.includes(kid.id)) updateChore(c.id, { assignedKidIds: [...ids, kid.id] });
    haptic("light");
  };

  const wash = PASTEL_HEX[kid.color];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Give points to ${kid.name}`}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[3px]"
        tabIndex={-1}
      />

      <div className="award-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-card shadow-lift sm:max-h-[88vh] sm:max-w-2xl sm:rounded-[2rem]">
        {/* Header — the child, their points, and the hand-over */}
        <div
          className="relative px-5 pb-4 pt-3"
          style={{
            background: `linear-gradient(160deg, color-mix(in oklab, ${wash} 80%, white), color-mix(in oklab, ${wash} 25%, white) 85%)`,
          }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/15 sm:hidden" aria-hidden />
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-clay-sm"
              style={{ backgroundColor: wash }}
            >
              <CompanionAvatar
                seed={kid.id}
                color={kid.color}
                size={56}
                companionId={kid.companionId}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink">
                {kid.name}
              </div>
              <div className="mt-1 text-xs font-medium text-ink-soft">
                <span
                  className={cn(
                    "inline-block font-display text-sm font-semibold text-ink",
                    pointsFlash && "animate-badge-bounce",
                  )}
                >
                  {kid.currentPoints}
                </span>{" "}
                {visitor ? "points today · visiting" : "points · what did they do?"}
              </div>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/70 text-ink shadow-clay-sm hover:bg-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {!empty && (
            <button
              type="button"
              onClick={() => {
                primeAudio();
                setKidMode(true);
              }}
              className="tap group mt-4 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white/80 px-4 py-2.5 text-left shadow-clay-sm transition hover:bg-white"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-cream">
                <HandHeart className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Hand the phone to {kid.name}</span>
                <span className="block text-xs text-ink-soft">
                  They pick what they did — you hold to approve.
                </span>
              </span>
              <span
                aria-hidden
                className="text-ink-soft transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </button>
          )}
        </div>

        {/* Segmented control */}
        <div className="px-5 pt-4">
          <div
            role="tablist"
            aria-label="Kind of points"
            className={cn(
              "grid gap-1 rounded-full bg-muted p-1",
              tabs.length === 2 ? "grid-cols-2" : "grid-cols-3",
            )}
          >
            {tabs.map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={tab === t.k}
                onClick={() => {
                  setTab(t.k);
                  setSearch("");
                  setTagFilter(null);
                }}
                className={cn(
                  "tap min-h-11 rounded-full px-2 text-[0.85rem] font-semibold transition",
                  tab === t.k
                    ? t.k === "needs-work"
                      ? "bg-card text-ink shadow-clay-sm"
                      : "bg-ink text-cream shadow-clay-sm"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + tag filters (chores tab) */}
        {tab === "chores" && eligibleChores.length > 0 && (
          <div className="space-y-2 px-5 pt-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chores…"
                className="w-full rounded-full bg-muted py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {allTags.length > 0 && (
              <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {[null, ...allTags].map((tag) => (
                  <button
                    key={tag ?? "all"}
                    onClick={() => setTagFilter(tag)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                      tagFilter === tag
                        ? "bg-ink text-cream"
                        : "bg-muted text-ink-soft hover:text-ink",
                    )}
                  >
                    {tag ?? "All"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "needs-work" && list.length > 0 && (
          <p className="px-5 pt-3 text-xs text-muted-foreground">
            A gentle nudge, not a punishment — a marble comes back out of the jar.
          </p>
        )}

        {/* Tile grid — min-h-0 lets this flex child actually shrink & scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {empty ? (
            <div className="py-10 text-center">
              <PlusCircle className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                No chores or behaviours yet — add a few on the Chores page first.
              </p>
              <Link
                to="/library"
                onClick={onClose}
                className="tap mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream"
              >
                Go to Chores
              </Link>
            </div>
          ) : unassignedForKid ? (
            <div className="rounded-3xl bg-muted/60 p-5">
              <p className="font-display text-xl font-semibold text-ink">
                {kid.name} doesn’t have any chores yet
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {canEdit
                  ? `Pick the ones that are ${kid.name}’s — or give them the lot.`
                  : `An admin or parent can assign chores to ${kid.name}.`}
              </p>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={assignAll}
                    className="tap mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream shadow-clay-sm"
                  >
                    <Check className="h-4 w-4" aria-hidden /> Give {kid.name} all {chores.length}{" "}
                    chores
                  </button>
                  <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {chores.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => assignOne(c.id)}
                          className="tap flex min-h-12 w-full items-center gap-3 rounded-2xl bg-card px-3 py-2 text-left shadow-clay-sm"
                        >
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                            style={{ backgroundColor: PASTEL_HEX[c.color] }}
                          >
                            <TileIcon icon={c.icon} className="h-7 w-7 text-xl" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                            {c.name}
                          </span>
                          <span className="text-xs font-semibold text-ink-soft">
                            + for {kid.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link
                to="/library"
                onClick={onClose}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Manage chores
              </Link>
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || tagFilter ? "Nothing matches your search or filter." : "Nothing here yet."}
            </p>
          ) : (
            <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-5 sm:grid-cols-4">
              {list.map((item) => (
                <IconTile
                  key={item.id}
                  icon={item.icon}
                  label={item.name}
                  color={item.color}
                  points={item.points}
                  muted={tab === "needs-work"}
                  count={counts.get(item.name)}
                  onClick={() => {
                    haptic("light");
                    setTray((t) => [
                      ...t,
                      { name: item.name, icon: item.icon, points: item.points },
                    ]);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Batch tray — review the running total, then drop them all at once */}
        {tray.length > 0 && (
          <div className="shrink-0 border-t border-border/70 bg-card/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTray([])}
                className="tap min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-ink"
              >
                Clear
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-semibold leading-none text-ink">
                  {trayPoints > 0 ? "+" : ""}
                  {trayPoints}
                  <span className="font-sans text-sm font-normal text-muted-foreground">
                    {" "}
                    · {tray.length} {tray.length === 1 ? "tap" : "taps"}
                  </span>
                </div>
                <div className="mt-1 flex -space-x-1.5 overflow-hidden">
                  {tray.slice(-8).map((t, i) => (
                    <span
                      key={i}
                      className="grid h-6 w-6 place-items-center rounded-full bg-muted ring-2 ring-card"
                    >
                      <TileIcon icon={t.icon} className="h-4 w-4 text-xs" />
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onAwardBatch(tray)}
                className="tap inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream shadow-clay-sm"
              >
                <Sparkles className="h-4 w-4" aria-hidden /> {visitor ? "Add points" : "Add to jar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {kidMode && (
        <KidMode
          kid={kid}
          chores={eligibleChores}
          positives={positive}
          onApprove={(items) => onAwardBatch(items)}
          onCancel={() => setKidMode(false)}
        />
      )}
    </div>
  );
}
