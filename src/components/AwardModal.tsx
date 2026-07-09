import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, PlusCircle, Search, Sparkles, Loader2 } from "lucide-react";
import type { Kid } from "@/lib/mock-data";
import { PASTEL_HEX, appliesToKid } from "@/lib/mock-data";
import { useApp } from "@/lib/app-store";
import { hasEntitlement, formatPrice, isSubscribed, BILLING_CONFIG } from "@/lib/entitlements";
import { startCheckout } from "@/lib/billing";
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
  const { household, chores, skills } = useApp();
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work">("chores");
  const [pointsFlash, setPointsFlash] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [paywallItem, setPaywallItem] = useState<{ name: string; icon: string; points: number } | null>(null);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [paywallErr, setPaywallErr] = useState<string | null>(null);
  const prevPoints = useRef(kid.currentPoints);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const canAward = hasEntitlement(household, "award_points");
  const subscribed = isSubscribed(household);

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

  // Focus search when switching to chores tab — but only on devices with a
  // physical keyboard. On touch devices focusing pops the on-screen keyboard
  // over the whole icon grid before the parent can see it.
  useEffect(() => {
    if (tab === "chores" && !window.matchMedia("(pointer: coarse)").matches) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [tab]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Give points to ${kid.name}`}
    >
      {/* backdrop - stops above the bottom nav so nav stays visible on mobile */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bottom-[var(--nav-h,68px)] bg-foreground/30 backdrop-blur-[2px] cursor-default md:bottom-0"
        tabIndex={-1}
      />

      {/* card - stops above the bottom nav on mobile */}
      <div className="relative w-full sm:max-w-2xl max-h-[80vh] sm:max-h-[88vh] mb-[var(--nav-h,68px)] sm:mb-0 flex flex-col bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl animate-pop-in overflow-hidden">
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
            <div className="text-xs text-muted-foreground mt-1">Tap your character to award points</div>
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
              { k: "positive", label: "👍 Positive" },
              { k: "needs-work", label: "👎 Needs work" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k as typeof tab);
                  setSearch("");
                  setTagFilter(null);
                }}
                className={`tap inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold transition ${
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
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-16">
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
                  onClick={() => {
                    if (canAward) {
                      onAward({ name: item.name, icon: item.icon, points: item.points });
                    } else {
                      setPaywallItem({ name: item.name, icon: item.icon, points: item.points });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paywall overlay — shown when a free user taps a tile */}
        {paywallItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm rounded-t-3xl sm:rounded-3xl p-6">
            <div
              className="w-full max-w-sm rounded-3xl p-6 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--pastel-butter) 55%, white), color-mix(in oklab, var(--pastel-lilac) 45%, white))",
              }}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground/60">
                <Sparkles className="h-3.5 w-3.5" /> PointPals Plus
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold">
                Assign points to your chore chart
              </h3>
              <p className="mt-1 text-sm text-foreground/70">
                {subscribed
                  ? "Your trial includes premium features. When it ends, subscribe to keep awarding points, filling the marble jar, and unlocking rewards."
                  : `Subscribe for ${formatPrice()} to award points, fill the marble jar, and unlock rewards for your family.`}
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold">{formatPrice()}</span>
                <span className="text-sm text-foreground/60">
                  {subscribed ? "after trial" : "/month"}
                </span>
              </div>
              <button
                onClick={async () => {
                  setPaywallBusy(true);
                  setPaywallErr(null);
                  const res = await startCheckout(household.id);
                  if (res.url) {
                    window.location.href = res.url;
                    return;
                  }
                  setPaywallErr(res.error ?? "Billing backend not connected.");
                  setPaywallBusy(false);
                }}
                disabled={paywallBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
              >
                {paywallBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {subscribed ? "Confirm now" : "Subscribe"}
              </button>
              <p className="mt-3 text-xs text-foreground/50">
                Secure checkout by Stripe &middot; cancel anytime &middot; prices in{" "}
                {BILLING_CONFIG.primaryCurrency}.
              </p>
              {paywallErr && <p className="mt-2 text-xs text-destructive">{paywallErr}</p>}
              <button
                onClick={() => {
                  setPaywallItem(null);
                  setPaywallErr(null);
                }}
                className="mt-3 text-xs text-foreground/60 underline hover:text-foreground transition"
              >
                Go back to browsing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
