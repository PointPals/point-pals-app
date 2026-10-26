import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApp, type AwardBatch } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { primeAudio, triggerAwardFeedback, haptic } from "@/lib/feedback";
import { KidCard } from "@/components/shell/KidCard";
import { AddKidSheet } from "@/components/shell/AddKidSheet";
import { AwardModal } from "@/components/AwardModal";
import { FamilyJarCard } from "@/components/FamilyJarCard";
import { PersonalJarCard } from "@/components/PersonalJarCard";
import { EmptyState } from "@/components/EmptyState";
import { RecentActivity } from "@/components/RecentActivity";
import { InstallPrompt } from "@/components/InstallPrompt";
import { VisitSummarySheet } from "@/components/visitors/VisitSummarySheet";
import {
  addVisitAwards,
  isVisitorId,
  removeLastVisitAwards,
  takePendingVisit,
  useVisitors,
  visitorAsKid,
  visitTotal,
} from "@/lib/visitors";
import { Plus, Send, Undo2, Users } from "lucide-react";

// The app has no real auth/session system yet (§8 landing page is built without
// one), so "has this device ever used the app" is approximated by the presence
// of the persisted app-store key (see lib/app-store.tsx STORAGE_KEY). A truly
// first-time visitor is sent to the marketing page at /welcome; `?entered=1`
// (set by /welcome's "Log in" and "Get started" links) always bypasses
// this so nobody gets bounced back and forth.
const APP_STATE_KEY = "pointpals.state.v2";

type HomeSearch = { entered?: boolean };

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    entered: search.entered === true || search.entered === "true" ? true : undefined,
  }),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Home (§3) — deliberately minimal: the kid row (tap → award modal) and the
