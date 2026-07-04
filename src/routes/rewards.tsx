import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { KidBadge } from "@/components/KidBadge";
import { Gift, Vote, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  component: RewardsPage,
  head: () => ({
    meta: [
      { title: "Rewards — PointPals" },
      { name: "description", content: "Propose and vote on family rewards once the shared points pool hits the target." },
    ],
  }),
});

function RewardsPage() {
  const { household, kids, proposals, addProposal, voteProposal, selectReward, setRewardTarget } = useApp();
  const [proposingKid, setProposingKid] = useState<string>(kids[0]?.id ?? "");
  const [proposalText, setProposalText] = useState("");
  const reached = household.sharedPool >= household.rewardTarget;
  const pct = Math.min(100, (household.sharedPool / household.rewardTarget) * 100);

  const winner = [...proposals].sort((a, b) => b.votes.length - a.votes.length)[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Gift className="w-7 h-7" /> Family rewards
        </h1>
        <p className="text-sm text-muted-foreground">Everyone contributes; everyone gets a say.</p>
      </div>

      {/* Progress */}
      <section
        className="rounded-3xl p-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--pastel-butter) 55%, white), color-mix(in oklab, var(--pastel-blush) 45%, white))",
        }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-foreground/70">Shared pool</div>
            <div className="font-display text-5xl font-extrabold leading-none mt-1">
              {household.sharedPool}
              <span className="text-2xl font-normal text-foreground/60"> / {household.rewardTarget}</span>
            </div>
          </div>
          <div className="text-right">
            <label className="text-xs uppercase tracking-wider text-foreground/70 block">Target</label>
            <input
              type="number"
              value={household.rewardTarget}
              onChange={(e) => setRewardTarget(Math.max(1, Number(e.target.value)))}
              className="w-20 mt-1 bg-transparent border-b border-foreground/30 py-1 font-display font-bold text-2xl text-right focus:outline-none focus:border-foreground"
            />
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {reached && (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <PartyPopper className="w-5 h-5" />
            Target reached — time to pick a reward together!
          </div>
        )}
      </section>

      {/* Propose */}
      <section className="card-soft p-5">
        <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
          <Vote className="w-5 h-5" /> Propose a reward
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!proposalText.trim() || !proposingKid) return;
            addProposal(proposingKid, proposalText.trim());
            setProposalText("");
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Proposed by
            </label>
            <div className="flex gap-2">
              {kids.map((k) => (
                <KidBadge
                  key={k.id}
                  kid={k}
                  size="sm"
                  selected={proposingKid === k.id}
                  onClick={() => setProposingKid(k.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reward idea
            </label>
            <input
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              placeholder="Movie night, ice cream trip, new Lego set…"
              className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground"
            />
          </div>
          <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold">
            Propose
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          A parent gets the final say on the winning idea to keep asks in check.
        </p>
      </section>

      {/* Vote */}
      <section>
        <h2 className="font-display text-xl font-bold mb-3">On the table</h2>
        {proposals.length === 0 ? (
          <div className="card-soft p-6 text-center text-muted-foreground">
            No proposals yet. Add one above ✨
          </div>
        ) : (
          <ul className="space-y-3">
            {proposals.map((p) => {
              const by = kids.find((k) => k.id === p.proposedByKidId);
              const isWinner = reached && winner?.id === p.id;
              return (
                <li
                  key={p.id}
                  className={`card-soft p-4 flex items-center gap-4 transition ${
                    isWinner ? "ring-2 ring-foreground" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg font-bold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Proposed by {by?.name ?? "someone"}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {kids.map((k) => {
                        const voted = p.votes.includes(k.id);
                        return (
                          <button
                            key={k.id}
                            onClick={() => voteProposal(k.id, p.id)}
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                              voted
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {voted ? "★ " : ""}{k.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-extrabold leading-none">{p.votes.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">votes</div>
                  </div>
                  {reached && (
                    <button
                      onClick={() => selectReward(p.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        isWinner ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Pick
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
