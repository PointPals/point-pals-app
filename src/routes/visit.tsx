import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { TileIcon } from "@/components/IconTile";
import { Wordmark } from "@/components/brand/Wordmark";
import { haptic, primeAudio, triggerAwardFeedback } from "@/lib/feedback";
import { hostPlace } from "@/lib/visit-card";
import {
  decodeVisitReport,
  markImported,
  rememberPendingVisit,
  reportTotal,
  wasImported,
  type VisitReport,
} from "@/lib/visitors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/visit")({
  component: VisitPage,
  head: () => ({
    meta: [
      { title: "A visit report — PointPals" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "See the points a child earned while visiting a friend's family.",
      },
    ],
  }),
});

type State =
  | { phase: "loading" }
  | { phase: "invalid" }
  | { phase: "ready"; encoded: string; report: VisitReport };

/**
 * Opened from a "send points home" link. Anyone sees what the child did; a
 * signed-in PointPals parent can add the points to one of their own kids.
 * The report travels in the URL hash, so it never reaches a server.
 */
function VisitPage() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.hash.slice(1)).get("v") ?? "";
    const report = encoded ? decodeVisitReport(encoded) : null;
    setState(report ? { phase: "ready", encoded, report } : { phase: "invalid" });
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 35% at 10% 0%, color-mix(in oklab, var(--marble-plum) 22%, transparent), transparent 70%), radial-gradient(40% 30% at 95% 12%, color-mix(in oklab, var(--marble-aqua) 22%, transparent), transparent 70%), radial-gradient(50% 35% at 50% 100%, color-mix(in oklab, var(--marble-saffron) 18%, transparent), transparent 70%)",
        }}
      />
      <header className="relative mx-auto flex max-w-xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link to="/welcome" aria-label="PointPals home">
          <Wordmark className="text-[1.8rem]" />
        </Link>
      </header>

      <main className="relative mx-auto max-w-xl px-5 pb-16 pt-6">
        {state.phase === "loading" && <div className="h-96" aria-busy="true" />}
        {state.phase === "invalid" && (
          <div className="card-soft p-7 text-center">
            <h1 className="font-display text-3xl font-semibold text-ink">
              This link looks incomplete
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Ask for the visit report to be sent again — the whole link needs to come across.
            </p>
            <Link
              to="/welcome"
              className="tap bg-cta mt-6 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold text-white"
            >
              What is PointPals?
            </Link>
          </div>
        )}
        {state.phase === "ready" && <Report report={state.report} encoded={state.encoded} />}
      </main>
    </div>
  );
}

