import type { CSSProperties, ReactNode } from "react";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { TINT_HEX } from "@/lib/companion-tints";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Wordmark } from "@/components/brand/Wordmark";

export type BoardKid = {
  id: string;
  name: string;
  color: PastelKey;
  companionId?: string;
  points: number;
  personalPool: number;
  personalTarget: number;
  personalReward?: string | null;
};

/**
 * "How we're doing" — the kid-facing board shared by the locked Kids' View
 * and the share link kids open on their own device. Picture-first: the family
 * jar is the hero, then each child's character with their marbles.
 */
export function KidsBoard({
  householdName,
  rewardName,
  sharedPool,
  rewardTarget,
  showFamily,
  kids,
  familyJar,
  personalJar,
  topRight,
  footnote,
}: {
  householdName: string;
  rewardName?: string | null;
  sharedPool: number;
  rewardTarget: number;
  showFamily: boolean;
  kids: BoardKid[];
  familyJar: ReactNode;
  personalJar: (kid: BoardKid) => ReactNode;
  topRight?: ReactNode;
  footnote?: ReactNode;
}) {
  const { reducedMotion } = useSettings();
  const toGo = Math.max(0, rewardTarget - sharedPool);
  const pct = Math.min(1, sharedPool / Math.max(1, rewardTarget));

  return (
    <div className="min-h-dvh bg-cream">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-cream/85 px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="min-w-0">
          <Wordmark className="text-[1.45rem]" />
          <div className="mt-0.5 truncate text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How we’re doing · {householdName}
          </div>
        </div>
        {topRight}
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-5 pb-12 pt-6">
        {showFamily && (
          <section className="card-clay relative overflow-hidden px-5 pb-6 pt-6 text-center sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 45% at 50% 8%, oklch(0.95 0.06 85 / 0.9), transparent 70%), radial-gradient(40% 40% at 8% 60%, oklch(0.93 0.05 300 / 0.5), transparent 70%), radial-gradient(40% 40% at 94% 60%, oklch(0.93 0.05 210 / 0.5), transparent 70%)",
              }}
            />
            <div className="relative">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Our family jar
              </p>
              {rewardName && (
                <p className="mt-1.5 font-display text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                  {rewardName}
                </p>
              )}
              <div className="flex justify-center">{familyJar}</div>
              <p className="font-display text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-ink">
                {toGo === 0 ? "Jar full! 🎉" : `${toGo} more ${toGo === 1 ? "marble" : "marbles"}!`}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {sharedPool} of {rewardTarget} — keep noticing the good.
              </p>
              <div
                className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-ink/10"
                aria-hidden
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${pct * 100}%`,
                    background:
                      "linear-gradient(90deg, var(--marble-plum), var(--marble-cobalt), var(--marble-aqua), var(--marble-jade), var(--marble-saffron))",
                  }}
                />
              </div>
            </div>
          </section>
        )}

        <section aria-label="Everyone's marbles">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Our marbles
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kids.map((k) => {
              const wash = PASTEL_HEX[k.color] ?? "#ddd";
              const hasJar = k.personalTarget > 0;
              return (
                <li
                  key={k.id}
                  className="flex flex-col items-center rounded-[1.75rem] p-4 text-center shadow-clay"
                  style={{
                    background: `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, ${wash} 85%, white), color-mix(in oklab, ${wash} 35%, white) 70%)`,
                  }}
                >
                  <span
                    className={cn(
                      "relative block h-24 w-24 overflow-hidden rounded-full shadow-clay-sm",
                      !reducedMotion && "kid-float",
                    )}
                    style={
                      {
                        backgroundColor: wash,
                        "--float-delay": `${(k.id.charCodeAt(0) % 7) * -0.4}s`,
                      } as CSSProperties
                    }
                  >
                    <CompanionAvatar
                      seed={k.id}
                      color={k.color}
                      size={96}
                      companionId={k.companionId}
                    />
                  </span>
                  <span className="mt-3 max-w-full truncate font-display text-xl font-semibold text-ink">
                    {k.name}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-ink shadow-clay-sm">
                    <span
                      aria-hidden
                      className="marble h-3 w-3"
                      style={{ "--marble": TINT_HEX[k.color] } as CSSProperties}
                    />
                    <span className="tabular-nums">{k.points}</span>
                  </span>
                  {hasJar && (
                    <div className="mt-3 w-full rounded-2xl bg-white/70 px-2 pb-2 pt-1">
                      <div className="flex justify-center">{personalJar(k)}</div>
                      <p className="font-display text-lg font-semibold leading-none text-ink">
                        {k.personalPool}
                        <span className="font-sans text-xs font-normal text-muted-foreground">
                          {" "}
                          / {k.personalTarget}
                        </span>
                      </p>
                      {k.personalReward && (
                        <p className="mt-1 truncate text-xs text-ink-soft">→ {k.personalReward}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {footnote && <p className="text-center text-xs text-muted-foreground/80">{footnote}</p>}
      </div>
    </div>
  );
}
