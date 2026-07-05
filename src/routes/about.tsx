import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Scale, Sprout, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "The research behind PointPals" },
      {
        name: "description",
        content:
          "The evidence base for reward systems that build routines — and an honest look at the debate about extrinsic motivation.",
      },
    ],
  }),
});

// §6 — Written from real, cited sources. Balanced: it presents the evidence for
// token economies AND the legitimate counter-argument (overjustification / SDT),
// and recommends fading rewards as habits form. Claims are grounded, not
// decorative.
function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl pb-12 space-y-8">
      <header>
        <h1 className="font-display text-4xl font-bold">
          Why PointPals works — and where to be careful
        </h1>
        <p className="mt-3 text-muted-foreground">
          PointPals uses external motivation — points, chimes, a jar you watch fill — to help turn
          chores into habits. We want to be upfront: rewards are a <em>scaffold</em>, not the goal.
          The goal is the habit sticking. Here's the evidence we lean on, and the honest caveats
          that come with it.
        </p>
      </header>

      <Section
        icon={<BookOpen className="h-5 w-5" />}
        title="The behavioural basis: token economies"
      >
        <p>
          PointPals is a <strong>token economy</strong> — a well-studied idea from behavioural
          psychology. It traces to B.F. Skinner's work on <strong>operant conditioning</strong>:
          behaviour that is reinforced tends to recur. Points are <em>conditioned reinforcers</em>{" "}
          (like money) that a child earns for a target behaviour and later exchanges for something
          they value.
        </p>
        <p>
          The clinical model was formalised by Ayllon and Azrin (1968), and reviewed extensively by
          Kazdin and Bootzin (1972), who found token programs reliably increase desired behaviours
          across classrooms, homes and care settings. The approach is a core tool in applied
          behaviour analysis (ABA) today.
        </p>
      </Section>

      <Section icon={<Heart className="h-5 w-5" />} title="Evidence for routine-building at home">
        <p>
          The strongest real-world evidence comes from established parent-training programs that use
          reward charts and praise as one ingredient of structured routines. Two with large evidence
          bases:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Triple P (Positive Parenting Program)</strong> — a 2014 systematic review and
            meta-analysis by Sanders and colleagues pooled 101 studies (over 16,000 families) and
            found significant improvements in child behaviour and parenting practices (short-term
            effect sizes around d ≈ 0.47–0.58).
          </li>
          <li>
            <strong>The Incredible Years</strong> — a 2013 meta-analysis by Menting, Orobio de
            Castro and Matthys found the parent program reduced disruptive behaviour and increased
            prosocial behaviour in children aged 3–9.
          </li>
        </ul>
        <p>
          These programs don't rely on rewards alone — warmth, consistency and clear expectations
          matter just as much — but structured reinforcement of everyday routines is a consistent,
          evidence-backed component.
        </p>
      </Section>

      <Section icon={<Scale className="h-5 w-5" />} title="The honest counter-argument">
        <p>
          There's a real academic debate here, and we won't pretend otherwise. Deci, Koestner and
          Ryan's 1999 meta-analysis of 128 experiments found that{" "}
          <strong>tangible, expected rewards can undermine intrinsic motivation</strong> — the{" "}
          <em>overjustification effect</em>, first shown with children by Lepper, Greene and Nisbett
          (1973). Their <strong>self-determination theory</strong> (Ryan &amp; Deci, 2000) argues
          that when you pay someone for something they already loved doing, they can come to do it
          only for the reward.
        </p>
        <p>
          The important nuance: this effect is strongest for tasks a person{" "}
          <em>already finds intrinsically rewarding</em>. Most chores aren't in that category — few
          children brush their teeth or empty the dishwasher for the sheer joy of it. Reviews such
          as Cameron, Banko and Pierce (2001) note that for tasks with low initial interest, rewards
          generally help rather than harm, especially when tied to competence and delivered warmly.
          That's precisely why token economies fit chores and self-care routines well — but we say
          it plainly rather than ignoring the debate.
        </p>
      </Section>

      <Section icon={<Sprout className="h-5 w-5" />} title="Our recommendation: fade the rewards">
        <p>
          Because rewards are a scaffold, the healthiest path is to{" "}
          <strong>gradually fade them as habits form</strong>. This is standard practice in the
          token-economy literature (e.g. Kazdin): thin the reinforcement over time and let natural
          consequences — a tidy room, pride, a smoother morning — take over.
        </p>
        <p>Practically, as a routine becomes automatic, we suggest:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Move a daily must-do to occasional recognition rather than every-time points.</li>
          <li>
            Name the intrinsic payoff out loud ("your room feels calmer now") alongside the points.
          </li>
          <li>Let established habits graduate off the board to make room for new ones.</li>
        </ul>
        <p className="rounded-2xl bg-sage/25 p-4 text-sm">
          PointPals is designed to be a bridge to habits that no longer need it — not a permanent
          system. If a behaviour has become second nature, that's success, and it's a good time to
          fade its points.
        </p>
      </Section>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-lg font-bold">References</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>
            Skinner, B. F. (1953). <em>Science and Human Behavior</em>. Macmillan.
          </li>
          <li>
            Ayllon, T., &amp; Azrin, N. H. (1968).{" "}
            <em>The Token Economy: A Motivational System for Therapy and Rehabilitation</em>.
            Appleton-Century-Crofts.
          </li>
          <li>
            Kazdin, A. E., &amp; Bootzin, R. R. (1972). The token economy: An evaluative review.{" "}
            <em>Journal of Applied Behavior Analysis, 5</em>(3), 343–372.{" "}
            <a
              className="underline"
              href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1310758/"
              target="_blank"
              rel="noreferrer"
            >
              PMC
            </a>
          </li>
          <li>
            Sanders, M. R., Kirby, J. N., Tellegen, C. L., &amp; Day, J. J. (2014). The Triple
            P-Positive Parenting Program: A systematic review and meta-analysis.{" "}
            <em>Clinical Psychology Review, 34</em>(4), 337–357.{" "}
            <a
              className="underline"
              href="https://pubmed.ncbi.nlm.nih.gov/24842549/"
              target="_blank"
              rel="noreferrer"
            >
              PubMed
            </a>
          </li>
          <li>
            Menting, A. T. A., Orobio de Castro, B., &amp; Matthys, W. (2013). Effectiveness of the
            Incredible Years parent training. <em>Clinical Psychology Review, 33</em>(8), 901–913.{" "}
            <a
              className="underline"
              href="https://pubmed.ncbi.nlm.nih.gov/23994367/"
              target="_blank"
              rel="noreferrer"
            >
              PubMed
            </a>
          </li>
          <li>
            Deci, E. L., Koestner, R., &amp; Ryan, R. M. (1999). A meta-analytic review of
            experiments examining the effects of extrinsic rewards on intrinsic motivation.{" "}
            <em>Psychological Bulletin, 125</em>(6), 627–668.{" "}
            <a
              className="underline"
              href="https://selfdeterminationtheory.org/SDT/documents/1999_DeciKoestnerRyan.pdf"
              target="_blank"
              rel="noreferrer"
            >
              PDF
            </a>
          </li>
          <li>
            Lepper, M. R., Greene, D., &amp; Nisbett, R. E. (1973). Undermining children's intrinsic
            interest with extrinsic reward.{" "}
            <em>Journal of Personality and Social Psychology, 28</em>(1), 129–137.
          </li>
          <li>
            Ryan, R. M., &amp; Deci, E. L. (2000). Self-determination theory and the facilitation of
            intrinsic motivation, social development, and well-being.{" "}
            <em>American Psychologist, 55</em>(1), 68–78.
          </li>
          <li>
            Cameron, J., Banko, K. M., &amp; Pierce, W. D. (2001). Pervasive negative effects of
            rewards on intrinsic motivation: The myth continues. <em>The Behavior Analyst, 24</em>
            (1), 1–44.{" "}
            <a
              className="underline"
              href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2731358/"
              target="_blank"
              rel="noreferrer"
            >
              PMC
            </a>
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          PointPals is a habit-building tool, not medical or psychological advice. For clinical
          concerns about a child's behaviour, speak with a qualified professional.
        </p>
      </section>
    </article>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <span className="text-foreground/70">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