function Report({ report, encoded }: { report: VisitReport; encoded: string }) {
  const total = reportTotal(report);
  const color: PastelKey = report.color && report.color in PASTEL_HEX ? report.color : "sky";
  const wash = PASTEL_HEX[color];
  const day = report.date
    ? new Date(`${report.date}T12:00:00`).toLocaleDateString("en-NZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <>
      <section className="card-clay overflow-hidden">
        <div
          className="px-6 pb-6 pt-7 text-center"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklab, ${wash} 75%, white), color-mix(in oklab, ${wash} 15%, white))`,
          }}
        >
          <span
            className="mx-auto block h-28 w-28 overflow-hidden rounded-full shadow-clay"
            style={{ backgroundColor: wash }}
          >
            <CompanionAvatar
              seed={report.friend}
              color={color}
              size={112}
              companionId={report.companionId}
            />
          </span>
          <h1 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
            {report.friend} was a star!
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Points earned at {hostPlace(report.host)}
            {day && ` · ${day}`}
          </p>
          <p className="bg-cta mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-2xl font-semibold text-white shadow-clay-sm">
            +{total} {total === 1 ? "point" : "points"}
          </p>
        </div>
        <ul className="divide-y divide-border/70 px-6 py-2">
          {report.lines.map((l, i) => (
            <li key={`${l.name}-${i}`} className="flex items-center gap-3 py-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: wash }}
              >
                <TileIcon icon={l.icon} className="h-8 w-8 text-2xl" />
              </span>
              <span className="min-w-0 flex-1 font-semibold text-ink">
                {l.name}
                {l.count > 1 && (
                  <span className="ml-1.5 text-sm font-medium text-ink-soft">×{l.count}</span>
                )}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-ink">
                +{l.points * l.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <AddToFamily report={report} encoded={encoded} />
    </>
  );
}

function AddToFamily({ report, encoded }: { report: VisitReport; encoded: string }) {
  const { mode, hydrated, kids, household, awardPoints } = useApp();
  const { canAward } = useHouseholdRole(household.id);
  const [kidId, setKidId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const total = reportTotal(report);

  useEffect(() => setAlready(wasImported(encoded)), [encoded]);
  // Pre-select a child with the same name, if there is one.
  useEffect(() => {
    if (kidId || kids.length === 0) return;
    const match = kids.find((k) => k.name.trim().toLowerCase() === report.friend.toLowerCase());
    if (match) setKidId(match.id);
  }, [kids, kidId, report.friend]);

  const live = hydrated && mode === "live" && kids.length > 0;

  if (!live) {
    return (
      <section className="card-soft mt-5 p-6">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Keep the good going at home
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Add these points to whatever you use at home — or try PointPals: tap a chore, a marble
          drops into your family jar, and everyone celebrates the reward together. It’s free.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/sign-up"
            className="tap bg-cta inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-clay-sm"
          >
            <Sparkles className="h-4 w-4" aria-hidden /> Start free
          </Link>
          <Link
            to="/sign-in"
            onClick={() => rememberPendingVisit(encoded)}
            className="tap inline-flex min-h-12 items-center rounded-full border border-input bg-card px-5 text-sm font-semibold text-ink hover:bg-muted"
          >
            I use PointPals — log in to add these
          </Link>
        </div>
      </section>
    );
  }

  if (done || already) {
    return (
      <section className="card-soft mt-5 flex items-start gap-3 p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-jade/20 text-ink">
          <Check className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            {done ? `Added to ${done}’s jar` : "Already added"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {done
              ? "They’ll see the marbles next time you open PointPals."
              : "These points were added from this phone before."}
          </p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-ink underline">
            Open PointPals
          </Link>
        </div>
      </section>
    );
  }

  const add = () => {
    const kid = kids.find((k) => k.id === kidId);
    if (!kid || !canAward) return;
    primeAudio();
    const where = report.host.replace(/^The\s/, "");
    for (const line of report.lines) {
      for (let n = 0; n < line.count; n++) {
        awardPoints([kid.id], {
          name: `${line.name} (at ${where}’s)`,
          icon: line.icon,
          points: line.points,
        });
      }
    }
    triggerAwardFeedback("positive");
    haptic("success");
    markImported(encoded);
    setDone(kid.name);
  };

  return (
    <section className="card-soft mt-5 p-6">
      <h2 className="font-display text-2xl font-semibold text-ink">Add to your jar</h2>
      <p className="mt-1 text-sm text-ink-soft">Which of your kids is {report.friend}?</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a child">
        {kids.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kidId === k.id}
            onClick={() => setKidId(k.id)}
            className={cn(
              "tap inline-flex min-h-12 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-semibold transition",
              kidId === k.id
                ? "border-transparent bg-cta text-white shadow-clay-sm"
                : "border-input bg-card text-ink hover:bg-muted",
            )}
          >
            <span
              className="block h-9 w-9 overflow-hidden rounded-full"
              style={{ backgroundColor: PASTEL_HEX[k.color] }}
            >
              <CompanionAvatar seed={k.id} color={k.color} size={36} companionId={k.companionId} />
            </span>
            {k.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!kidId || !canAward}
        className="tap bg-cta mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold text-white shadow-clay-sm disabled:opacity-40"
      >
        {kidId
          ? `Add ${total} ${total === 1 ? "point" : "points"} to ${kids.find((k) => k.id === kidId)?.name}`
          : "Choose a child"}
      </button>
      {!canAward && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Only a parent or admin in your family can add points.
        </p>
      )}
    </section>
  );
}
