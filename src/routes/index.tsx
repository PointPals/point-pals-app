import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApp, type AwardBatch } from "@/lib/app-store";
import { primeAudio, playChime, haptic } from "@/lib/feedback";
import { KidBadge } from "@/components/KidBadge";
import { AwardModal } from "@/components/AwardModal";
import { FamilyJarCard } from "@/components/FamilyJarCard";
import { EmptyState } from "@/components/EmptyState";
import { Undo2 } from "lucide-react";

// The app has no real auth/session system yet (§8 landing page is built without
// one), so "has this device ever used the app" is approximated by the presence
// of the persisted app-store key (see lib/app-store.tsx STORAGE_KEY). A truly
// first-time visitor is sent to the marketing page at /welcome; `?entered=1`
// (set by /welcome's "Log in" and "Start free trial" links) always bypasses
// this so nobody gets bounced back and forth.
const APP_STATE_KEY = "pointpals.state.v2";

type HomeSearch = { entered?: boolean };

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    entered: search.entered === true || search.entered === "true" ? true : undefined,
  }),
});

// Home (§3) — deliberately minimal: the kid row (tap → award modal) and the
// marble jar as the dominant visual. No chore/skill tiles live here; they're
// exclusively inside the AwardModal. The old text feed moved to /memories.
function HomePage() {
  const { kids, awardPoints, undoBatch, streakByKid, hydrated } = useApp();
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
    primeAudio(); // unlock audio inside this first gesture (iOS/Safari)
    haptic("light");
    setActiveKidId(id);
  };

  // Called from the modal's tile tap. The chime MUST fire synchronously here —
  // first, before any state work — so the browser's user-gesture grant applies.
  const award = (item: { name: string; icon: string; points: number }) => {
    if (!activeKidId) return;
    const positiveAward = item.points >= 0;
    playChime(positiveAward ? "positive" : "needs-work");
    haptic(positiveAward ? "success" : "medium");

    const batch = awardPoints([activeKidId], item);
    const text = `${item.points > 0 ? "+" : ""}${item.points} ${item.name}`;
    setToast({ batch, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
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
      {/* Kid row — tap to open the award modal */}
      <section>
        <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1 justify-center sm:justify-start">
          {kids.map((kid) => (
            <KidBadge
              key={kid.id}
              kid={kid}
              size="lg"
              streak={mounted ? (streakByKid[kid.id] ?? 0) : 0}
              onClick={() => openKid(kid.id)}
            />
          ))}
          <Link
            to="/library"
            className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-2xl self-start hover:border-foreground hover:text-foreground transition shrink-0"
            aria-label="Manage family"
          >
            +
          </Link>
        </div>
        <p className="text-center sm:text-left text-xs text-muted-foreground mt-1">
          Tap a kid to give points.
        </p>
      </section>

      {/* The marble jar — the page's dominant visual (§3) */}
      <FamilyJarCard size={330} />

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
