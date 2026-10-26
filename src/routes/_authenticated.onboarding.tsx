import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { useApp } from "@/lib/app-store";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { AuthShell } from "@/components/public/AuthShell";
import { KidFields } from "@/components/shell/KidFields";
import { suggestKidLook } from "@/lib/kid-look";
import { haptic, playChime, primeAudio } from "@/lib/feedback";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Check, Plus, Users, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [{ title: "Welcome — PointPals" }],
  }),
});

const STEPS = [
  {
    headline: "Every good thing drops a marble.",
    blurb: "Notice the good, fill the family jar, celebrate together. Free for every family.",
  },
  {
    headline: "Everyone gets a Pal of their own.",
    blurb: "Kids choose their character and colour — it’s how they spot their marbles in the jar.",
  },
  {
    headline: "Fill the jar. Celebrate together.",
    blurb: "One shared goal means siblings cheer each other on instead of keeping score.",
  },
];

const GOAL_PRESETS = [30, 50, 80, 100];

const primaryBtn =
  "tap inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full bg-cta px-6 text-base font-semibold text-white shadow-clay-sm transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40";
const backBtn =
  "tap inline-flex min-h-14 items-center gap-1.5 rounded-full border border-input bg-card px-5 text-sm font-semibold text-ink";

// A guided first-run setup (§9). Names the family, adds kids as companion
// avatars, and sets a first reward target — so a new household never lands on a
// blank dashboard.
function Onboarding() {
  const {
    setHouseholdName,
    addKid,
    setRewardTarget,
    completeOnboarding,
    kids,
    household,
    removeKid,
  } = useApp();
  const navigate = useNavigate();
  const { reducedMotion } = useSettings();
  const [step, setStep] = useState(0);
  const [family, setFamily] = useState(
    household.name === "The Harper Family" ? "" : household.name,
  );
  const [kidName, setKidName] = useState("");
  const [kidColor, setKidColor] = useState<PastelKey>(() => suggestKidLook(kids).color);
  const [kidCompanion, setKidCompanion] = useState<string>(() => suggestKidLook(kids).companionId);
  const [target, setTarget] = useState(household.rewardTarget);

  const pendingName = kidName.trim();

  const commitKid = () => {
    if (!pendingName) return false;
    primeAudio();
    addKid(pendingName, kidColor, kidCompanion);
    playChime("positive");
    haptic("success");
    setKidName("");
    // Suggest a look nobody has yet for the next child.
    const next = suggestKidLook([...kids, { color: kidColor, companionId: kidCompanion }]);
    setKidColor(next.color);
    setKidCompanion(next.companionId);
    return true;
  };

  const finish = () => {
    if (family.trim()) setHouseholdName(family.trim());
    setRewardTarget(target);
    completeOnboarding();
    navigate({ to: "/" });
  };

  const copy = STEPS[step];

  return (
    <AuthShell
      wide={step === 1}
      peek={step === 0}
      headline={copy.headline}
      blurb={copy.blurb}
      headerAction={
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Step {step + 1} of 3
        </span>
      }
    >
      {/* progress */}
      <div className="mb-7 flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-500",
              i <= step ? "bg-cta" : "bg-ink/10",
            )}
          />
        ))}
      </div>

      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (family.trim()) setStep(1);
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Welcome
          </p>
          <h1 className="mt-2 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
            Let’s set up your family
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            Points for chores and good choices fill one shared jar. When it’s full, you celebrate
            together — with a reward you pick as a team.
          </p>
          <label className="mt-7 block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Family name
            </span>
            <input
              autoFocus
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="The Rivers Family"
              maxLength={60}
              autoComplete="off"
              className="mt-1.5 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="mt-6 flex">
            <button type="submit" disabled={!family.trim()} className={primaryBtn}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <div>
          <h1 className="font-display text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
            Who’s in the family?
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
            Add each child — you can always add more later.
          </p>

          {kids.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Added so far">
              {kids.map((k) => (
                <li
                  key={k.id}
                  className="animate-in fade-in zoom-in-95 inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-1.5 shadow-clay-sm"
                >
                  <span
                    className="block h-9 w-9 overflow-hidden rounded-full"
                    style={{ backgroundColor: PASTEL_HEX[k.color] }}
                  >
                    <CompanionAvatar
                      seed={k.id}
                      color={k.color}
                      size={36}
                      companionId={k.companionId}
                    />
                  </span>
                  <span className="text-sm font-semibold text-ink">{k.name}</span>
                  <button
                    type="button"
                    onClick={() => removeKid(k.id)}
                    className="tap grid h-7 w-7 place-items-center rounded-full text-ink-soft hover:bg-muted hover:text-ink"
                    aria-label={`Remove ${k.name}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="card-soft mt-5 p-5">
            <KidFields
              name={kidName}
              onNameChange={setKidName}
              color={kidColor}
              onColorChange={setKidColor}
              companionId={kidCompanion}
              onCompanionChange={setKidCompanion}
              onEnter={commitKid}
              autoFocus
            />
            <button
              type="button"
              onClick={commitKid}
              disabled={!pendingName}
              className="tap mt-5 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-muted px-4 text-sm font-semibold text-ink transition hover:bg-muted/70 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {pendingName ? `Add ${pendingName}` : "Add child"}
            </button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[0.8rem] leading-snug text-muted-foreground">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Grown-ups can join in too — add yourself as a “child” so the whole family fills the jar
            together.
          </p>

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(0)} className={backBtn}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                // A name typed but not yet added counts — don't make them
                // discover the Add button.
                commitKid();
                setStep(2);
              }}
              disabled={kids.length === 0 && !pendingName}
              className={primaryBtn}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {kids.length === 0 && !pendingName && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Add at least one child to continue.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="font-display text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
            Set your first goal
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
            How many points fill the family jar? Start with something you’ll reach in a week or two
            — early wins build the habit.
          </p>

          <div className="card-soft mt-6 px-5 pb-6 pt-5 text-center">
            {kids.length > 0 && (
              <div className="flex justify-center -space-x-3" aria-hidden>
                {kids.slice(0, 6).map((k, i) => (
                  <span
                    key={k.id}
                    className={cn(
                      "block h-14 w-14 overflow-hidden rounded-full ring-4 ring-card",
                      !reducedMotion && "kid-float",
                    )}
                    style={
                      {
                        backgroundColor: PASTEL_HEX[k.color],
                        "--float-delay": `${-i * 0.45}s`,
                      } as CSSProperties
                    }
                  >
                    <CompanionAvatar
                      seed={k.id}
                      color={k.color}
                      size={56}
                      companionId={k.companionId}
                    />
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 font-display text-[4.5rem] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">
              {target}
            </div>
            <div className="mt-1 text-sm font-semibold text-ink-soft">points to fill the jar</div>
            <input
              type="range"
              min={30}
              max={100}
              step={10}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Points to fill the jar"
              className="mt-5 w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Quick (30)</span>
              <span>Big (100)</span>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {GOAL_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTarget(n)}
                  aria-pressed={target === n}
                  className={cn(
                    "tap min-h-10 rounded-full px-4 text-sm font-semibold transition",
                    target === n ? "bg-cta text-white" : "bg-muted text-ink-soft hover:text-ink",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You’ll choose the reward itself on the Rewards tab.
          </p>

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(1)} className={backBtn}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={finish} className={primaryBtn}>
              <Check className="h-4 w-4" /> Start using PointPals
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={finish}
        className="mx-auto mt-8 flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-ink"
      >
        Skip setup
      </button>
    </AuthShell>
  );
}
