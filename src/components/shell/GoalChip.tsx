import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useApp } from "@/lib/app-store";
import { useCorrection } from "@/lib/correction-store";
import { cn } from "@/lib/utils";

/**
 * The family's current goal, readable by a child (a row of marbles filling
 * up) and a parent (name + numbers). Taps through to Rewards.
 *
 * `variant="chip"` — compact, for the mobile header.
 * `variant="card"` — roomier, for the desktop sidebar.
 */
export function GoalChip({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "card";
  className?: string;
}) {
  const { household } = useApp();
  const { activeReward } = useCorrection();
  const target = Math.max(1, activeReward ? activeReward.targetPoints : household.rewardTarget);
  const have = household.sharedPool;
  const pct = Math.min(1, have / target);
  const toGo = Math.max(0, target - have);
  const name = activeReward?.name ?? "Family jar";
  const full = toGo === 0;

  // Ten marble pips — each one is 10% of the goal.
  const pips = Array.from({ length: 10 }, (_, i) => pct >= (i + 1) / 10 - 0.0001);

  const meter = (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {pips.map((on, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-all duration-500",
            variant === "card" ? "h-3 w-3" : "h-[7px] w-[7px]",
            on ? "marble" : "bg-ink/10",
          )}
          style={
            on
              ? ({
                  "--marble": [
                    "var(--marble-plum)",
                    "var(--marble-cobalt)",
                    "var(--marble-aqua)",
                    "var(--marble-jade)",
                    "var(--marble-saffron)",
                    "var(--marble-coral)",
                  ][i % 6],
                } as CSSProperties)
              : undefined
          }
        />
      ))}
    </span>
  );

  const label = `${name}: ${have} of ${target} points${full ? " — jar full!" : `, ${toGo} to go`}`;

  if (variant === "card") {
    return (
      <Link
        to="/rewards"
        aria-label={label}
        className={cn(
          "tap block rounded-3xl bg-card p-4 shadow-clay transition-shadow hover:shadow-lift",
          className,
        )}
      >
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Working towards
        </span>
        <span className="mt-1 block truncate font-display text-lg font-semibold leading-tight text-ink">
          {name}
        </span>
        <span className="mt-3 block">{meter}</span>
        <span className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-display text-base font-semibold text-ink">{have}</span> / {target}
          </span>
          <span className={cn("font-semibold", full ? "text-jade" : "text-ink-soft")}>
            {full ? "Jar full!" : `${toGo} to go`}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/rewards"
      aria-label={label}
      className={cn(
        "tap flex min-h-11 min-w-0 flex-col justify-center rounded-2xl bg-card/90 px-3 py-1.5 shadow-clay-sm",
        className,
      )}
    >
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {name}
        </span>
        <span className="shrink-0 font-display text-sm font-semibold leading-none text-ink">
          {have}
          <span className="font-sans text-[0.65rem] font-medium text-muted-foreground">
            /{target}
          </span>
        </span>
      </span>
      <span className="mt-1">{meter}</span>
    </Link>
  );
}
