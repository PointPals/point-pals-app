import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { useState } from "react";

// Shared UI for the individual-jars configuration toggle rows and per-kid
// target/reward inputs. Used in both Settings ("Individual jars" section) and
// Rewards ("Individual rewards" section).

export function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export function PersonalTargetRow({
  kid,
  onChange,
}: {
  kid: Kid;
  onChange: (target: number, reward?: string) => void;
}) {
  const [target, setTarget] = useState(kid.personalTarget);
  const [reward, setReward] = useState(kid.personalReward ?? "");

  // Write to store on every change AND on blur so the value is never lost.
  // Local state tracks the input; onChange persists to the app store.
  const save = (t: number, r?: string) => {
    onChange(t, r || undefined);
  };

  return (
    <div className="card-soft p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-4 h-4 rounded-full shrink-0 shadow-inner"
          style={{ backgroundColor: PASTEL_HEX[kid.color] }}
        />
        <span className="text-sm font-semibold">{kid.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0 w-16">Target pts</span>
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={target}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTarget(v);
            save(v, reward);
          }}
          onBlur={() => save(target, reward)}
          className="flex-1 accent-foreground"
        />
        <span className="font-display text-base font-bold w-10 text-right">{target}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0 w-16">Reward</span>
        <input
          value={reward}
          onChange={(e) => {
            const v = e.target.value;
            setReward(v);
            save(target, v);
          }}
          onBlur={() => save(target, reward)}
          placeholder={"Optional personal reward"}
          disabled={target === 0}
          className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
        />
      </div>
    </div>
  );
}
