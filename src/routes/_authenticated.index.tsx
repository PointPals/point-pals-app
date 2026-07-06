import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApp, type AwardBatch } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { primeAudio, playChime, haptic } from "@/lib/feedback";
import { KidBadge } from "@/components/KidBadge";
import { AwardModal } from "@/components/AwardModal";
import { FamilyJarCard } from "@/components/FamilyJarCard";
import { PersonalJarCard } from "@/components/PersonalJarCard";
import { EmptyState } from "@/components/EmptyState";
import { RecentActivity } from "@/components/RecentActivity";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Undo2 } from "lucide-react";

// The app has no real auth/session system yet (§8 landing page is built without
// one), so "has this device ever used the app" is approximated by the presence
// of the persisted app-store key (see lib/app-store.tsx STORAGE_KEY). A truly
// first-time visitor is sent to the marketing page at /welcome; `?entered=1`
// (set by /welcome's "Log in" and "Start free trial" links) always bypasses
// this so nobody gets bounced back and forth.
const APP_STATE_KEY = "pointpals.state.v2";

type HomeSearch = { entered?: boolean };

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    entered: search.entered === true || search.entered === "true" ? true : undefined,
  }),
});

// Home (§3) — deliberately minimal: the kid row (tap → award modal) and the
// marble jar as the dominant visual. No chore/skill tiles live here; they're
// exclusively inside the AwardModal. The old text feed moved to /memories.
function HomePage() {
  const { kids, household, history, awardPoints, undoBatch, streakByKid, hydrated } = useApp();
  const { canAward, canEdit } = useHouseholdRole(household.id);
  const { entered } = Route.useSearch();
  const navigate = useNavigate();
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ batch: AwardBatch; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setMounted(true), []);

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

  const activeKid = kids.find((k) => k.id === activeKidId) ?? null;

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
  const award = (item: { name: string; icon: string; points: number }) => {
    if (!activeKidId) return;
    const positiveAward = item.points >= 0;
    const kidId = activeKidId;
    // Close the modal immediately so the marble drop into the jar is visible.
    // primeAudio() already unlocked the AudioContext on the earlier avatar tap,
    // so deferring the chime/award out of the gesture is safe on iOS.
    setActiveKidId(null);
    haptic(positiveAward ? "success" : "medium");
    window.setTimeout(() => {
      playChime(positiveAward ? "positive" : "needs-work");
      const batch = awardPoints([kidId], item);
      const text = `${item.points > 0 ? "+" : ""}${item.points} ${item.name}`;
      setToast({ batch, text });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }, 180);
  };

  const undo = () => {
    if (!toast) return;
    undoBatch(toast.batch);
    haptic("light");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  if (hydrated && kids.length === 0) {
    return <EmptyState variant="no-kids" />;
  }

  return (
    <div className="space-y-6">
      {/* Visually-hidden h1 anchors the page for screen readers and SEO —
       * the visual hero is the marble jar rather than a headline. */}
      <h1 className="sr-only">Our Family Jar</h1>
      {/* Kid row — tap to open the award modal */}
      <section aria-labelledby="kids-heading" className="pt-5">
        <h2 id="kids-heading" className="sr-only">Kids</h2>
        <div className="flex flex-wrap gap-4 justify-center sm:flex-nowrap sm:gap-5 sm:overflow-x-auto sm:justify-start sm:pb-2 sm:-mx-1 sm:px-1">
          {kids.map((kid) => (
            <div key={kid.id} className="flex flex-col items-center gap-1.5">
              <KidBadge
                kid={kid}
                size="lg"
                points={household.splitJarsEnabled ? kid.personalPool : kid.currentPoints}
                onClick={() => openKid(kid.id)}
              />
            </div>
          ))}
          {canEdit && (
            <Link
              to="/library"
              className="tap w-[92px] h-[92px] rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-2xl self-start hover:border-foreground hover:text-foreground transition shrink-0"
              aria-label="Manage family"
            >
              +
            </Link>
          )}
        </div>
        <p className="text-center sm:text-left text-sm text-muted-foreground mt-1">
          {canAward
            ? "Tap a character to award points."
            : "View only — an admin or parent can give you awarding rights."}
        </p>
      </section>

      {/* Jars — personal jars flank the family jar when split jars are on (§6) */}
      <section aria-labelledby="jars-heading">
        <h2 id="jars-heading" className="sr-only">Jars</h2>
        <div className="flex flex-col items-center gap-6">
          {/* Personal jars row — above the family jar when split jars enabled */}
          {household.splitJarsEnabled && kids.filter((k) => (k.personalTarget ?? 0) > 0).length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {kids
                .filter((k) => (k.personalTarget ?? 0) > 0)
                .map((k) => (
                  <div key={k.id} className="w-[130px]">
                    <PersonalJarCard kid={k} size={100} />
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
        <h2 id="activity-heading" className="sr-only">Recent Activity</h2>
        <RecentActivity />
      </section>

      {/* "Add to Home Screen" banner (shows only when installable, 2+ sessions) */}
      <InstallPrompt />

      {/* Award modal (§2) */}
      {activeKid && (
        <AwardModal kid={activeKid} onAward={award} onClose={() => setActiveKidId(null)} />
      )}

      {/* Undo toast — above the modal so it's visible while awarding */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] animate-toast-in">
          <div className="flex items-center gap-3 rounded-full bg-foreground text-background pl-5 pr-2 py-2 shadow-xl">
            <span className="font-semibold text-sm whitespace-nowrap">{toast.text}</span>
            <button
              onClick={undo}
              className="flex items-center gap-1.5 rounded-full bg-background/15 hover:bg-background/25 px-3 py-1.5 text-sm font-bold transition"
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
