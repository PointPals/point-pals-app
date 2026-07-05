import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, PlusCircle, Search } from "lucide-react";
import type { Kid } from "@/lib/mock-data";
import { PASTEL_HEX, appliesToKid } from "@/lib/mock-data";
import { useApp } from "@/lib/app-store";
import { CompanionAvatar } from "./CompanionAvatar";
import { IconTile } from "./IconTile";

export function AwardModal({
  kid,
  onAward,
  onClose,
}: {
  kid: Kid;
  onAward: (item: { name: string; icon: string; points: number }) => void;
  onClose: () => void;
}) {
  const { chores, skills } = useApp();
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work">("chores");
  const [pointsFlash, setPointsFlash] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const prevPoints = useRef(kid.currentPoints);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Per-kid assignment: this modal awards to exactly one kid, so hide anything
  // narrowed to other kids. Must stay in lockstep with the printable-chart
  // filter (KidChartCard) — the live tiles and the PDF must always agree.
  const eligibleChores = useMemo(
    () => chores.filter((c) => appliesToKid(c, kid.id)),
    [chores, kid.id],
  );
  const eligibleSkills = useMemo(
    () => skills.filter((s) => appliesToKid(s, kid.id)),
    [skills, kid.id],
  );
  const positive = useMemo(() => eligibleSkills.filter((s) => s.isPositive), [eligibleSkills]);
  const needsWork = useMemo(() => eligibleSkills.filter((s) => !s.isPositive), [eligibleSkills]);

  // Collect all unique tags from chores for filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    eligibleChores.forEach((c) => (c.tags ?? []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [eligibleChores]);

  // Filter chores by search text and tag
  const filteredChores = useMemo(() => {
    let result = [...eligibleChores];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (tagFilter) {
      result = result.filter((c) => (c.tags ?? []).includes(tagFilter));
    }
    return result;
  }, [eligibleChores, search, tagFilter]);

  // Filter skills by name (skills don't have tags)
  const filteredSkills = useMemo(() => {
    const items = tab === "positive" ? positive : needsWork;
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((s) => s.name.toLowerCase().includes(q));
  }, [positive, needsWork, search, tab]);

  const list = tab === "chores" ? filteredChores : filteredSkills;
  const empty = chores.length === 0 && skills.length === 0;

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Focus search when switching to chores tab
  useEffect(() => {
    if (tab === "chores") {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [tab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Give points to ${kid.name}`}
    >
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] cursor-default"
        tabIndex={-1}
      />

      {/* card */}
      <div className="relative w-full sm:max-w-2xl max-h-[88vh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl animate-pop-in overflow-hidden">
        {/* header — kid identity + live points + X */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${PASTEL_HEX[kid.color]} 55%, white), white)`,
          }}
        >
          <div
            className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ backgroundColor: PASTEL_HEX[kid.color] }}
          >
            <CompanionAvatar
              seed={kid.id}
              color={kid.color}
              size={48}
              companionId={kid.companionId}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl font-bold leading-none truncate">{kid.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Tap a tile to give points</div>
          </div>
          <div
            className={`font-display text-2xl font-bold rounded-full px-3 py-1 transition-colors ${
              pointsFlash ? "animate-badge-bounce bg-sage/70" : "bg-card/70"
            }`}
          >
            {kid.currentPoints}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="ml-1 h-10 w-10 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-sm transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="px-5 pt-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
            {[
              { k: "chores", label: "Chores" },
              { k: "positive", label: "Positive" },
              { k: "needs-work", label: "Needs work" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k as typeof tab);
                  setSearch("");
                  setTagFilter(null);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + tag filters (only for chores tab) */}
        {tab === "chores" && (
          <div className="px-5 pt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chores…"
                className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    tagFilter === null
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      tagFilter === tag
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* tile grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {empty ? (
            <div className="text-center py-10">
              <PlusCircle className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                No chores or skills yet — add some in the Library first.
              </p>
              <Link
                to="/library"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
              >
                Go to Library
              </Link>
            </div>
          ) : list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              {search || tagFilter
                ? "Nothing matches your search or filter."
                : "Nothing in this category yet."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-5 justify-items-center">
              {list.map((item) => (
                <IconTile
                  key={item.id}
                  icon={item.icon}
                  label={item.name}
                  color={item.color}
                  points={item.points}
                  muted={tab === "needs-work"}
                  onClick={() => onAward({ name: item.name, icon: item.icon, points: item.points })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
