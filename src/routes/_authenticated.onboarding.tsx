import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { PASTEL_HEX, type PastelKey, COMPANIONS } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { CompanionPicker } from "@/components/CompanionPicker";
import { ArrowRight, ArrowLeft, Check, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [{ title: "Welcome — PointPals" }],
  }),
});

const PALETTE: PastelKey[] = ["sky", "butter", "sage", "blush", "lilac", "sand", "foam"];

// A guided first-run setup (§9). Names the family, adds kids as companion
// avatars, and sets a first reward target — so a new household never lands on a
// blank dashboard.
function Onboarding() {
  const { setHouseholdName, addKid, setRewardTarget, completeOnboarding, kids, household } =
    useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [family, setFamily] = useState(
    household.name === "The Harper Family" ? "" : household.name,
  );
  const [kidName, setKidName] = useState("");
  const [kidColor, setKidColor] = useState<PastelKey>("sky");
  const [kidCompanion, setKidCompanion] = useState<string>(COMPANIONS[0].id);
  const [target, setTarget] = useState(household.rewardTarget);
  const [added, setAdded] = useState<{ name: string; color: PastelKey }[]>([]);

  const commitKid = () => {
    const n = kidName.trim();
    if (!n) return;
    addKid(n, kidColor, kidCompanion);
    setAdded((a) => [...a, { name: n, color: kidColor }]);
    setKidName("");
    const nextColor = PALETTE[(PALETTE.indexOf(kidColor) + 1) % PALETTE.length];
    setKidColor(nextColor);
    setKidCompanion(
      COMPANIONS[(COMPANIONS.findIndex((c) => c.id === kidCompanion) + 1) % COMPANIONS.length].id,
    );
  };

  const finish = () => {
    if (family.trim()) setHouseholdName(family.trim());
    setRewardTarget(target);
    completeOnboarding();
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-lg py-6">
      {/* progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-foreground" : "w-2 bg-muted"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-butter/60">
            <Sparkles className="h-9 w-9 text-foreground/70" />
          </div>
          <h1 className="font-display text-3xl font-bold">Let's set up your family</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            PointPals turns everyday chores into a habit the whole family builds together — points
            fill a shared jar, and rewards are chosen as a team.
          </p>
          <input
            autoFocus
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            placeholder="Your family name (e.g. The Rivers Family)"
            className="mt-6 w-full rounded-2xl border border-input bg-card px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => setStep(1)}
            disabled={!family.trim()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-40"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="font-display text-2xl font-bold text-center">Add your kids</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Each one gets a companion avatar. You can add more later.
          </p>

          {kids.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-4">
              {kids.map((k) => (
                <div key={k.id} className="flex flex-col items-center gap-1">
                  <div
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
                    style={{ backgroundColor: PASTEL_HEX[k.color] }}
                  >
                    <CompanionAvatar
                      seed={k.id}
                      color={k.color}
                      size={56}
                      companionId={k.companionId}
                    />
                  </div>
                  <span className="text-xs font-semibold">{k.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card-soft mt-6 p-4">
            <input
              value={kidName}
              onChange={(e) => setKidName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitKid()}
              placeholder="Child's name"
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setKidColor(c)}
                  className={`h-8 w-8 rounded-full transition ${kidColor === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                  style={{ backgroundColor: PASTEL_HEX[c] }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="mt-4">
              <CompanionPicker value={kidCompanion} onChange={setKidCompanion} />
            </div>
            <button
              onClick={commitKid}
              disabled={!kidName.trim()}
              className="mt-4 w-full rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-muted/70 transition disabled:opacity-40"
            >
              + Add child
            </button>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-5 py-3 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={kids.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {added.length === 0 && kids.length === 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Add at least one child to continue.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Set your first reward goal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How many family points fill the jar? Aim for something reachable in a week or two to
            start.
          </p>
          <div className="mt-6 font-display text-5xl font-bold">{target}</div>
          <input
            type="range"
            min={30}
            max={300}
            step={10}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="mt-4 w-full accent-foreground"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Quick (30)</span>
            <span>Big (300)</span>
          </div>

          <div className="mt-8 flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-5 py-3 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={finish}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              <Check className="h-4 w-4" /> Start using PointPals
            </button>
          </div>
        </div>
      )}

      <button
        onClick={finish}
        className="mx-auto mt-8 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" /> Skip setup
      </button>
    </div>
  );
}