// marble jar as the dominant visual. No chore/skill tiles live here; they're
// exclusively inside the AwardModal. The old text feed moved to /memories.
function HomePage() {
  const { kids, household, history, awardPoints, undoBatch, streakByKid, hydrated } = useApp();
  const { canAward, canEdit } = useHouseholdRole(household.id);
  const { entered } = Route.useSearch();
  const navigate = useNavigate();
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [visitorAddOpen, setVisitorAddOpen] = useState(false);
  const [summaryVisitorId, setSummaryVisitorId] = useState<string | null>(null);
  const visitors = useVisitors();
  const [toast, setToast] = useState<{
    batches: AwardBatch[];
    text: string;
    /** Visitor awards live on this device; undo removes the last N. */
    visitor?: { id: string; count: number };
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jarsRef = useRef<HTMLElement>(null);
  useEffect(() => setMounted(true), []);

  // Back to a friend's visit report that sent this parent to log in.
  useEffect(() => {
    const pending = takePendingVisit();
    if (pending) void navigate({ to: "/visit", hash: `v=${pending}` });
  }, [navigate]);

  // First-time-visitor redirect to the marketing page (§8).
  useEffect(() => {
    if (entered) return;
    try {
      if (window.localStorage.getItem(APP_STATE_KEY) === null) {
        void navigate({ to: "/welcome" });
      }
    } catch {
      /* storage blocked — treat as a returning visitor, stay on the app */
    }
  }, [entered, navigate]);

  const activeVisitor = visitors.find((v) => v.id === activeKidId) ?? null;
  const activeKid =
    kids.find((k) => k.id === activeKidId) ?? (activeVisitor ? visitorAsKid(activeVisitor) : null);
  const summaryVisitor = visitors.find((v) => v.id === summaryVisitorId) ?? null;

  const openKid = (id: string) => {
    if (!canAward) return;
    primeAudio(); // unlock audio inside this first gesture (iOS/Safari)
    haptic("light");
    setActiveKidId(id);
  };

  // Called from the modal's tile tap. The chime MUST fire synchronously here —
  // first, before any state work or network write — so the browser's
  // user-gesture grant still applies. Verified on iOS Safari (the strictest
  // autoplay case): primeAudio() resumes the AudioContext inside the earlier
  // avatar-tap gesture, and playChime() here plays on the award tap. §3c.
  const award = (items: { name: string; icon: string; points: number }[]) => {
    if (!activeKidId || items.length === 0) return;
    const kidId = activeKidId;
    const totalPoints = items.reduce((sum, it) => sum + it.points, 0);
    const summary =
      items.length === 1
        ? `${items[0].points > 0 ? "+" : ""}${items[0].points} ${items[0].name}`
        : `${totalPoints > 0 ? "+" : ""}${totalPoints} points · ${items.length} taps`;

    // A visiting friend: points stay on this device, never in the family jar,
    // so there's no jar to scroll to — just the chimes and an undo.
    if (isVisitorId(kidId)) {
      setActiveKidId(null);
      items.forEach((item, i) =>
        window.setTimeout(() => triggerAwardFeedback("positive"), 160 + i * 260),
      );
      addVisitAwards(kidId, items);
      setToast({ batches: [], text: summary, visitor: { id: kidId, count: items.length } });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
      return;
    }

    // Close the modal immediately so the marble drops into the jar are visible.
    // primeAudio() already unlocked the AudioContext on the earlier avatar tap,
    // so deferring the chime/award out of the gesture is safe on iOS.
    setActiveKidId(null);
    // On mobile the jar sits below the fold, so once the modal closes, smooth-
    // scroll it into view and hold the drops until the scroll lands — the child
    // watches the marbles fall in. Desktop keeps the snappy timing since the
    // jar is already beside the kid row.
    const onMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (onMobile) {
      requestAnimationFrame(() =>
        jarsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
    // Drop the marbles one at a time (~260ms apart) with a chime per award, so
    // a batch of taps reads as several distinct drops — kids hear "+3" as three
    // separate chimes. AudioContext was already unlocked on the avatar tap, so
    // the deferred chimes still play on iOS.
    const startDelay = onMobile ? 620 : 160;
    const STAGGER_MS = 260;
    const batches: AwardBatch[] = [];
    items.forEach((item, i) => {
      window.setTimeout(
        () => {
          triggerAwardFeedback(item.points >= 0 ? "positive" : "needs-work");
          batches.push(awardPoints([kidId], item));
          if (i === items.length - 1) {
            setToast({ batches, text: summary });
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 5000);
          }
        },
        startDelay + i * STAGGER_MS,
      );
    });
  };

  const undo = () => {
    if (!toast) return;
    if (toast.visitor) removeLastVisitAwards(toast.visitor.id, toast.visitor.count);
    // Reverse each award in the batch (newest first).
    [...toast.batches].reverse().forEach(undoBatch);
    haptic("light");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  if (hydrated && kids.length === 0) {
    return <EmptyState variant="no-kids" />;
  }

  return (
    <div className="space-y-8">
      {/* Visually-hidden h1 anchors the page for screen readers and SEO —
       * the visual hero is the marble jar rather than a headline. */}
      <h1 className="sr-only">Our Family Jar</h1>
      {/* Kids — tap a character to open the award sheet */}
      <section aria-labelledby="kids-heading" className="pt-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {greeting()}
        </p>
        <h2
          id="kids-heading"
          className="mt-1.5 font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.4rem]"
        >
          Who did something great?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {canAward
            ? "Tap a character to give points — or hand the phone over and let them choose."
            : "View only — an admin or parent can give you awarding rights."}
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {kids.map((kid) => (
            <li key={kid.id}>
              <KidCard
                kid={kid}
                points={household.splitJarsEnabled ? kid.personalPool : kid.currentPoints}
                onClick={() => openKid(kid.id)}
                disabled={!canAward}
              />
            </li>
          ))}
          {canEdit && (
            <li>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="tap group flex h-full min-h-[11.5rem] w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-ink/15 bg-card/40 p-4 text-ink-soft transition hover:border-ink/35 hover:bg-card/70 hover:text-ink"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-card shadow-clay-sm transition-transform duration-300 ease-spring group-hover:scale-110">
                  <Plus className="h-6 w-6" aria-hidden />
                </span>
                <span className="font-display text-lg font-semibold">Add a child</span>
              </button>
            </li>
          )}
        </ul>

        {visitors.length > 0 && (
          <div className="mt-7">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Visiting today
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visitors.map((v) => (
                <li key={v.id} className="flex flex-col gap-2">
                  <KidCard
                    kid={visitorAsKid(v)}
                    points={visitTotal(v)}
                    badge="Visiting"
                    onClick={() => openKid(v.id)}
                    disabled={!canAward}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setToast(null);
                      setSummaryVisitorId(v.id);
                    }}
                    className="tap inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-input bg-card px-3 text-sm font-semibold text-ink transition hover:bg-muted"
                  >
                    <Send className="h-4 w-4" aria-hidden /> Send points home
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canAward && (
          <button
            type="button"
            onClick={() => setVisitorAddOpen(true)}
            className="tap mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-ink-soft transition hover:text-ink"
          >
            <Users className="h-4 w-4" aria-hidden />A friend is over? Let them earn points too
          </button>
        )}
      </section>

      {/* Jars — personal jars flank the family jar when split jars are on (§6) */}
      <section aria-labelledby="jars-heading" ref={jarsRef}>
        <h2 id="jars-heading" className="sr-only">
          Jars
        </h2>
        <div className="flex flex-col items-center gap-6">
          {/* Personal jars row — above the family jar when split jars enabled */}
          {household.splitJarsEnabled &&
            kids.filter((k) => (k.personalTarget ?? 0) > 0).length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 w-full">
                {kids
                  .filter((k) => (k.personalTarget ?? 0) > 0)
                  .map((k) => (
                    <div key={k.id} className="w-[130px]">
                      <PersonalJarCard kid={k} size={100} showControls={false} />
                    </div>
                  ))}
              </div>
            )}
          {/* Family jar — hidden when individual-jars-only mode */}
          {household.sharedJarEnabled && <FamilyJarCard size={330} />}
        </div>
      </section>

      {/* Collapsed recent-activity log — quick context, not the photo wall */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="sr-only">
          Recent Activity
        </h2>
        <RecentActivity />
      </section>

      {/* "Add to Home Screen" banner (shows only when installable, 2+ sessions) */}
      <InstallPrompt />

      <AddKidSheet open={addOpen} onOpenChange={setAddOpen} />
      <AddKidSheet open={visitorAddOpen} onOpenChange={setVisitorAddOpen} mode="visitor" />
      <VisitSummarySheet
        visitor={summaryVisitor}
        hostName={household.name}
        onOpenChange={(open) => !open && setSummaryVisitorId(null)}
      />

      {/* Award modal (§2) */}
      {activeKid && (
        <AwardModal
          kid={activeKid}
          onAwardBatch={award}
          onClose={() => setActiveKidId(null)}
          visitor={!!activeVisitor}
        />
      )}

      {/* Undo toast — above the modal so it's visible while awarding */}
      {toast && (
        // Centred by a full-width flex row (not translate) — the old
        // translate-in animation dropped its -50% offset when it ended, so
        // the toast jumped off-centre to the right.
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-8">
          <div
            role="status"
            className="toast-rise pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-cream shadow-lift"
          >
            <span className="truncate text-sm font-semibold">{toast.text}</span>
            <button
              onClick={undo}
              className="tap flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-cream/15 px-3.5 text-sm font-bold transition hover:bg-cream/25"
            >
              <Undo2 className="h-4 w-4" aria-hidden /> Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
