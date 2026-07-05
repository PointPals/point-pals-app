import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Heart, Bone, Sparkles, Scale, Minus } from "lucide-react";
import { PublicPageLayout } from "@/components/PublicPageLayout";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Why PointPals works — the research" },
      {
        name: "description",
        content:
          "How real-world rewards help modern families build routines — grounded in attachment theory, chore research, and an honest look at motivation science.",
      },
      { property: "og:title", content: "Why PointPals works — the research" },
      {
        property: "og:description",
        content:
          "Attachment theory, chore-capability research, and the honest science of rewards — the evidence PointPals is built on.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://pointpals.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://pointpals.lovable.app/about" }],
  }),
});

function AboutPage() {
  return (
    <PublicPageLayout>
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <img
          src="https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/sticker_charts.jpeg"
          alt="A colourful sticker chart with stars and smiley faces"
          width={1536}
          height={768}
          className="w-full h-auto rounded-3xl shadow-sm mb-6"
        />
        <h1 className="font-display text-4xl font-bold">
          The real reason PointPals works
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          PointPals isn't a behaviour-modification system that happens to live in an app. It's a
          counter-cultural tool for families who want to build real-world habits in a world designed
          to pull their kids in the opposite direction. Here's the research that shaped it — the
          good, the messy, and the honest.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap any section below to expand it — or read straight through.
          <p className="text-sm text-muted-foreground">
            Looking for quick answers? Try the{" "}
            <Link to="/faq" className="underline hover:text-foreground">
              FAQ
            </Link>
            .
          </p>
        </p>
      </header>

      <Accordion type="multiple" className="space-y-1">
        <SectionAccordion
          id="crisis"
          icon={<Bone className="h-5 w-5" />}
          title="The crisis ordinary families are up against"
        >
          <p>
            Your child's brain is being systematically hijacked by products engineered for compulsive
            use. Michaeleen Doucleff, in <em>Dopamine Kids</em>, documents how smartphones, social
            media, and ultra-processed foods exploit the dopamine reward system — creating altered
            pleasure baselines that make ordinary life feel unsatisfying. The discontentment parents
            see in their children is partly <em>neurological</em>. It's not a willpower problem. It's a systems
            problem.
          </p>
          <p>
            One of the most counterintuitive findings: using screen time as a reward for behaviour
            backfires. It elevates screens to a uniquely desirable status and increases the child's
            fixation on them. The very strategy most parents reach for{" "}
            <em>amplifies the problem it tries to solve</em>.
          </p>
          <p>
            Doucleff's research with Maya, Inuit, and Hadzabe communities found children who are
            cooperative, emotionally regulated, and genuinely content — without structured{" "}
            <em>any</em> entertainment or behavioural rewards. Their secret? Integration into adult
            life. Contribution. Being genuinely needed. That's the north star.
          </p>
        </SectionAccordion>

        <SectionAccordion
          id="attachment"
          icon={<Heart className="h-5 w-5" />}
          title="Attachment is the foundation. Everything else sits on top."
        >
          <p>
            Gordon Neufeld and Gabor Maté, in <em>Hold On to Your Kids</em>, make a claim that
            changed how we think about PointPals: <strong>parenting effectiveness doesn't depend
            primarily on what parents do, but on who they are to the child</strong>. Discipline,
            guidance, influence — all of it flows from a secure attachment relationship. When that
            relationship is strong, children naturally take on their parents' values. When it's
            damaged, no technique in the world will stick.
          </p>
          <p>
            The same theme runs through Adele Faber and Elaine Mazlish's <em>How to Talk So Kids Will
            Listen</em>: children cannot hear problem-solving until they feel heard. Validating a
            child's feelings — before giving advice or correction — dramatically increases their
            openness to communication. Acknowledging before advising. Connection before correction.
          </p>
          <p>
            Hunter Clarke-Fields, in <em>Raising Good Humans</em>, frames this as mindful listening
            — being fully present instead of jumping to fix everything. And Brené Brown, in{" "}
            <em>Daring Greatly</em>, reminds us that showing our kids our humanity — imperfection,
            vulnerability, the willingness to apologise — teaches them more about strength than any
            polished performance ever could.
          </p>
          <div className="rounded-2xl bg-sage/25 p-4 text-sm">
            <strong>What this means for PointPals:</strong> The points are not the point. The{" "}
            <em>relationship</em> is the point. The app is a tool for connection — a shared project,
            a conversation starter, a way to notice and celebrate effort together. If the points ever
            replace genuine warmth, you're using it wrong.
          </div>
        </SectionAccordion>

        <SectionAccordion
          id="capability"
          icon={<Sparkles className="h-5 w-5" />}
          title="Chores build capability. That's the real point."
        >
          <p>
            Julie Lythcott-Haims, in <em>How to Raise an Adult</em>, draws on her decades as a
            Stanford dean — watching capable eighteen-year-olds arrive unable to manage basic adult
            tasks. Her research-backed conclusion: children who do regular household chores grow into
            more capable, collaborative adults. Chores communicate something fundamental:{" "}
            <strong>you are a contributing member of this family, not a passenger</strong>.
          </p>
          <p>
            Frances Jensen, in <em>The Teenage Brain</em>, adds a neurological layer: the adolescent
            brain is the most efficient learning machine that will ever exist in that individual. The
            teen drive toward risk is not a design flaw — it's an evolutionary adaptation that drives
            exploration and identity formation. The goal isn't to eliminate risk but to channel it
            wisely. Routine habits — chores, self-care, contribution — build the executive function
            scaffolding that makes wise risk-taking possible.
          </p>
          <p>
            Kevin Leman, in <em>Have a New Kid by Friday</em>, makes the same case from a different
            angle: children learn best from <em>real consequences</em>. When a parent removes
            themselves from the role of punisher and lets natural outcomes teach the lesson,
            children develop genuine accountability. Real competence comes from real contribution.
          </p>
        </SectionAccordion>

        <SectionAccordion
          id="real-world"
          icon={<BookOpen className="h-5 w-5" />}
          title="Why real-world rewards matter right now"
        >
          <p>
            This is where PointPals fits. The established evidence for structured reinforcement of
            everyday routines is strong — the Triple P program (101 studies, over 16,000 families)
            found significant improvements in child behaviour and parenting practices. The Incredible
            Years program shows similar effects for reducing disruptive behaviour. And token
            economies, as formalised by Ayllon and Azrin and reviewed by Kazdin, have reliably
            increased desired behaviours across classrooms and homes for decades.
          </p>
          <p>
            But the more urgent argument is this: <strong>children today are drowning in digital
            rewards</strong> — likes, streaks, loot boxes, variable-ratio reinforcement schedules
            designed by engineers to maximise engagement. A child who earns a point on a chart for
            brushing their teeth is receiving a <em>real-world</em> reward. Tangible. Concrete.
            Tied to an actual accomplishment that they can see, touch, and feel proud of. It's a
            small act of resistance against an economy of abstract, engineered pleasure.
          </p>
          <p>
            Doucleff's key insight — that rewarding behaviour with screen time backfires — makes the
            case for <em>physical</em> tracking. The point jar that fills up. The chime that marks
            completion. The family seeing progress together. These are analogue rewards in a digital
            age, and that's exactly what makes them work.
          </p>
        </SectionAccordion>

        {/* ── NEW: Marble-loss / consequence section ── */}
        <SectionAccordion
          id="loss"
          icon={<Minus className="h-5 w-5" />}
          title="Can children lose marbles? The evidence on consequences"
        >
          <p>
            One of the first questions parents ask: "Can I take marbles away when my child
            misbehaves?" It's a fair question, and the answer is more nuanced than yes or no.
          </p>

          <h3 className="font-display text-lg font-bold mt-4 mb-2">
            Response cost, not punishment
          </h3>
          <p>
            There's a meaningful difference between <em>punishment</em> (adding something aversive
            to decrease a behaviour) and <em>response cost</em> (removing a conditioned reinforcer
            following an undesired behaviour). The marble jar works on the latter. A marble
            disappearing is not the parent yelling, threatening, or shaming. It's a pre-agreed,
            transparent signal: "that action has a cost in this system."
          </p>
          <p>
            Frances Jensen, in <em>The Teenage Brain</em>, provides the neurological reason this
            works: the prefrontal cortex — responsible for connecting actions to consequences — is
            the last part of the brain to fully develop. Children and teens genuinely <em>struggle</em> to
            link a behaviour now with an outcome later. An immediate, concrete signal (chime +
            marble disappearing) does the connecting <em>for</em> them:
          </p>
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground">
            "Don't ask 'What were you thinking?' when a teen makes a poor choice. Instead ask 'What
            happened?' and 'What could you do differently next time?' Connect the conversation to
            the future."
            <br />
            <span className="not-italic text-xs">— Frances Jensen, <em>The Teenage Brain</em></span>
          </blockquote>


          <h3 className="font-display text-lg font-bold mt-4 mb-2">
            The system protects the relationship
          </h3>
          <p>
            Kevin Leman, in <em>Have a New Kid by Friday</em>, argues that the most effective
            discipline removes the parent from the role of punisher:
          </p>
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground">
            "No warnings. No second chances. Simply act. Remove the privilege, apply the
            consequence, and say nothing further."
            <br />
            <span className="not-italic text-xs">— Kevin Leman, <em>Have a New Kid by Friday</em></span>
          </blockquote>
          <p>
            This is exactly what a marble loss does. The parent doesn't have to escalate,
            threaten, or become the bad cop. The system delivers the consequence. The parent stays
            warm. The child learns the lesson without the relationship taking the hit.
          </p>
          <p>
            Abbey Wedgeworth, in <em>Help! I'm Ruining My Kids</em>, makes the same case from a
            different angle:
          </p>
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground">
            "Shame does not produce change. Replace 'What is wrong with you?' with 'That choice was
            a problem — let's talk about what to do instead.' Address behaviour without attacking
            identity."
            <br />
            <span className="not-italic text-xs">— Abbey Wedgeworth, <em>Help! I'm Ruining My Kids</em></span>
          </blockquote>
          <p>
            A marble loss addresses the <em>choice</em>, not the <em>child</em>. The chime says
            "that action cost a marble" — not "you are bad." That distinction is everything.
          </p>

          <h3 className="font-display text-lg font-bold mt-4 mb-2">
            Low-dopamine signals in a high-dopamine world
          </h3>
          <p>
            Doucleff's research in <em>Dopamine Kids</em> reveals that children today are
            neurologically habituated to high-intensity, variable-ratio rewards (screens, games,
            social media). A marble loss — a soft chime, a marble fading away — is the <em>opposite</em> of
            that. It's a low-dopamine, predictable, honest signal. It doesn't trigger the same
            fight-or-flight response that a parent yelling would. And it doesn't create the same
            dopamine craving that a screen-based consequence would.
          </p>
          <p>
            This is why the marble jar works where other systems fail: it operates on a completely
            different neurochemical plane than the engineered rewards children are surrounded by.
          </p>

          <h3 className="font-display text-lg font-bold mt-4 mb-2">
            The honest caveat: it only works inside connection
          </h3>
          <p>
            Neufeld and Maté's central finding bears repeating: all of this only works within a
            secure attachment relationship.
          </p>
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground">
            "Discipline flows from relationship, not technique. Children who are attached to
            parents take on their parents' values naturally. Disconnected children resist rules
            because they feel imposed from outside."
            <br />
            <span className="not-italic text-xs">— Gordon Neufeld &amp; Gabor Maté, <em>Hold On to Your Kids</em></span>
          </blockquote>
          <p>
            If the relationship is already strained — if a child doesn't feel seen, heard, or valued
            — then removing marbles will feel like another cold mechanism. The marble system is a
            <em>tool</em> within a connected relationship, not a <em>substitute</em> for one.
          </p>
          <p>
            Brené Brown, in <em>Daring Greatly</em>, uses her own marble jar metaphor for trust:
          </p>
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground">
            "Trust builds from the small, everyday acts of courage and presence... Recognizing this
            helps me invest more mindfully in relationships that are worth the effort."
            <br />
            <span className="not-italic text-xs">— Brené Brown, <em>Daring Greatly</em></span>
          </blockquote>
          <p>
            The marble jar in PointPals works the same way. Every earned marble is a small deposit in
            the trust account. Marbles can be lost, but the <em>relationship</em> shouldn't be. If you
            find yourself removing marbles more than adding them, that's a signal to check the
            connection — not to double down on consequences.
          </p>

          <h3 className="font-display text-lg font-bold mt-4 mb-2">
            Practical guidelines for using marble loss well
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Pre-agree the rules.</strong> Children should know what behaviours result in a
              marble loss before it happens — not find out in the moment.
            </li>
            <li>
              <strong>Keep it rare.</strong> The jar should primarily be about building progress. If
              you're removing marbles every day, something else needs to change.
            </li>
            <li>
              <strong>Stay warm.</strong> The app delivers the consequence. You can still say "I love
              you, and that cost a marble" without the love feeling conditional.
            </li>
            <li>
              <strong>Separate the behaviour from the child.</strong> "That choice" not "you are." The
              marble system helps with this — it's the system, not you, that responded.
            </li>
            <li>
              <strong>Fade it over time.</strong> As with rewards, the goal is for the behaviour to
              become its own natural consequence, not to need the marble system forever.
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            <strong>In short:</strong> losing a marble is not a punishment. It's a clean,
            immediate, low-emotion signal that helps a child connect an action to a consequence —
            and it keeps the parent in the role of coach, not punisher. The research supports it as
            part of a balanced, attachment-rich approach.
          </p>
        </SectionAccordion>

        <SectionAccordion
          id="counter"
          icon={<Scale className="h-5 w-5" />}
          title="The honest counter-argument"
        >
          <p>
            There's a real debate about extrinsic rewards, and it deserves a real answer. Deci,
            Koestner and Ryan's 1999 meta-analysis found that tangible, expected rewards can
            undermine intrinsic motivation — the overjustification effect. Self-determination theory
            argues that when you reward someone for something they already loved doing, they can come
            to do it only for the reward.
          </p>
          <p>
            The important nuance — and it's a crucial one — is that this effect is strongest for
            tasks a person <em>already finds intrinsically rewarding</em>. Most chores and self-care
            routines aren't in that category. Reviews such as Cameron, Banko and Pierce (2001) note
            that for tasks with low initial interest, rewards generally help rather than harm —
            especially when tied to competence and delivered warmly.
          </p>
          <p>
            Julie Schwartz Gottman and John Gottman, in <em>Fight Right</em>, would add that
            conflicts about chores — and every family has them — are never really about the chores.
            They're about respect, fairness, and feeling alone in the work. PointPals doesn't solve
            those deeper issues, but it <em>does</em> create a shared reference point for the
            conversation: "I noticed you emptied the dishwasher. Thank you." That's a bid for
            connection. And Gottman's research shows that turning toward those bids is the most
            powerful preventive for major conflict.
          </p>
        </SectionAccordion>

        <SectionAccordion
          id="how-to"
          icon={<Heart className="h-5 w-5" />}
          title="How to use it well"
        >
          <p>
            Every source we've read agrees on one thing: the healthiest path is to{" "}
            <strong>fade the rewards as habits form</strong>. This is standard practice in the
            token-economy literature — thin the reinforcement over time and let natural consequences
            take over. A tidy room. Pride. A smoother morning. That's the real reward.
          </p>
          <div className="rounded-2xl bg-sage/25 p-4 text-sm">
            <strong>A gentle note from Abbey Wedgeworth, <em>Help! I'm Ruining My Kids</em>:</strong>{" "}
            Your kids need you — a real, imperfect you who sometimes gets it wrong and knows how to
            repair — not a perfect, consistent system. PointPals is a tool, not a substitute for your
            presence. If you miss a day, if the points aren't perfectly tracked, if your child loses
            interest and you have to start again — that's not failure. That's parenting. Repair the
            connection and keep going.
          </div>
          <p>Practically, as a routine becomes automatic, we suggest:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Name the intrinsic payoff.</strong> Alongside the points, say it out loud:
              "Your room feels calmer now." "We got out the door on time because you were ready."
              This bridges external motivation to internal satisfaction.
            </li>
            <li>
              <strong>Use descriptive feedback, not evaluative praise.</strong>
              Instead of "you're so good," try "you cleared the table without being asked. That
              really helped the family." Specificity builds genuine self-concept.
            </li>
            <li>
              <strong>Let established habits graduate.</strong> When a behaviour has become second
              nature, that's success. Move it off the board to make room for new challenges.
            </li>
            <li>
              <strong>Stay warm and stay firm.</strong> The research consensus across every source
              we've read is clear: authoritative parenting — high warmth, clear expectations —
              outperforms every other style. Love freely, hold limits consistently.
            </li>
          </ul>
        </SectionAccordion>
      </Accordion>

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-lg font-bold">Further reading</h2>
        <p className="text-sm text-muted-foreground mt-2">
          These books shaped the thinking behind PointPals. They're worth reading in full:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
          <li>
            <em>Hold On to Your Kids</em> — Gordon Neufeld and Gabor Maté
          </li>
          <li>
            <em>How to Talk So Kids Will Listen</em> — Adele Faber and Elaine Mazlish
          </li>
          <li>
            <em>Dopamine Kids</em> — Michaeleen Doucleff
          </li>
          <li>
            <em>How to Raise an Adult</em> — Julie Lythcott-Haims
          </li>
          <li>
            <em>Raising Good Humans</em> — Hunter Clarke-Fields
          </li>
          <li>
            <em>Daring Greatly</em> — Brené Brown
          </li>
          <li>
            <em>Have a New Kid by Friday</em> — Kevin Leman
          </li>
          <li>
            <em>The Teenage Brain</em> — Frances Jensen
          </li>
          <li>
            <em>Help! I'm Ruining My Kids</em> — Abbey Wedgeworth
          </li>
          <li>
            <em>Fight Right</em> — Julie Schwartz Gottman and John Gottman
          </li>
        </ul>
        <h3 className="font-display text-base font-bold mt-6">Selected academic references</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
          <li>
            Ayllon, T., &amp; Azrin, N. H. (1968).{" "}
            <em>The Token Economy: A Motivational System for Therapy and Rehabilitation</em>.
          </li>
          <li>
            Kazdin, A. E., &amp; Bootzin, R. R. (1972). The token economy: An evaluative review.{" "}
            <em>Journal of Applied Behavior Analysis, 5</em>(3), 343–372.
          </li>
          <li>
            Sanders, M. R., et al. (2014). The Triple P-Positive Parenting Program: A systematic
            review and meta-analysis. <em>Clinical Psychology Review, 34</em>(4), 337–357.
          </li>
          <li>
            Deci, E. L., Koestner, R., &amp; Ryan, R. M. (1999). A meta-analytic review of
            experiments examining the effects of extrinsic rewards on intrinsic motivation.{" "}
            <em>Psychological Bulletin, 125</em>(6), 627–668.
          </li>
          <li>
            Cameron, J., Banko, K. M., &amp; Pierce, W. D. (2001). Pervasive negative effects of
            rewards on intrinsic motivation: The myth continues.{" "}
            <em>The Behavior Analyst, 24</em>(1), 1–44.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          PointPals is a habit-building tool, not medical or psychological advice. For clinical
          concerns about a child's behaviour, speak with a qualified professional.
        </p>
      </section>
    </article>
    </PublicPageLayout>
  );
}

/** Accordion wrapper matching the original section styling. */
function SectionAccordion({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={id}
      className="border-0 rounded-2xl bg-card/50 px-5 data-[state=open]:bg-card/80 transition-colors"
    >
      <AccordionTrigger className="flex items-center gap-2 py-4 hover:no-underline cursor-pointer">
        <span className="flex items-center gap-2 font-display text-xl font-bold text-left">
          <span className="text-foreground/70 shrink-0">{icon}</span>
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 leading-relaxed text-foreground/90 pb-4">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
