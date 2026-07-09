import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPageLayout } from "@/components/PublicPageLayout";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ — PointPals" },
      {
        name: "description",
        content:
          "Frequently asked questions about PointPals — how the marble jar works, rewards, consequences, pricing, and more.",
      },
      { property: "og:title", content: "PointPals FAQ — marble jar, rewards & pricing" },
      {
        property: "og:description",
        content:
          "Answers to the most common questions about PointPals: how the shared marble jar works, ages, rewards, consequences, and pricing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pointpals.co.nz/faq" },
    ],
    links: [{ rel: "canonical", href: "https://pointpals.co.nz/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_SCHEMA.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});

// Plain-text FAQ used for FAQPage structured data. Kept intentionally short —
// crawlers use these summaries, and the on-page copy stays authoritative.
const FAQ_SCHEMA: { q: string; a: string }[] = [
  {
    q: "What is PointPals?",
    a: "PointPals is a family habit app that turns chores, kindness, and positive habits into points that fill a shared marble jar. When the jar is full, the family celebrates with a reward you chose together.",
  },
  {
    q: "How does the marble jar work?",
    a: "Every time a child completes a chore or shows a positive habit, a parent taps to award points. Each point drops a marble into the family's shared jar. When the jar reaches its target, the whole family celebrates with a pre-agreed reward.",
  },
  {
    q: "What ages is PointPals for?",
    a: "PointPals works best for children aged 3 to 14. Toddlers do simple tasks like tidying toys; tweens and teens help set their own goals and rewards so the system feels respectful rather than babyish.",
  },
  {
    q: "Can I use PointPals with more than one child?",
    a: "Yes. Each child has their own chores and habits, earns points individually, and contributes to the shared family jar. The shared jar turns chore time from sibling competition into teamwork.",
  },
  {
    q: "Why don't marbles drop one-for-one when the target is higher than 90?",
    a: "The jar animation can fit up to 90 marbles while staying smooth on every device. If your family's target is above 90, each marble represents a chunk of points instead of a single point, so the jar still fills honestly to 100% of the target. Small awards are added to a running total, and a soft +N floater appears for every positive award so every contribution is acknowledged, even before a full marble drops.",
  },
  {
    q: "Does PointPals cost anything?",
    a: "PointPals is free to try. A single low-cost family subscription unlocks the full app for every child and every parent in your household.",
  },
  {
    q: "How long are memories kept?",
    a: "The memory feed runs in 90-day seasons. When a season ends, its photos, videos, and voice notes are permanently deleted — a privacy feature, not a storage limit. You get an email a few days beforehand, you can download the season as a video montage first, and you can switch the seasonal refresh off in Settings.",
  },
];

type FaqEntry = { id: string; question: string; content: ReactNode };
type FaqSection = { heading: string; items: FaqEntry[] };

const SECTIONS: FaqSection[] = [
  {
    heading: "Getting started",
    items: [
      {
        id: "what-is",
        question: "What is PointPals?",
        content: (
          <>
            <p>
              PointPals is a family habit app that turns chores, kindness, and positive habits into
              points that fill a shared marble jar. When the jar is full, the family celebrates
              together with a reward you choose as a team.
            </p>
            <p>
              It&rsquo;s designed for families who are tired of nagging, bribing, and power
              struggles over everyday tasks. Instead of fighting about chores, families track
              progress together and celebrate effort.
            </p>
          </>
        ),
      },
      {
        id: "how-it-works",
        question: "How does the marble jar work?",
        content: (
          <>
            <p>
              Every time a child completes a chore, shows kindness, or practises a positive habit, a
              parent taps to award points. Each point drops a marble into the family&rsquo;s shared
              jar. When the jar reaches its target, the whole family gets to celebrate with a
              pre-agreed reward.
            </p>
            <p>
              The jar is shared — every child&rsquo;s contribution fills it together. This
              encourages teamwork rather than competition between siblings.
            </p>
          </>
        ),
      },
      {
        id: "ages",
        question: "What ages is PointPals for?",
        content: (
          <>
            <p>
              PointPals works best for children aged 3–14. For toddlers, keep tasks very simple
              (putting toys away, brushing teeth with help). For tweens and teens, involve them in
              setting their own goals and rewards so the system feels respectful, not babyish.
            </p>
            <p>
              The key is matching the complexity of the chore to the child&rsquo;s developmental
              stage. We have age-appropriate chore suggestions in our{" "}
              <Link to="/blog" className="underline hover:text-foreground">
                blog
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        id: "multiple-kids",
        question: "Can I use it with more than one child?",
        content: (
          <>
            <p>Yes. PointPals is built for families with multiple children. Each child can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Have their own set of chores and habits</li>
              <li>Earn points individually for their own effort</li>
              <li>See their contribution fill the shared family jar</li>
              <li>Choose their own character (Sunny, Pip, Bramble, etc.)</li>
            </ul>
            <p>
              The shared jar is one of our most important features — it turns chore time from
              sibling competition into teamwork.
            </p>
          </>
        ),
      },
      {
        id: "adults",
        question: "Can more than one adult use PointPals?",
        content: (
          <>
            <p>
              Yes. Multiple parents or caregivers can join the same household. Each adult can award
              points to any child, so both Mum and Dad (or other caregivers) stay in the loop.
            </p>
            <p>
              This also means grandparents, babysitters, or other trusted adults can be included if
              you choose to invite them.
            </p>
          </>
        ),
      },
    ],
  },
  {
    heading: "Points & rewards",
    items: [
      {
        id: "what-points",
        question: "What can children earn points for?",
        content: (
          <>
            <p>Anything you want to encourage. Common examples include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Chores:</strong> making the bed, putting shoes away, clearing the table,
                feeding pets
              </li>
              <li>
                <strong>Habits:</strong> brushing teeth, getting dressed, packing a school bag
              </li>
              <li>
                <strong>Kindness:</strong> helping a sibling, using kind words, sharing
              </li>
              <li>
                <strong>Effort:</strong> trying something hard, staying calm during frustration,
                apologising
              </li>
            </ul>
            <p>
              You decide what matters for your family. PointPals lets you create custom chores and
              habits that fit your household.
            </p>
          </>
        ),
      },
      {
        id: "what-rewards",
        question: "What kind of rewards work best?",
        content: (
          <>
            <p>
              The best rewards are shared experiences, not things. Screen time is an easy default,
              but research shows it can backfire as a reward (see our{" "}
              <Link to="/about" className="underline hover:text-foreground">
                research page
              </Link>
              ). Instead, try:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Family movie night with popcorn</li>
              <li>Pancakes for breakfast</li>
              <li>A trip to the playground or beach</li>
              <li>Camping in the lounge</li>
              <li>Baking together</li>
              <li>A board game night</li>
              <li>Choosing the family dinner</li>
            </ul>
            <p>
              Involve your children in choosing rewards — they&rsquo;ll be more invested when they
              helped pick the goal.
            </p>
          </>
        ),
      },
      {
        id: "how-many-points",
        question: "How many points should each task be worth?",
        content: (
          <>
            <p>Keep it simple, especially at the start:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>1 point for simple daily tasks (brushing teeth, putting shoes away)</li>
              <li>2 points for bigger chores (clearing the table, unpacking the dishwasher)</li>
              <li>3 points for extra effort, kindness, or doing something without being asked</li>
            </ul>
            <p>
              You can adjust as your family finds its rhythm. The goal isn&rsquo;t a perfect points
              economy — it&rsquo;s making effort visible.
            </p>
          </>
        ),
      },
      {
        id: "marble-target-cap",
        question: "Why don't marbles drop one-for-one when the target is higher than 90?",
        content: (
          <>
            <p>
              The jar animation is capped at 90 marbles so it stays smooth on phones and tablets. If
              your family sets a reward target above 90, each marble represents a chunk of points
              rather than a single point.
            </p>
            <p>
              For example, a target of 300 means each marble is worth about 3.3 points. The jar
              still fills honestly to 100% of the target — it just reaches 90 marbles at the
              300-point mark instead of showing 300 individual marbles.
            </p>
            <p>
              To make sure every award still feels acknowledged, a soft <strong>+N</strong> floater
              appears above the jar for every positive point award, even when it is not yet enough
              to drop a full marble.
            </p>
          </>
        ),
      },
      {
        id: "isnt-bribery",
        question: "Isn't this just bribery?",
        content: (
          <>
            <p>This is the most common question, and it deserves an honest answer.</p>
            <p>
              Bribery is offering a reward <em>after</em> a behaviour has already started, often to
              stop something going wrong. PointPals works differently — it&rsquo;s a pre-agreed
              system where expectations are clear before anyone earns or loses anything.
            </p>
            <p>
              Research shows that external rewards are most effective for tasks that lack intrinsic
              motivation — like most chores. The goal is to <em>fade</em> the rewards over time as
              habits become automatic and children begin to feel the intrinsic satisfaction of
              contributing.
            </p>
            <p>
              The difference between a bribe and a system: a bribe is reactive. A system is
              intentional.
            </p>
          </>
        ),
      },
    ],
  },
  {
    heading: "Consequences & discipline",
    items: [
      {
        id: "can-lose-points",
        question: "Can children lose points for misbehaving?",
        content: (
          <>
            <p>
              Yes — but with important caveats. PointPals allows you to remove a marble as a
              consequence, and the research supports this when used thoughtfully.
            </p>
            <p>
              The key distinction: this is <em>response cost</em>, not punishment. A marble
              disappearing is a clean, immediate signal — not a parent yelling, threatening, or
              shaming. The system delivers the consequence, so the parent stays in the role of
              coach, not punisher.
            </p>
            <p>
              Neuroscience supports this approach. The prefrontal cortex — which connects actions to
              consequences — is the last part of the brain to develop. An immediate, concrete signal
              (chime + marble removal) helps children make that connection in real time.
            </p>
            <p>
              That said, the marble jar works best when it&rsquo;s <em>primarily</em> about building
              progress. If you&rsquo;re removing marbles more than adding them, something else needs
              attention — usually the underlying relationship or expectations.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Suggested guidelines:</strong> pre-agree the rules, keep removals rare, stay
              warm when delivering them, and separate the behaviour from the child. See our{" "}
              <Link to="/about" className="underline hover:text-foreground">
                research page
              </Link>{" "}
              for the full evidence.
            </p>
          </>
        ),
      },
      {
        id: "child-refuses",
        question: "What if my child refuses to do a chore?",
        content: (
          <>
            <p>
              Start with connection, not consequences. Ask what&rsquo;s going on — is the task too
              hard? Too boring? Is there something else on their mind?
            </p>
            <p>
              If it&rsquo;s a pattern, consider whether the chore is age-appropriate, whether the
              expectations are clear, and whether the relationship needs attention first.
            </p>
            <p>
              The marble jar is most effective when it&rsquo;s used to <em>notice</em> progress, not
              to <em>enforce</em> compliance. A child who feels capable and connected is far more
              likely to help than one who feels controlled.
            </p>
          </>
        ),
      },
      {
        id: "child-loses-interest",
        question: "What if my child loses interest in the system?",
        content: (
          <>
            <p>
              This is normal, especially after the initial novelty wears off. A few things to try:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Refresh the rewards.</strong> Let the child help choose a new reward goal.
              </li>
              <li>
                <strong>Add new chores.</strong> Rotate in fresh tasks or increase the challenge.
              </li>
              <li>
                <strong>Change the target.</strong> A smaller jar fills faster — early wins build
                momentum.
              </li>
              <li>
                <strong>Take a break.</strong> Sometimes the system needs a pause. Habits that are
                already formed will likely stick.
              </li>
            </ul>
            <p>
              Interest naturally ebbs and flows. That&rsquo;s not failure — it&rsquo;s family life.
            </p>
          </>
        ),
      },
    ],
  },
  {
    heading: "Practical questions",
    items: [
      {
        id: "cost",
        question: "How much does PointPals cost?",
        content: (
          <>
            <p>
              PointPals is free for your first {14} days — no payment details required to start.
              After the trial, it&rsquo;s a simple subscription. You can cancel anytime.
            </p>
            <p>
              We don&rsquo;t have ads, upsells, or hidden fees. A subscription supports ongoing
              development, new features, and keeping the app safe for families.
            </p>
          </>
        ),
      },
      {
        id: "data",
        question: "Is my family's data safe?",
        content: (
          <>
            <p>
              Yes. PointPals uses industry-standard encryption and secure authentication. We never
              share or sell your data. Your family&rsquo;s information belongs to your family.
            </p>
            <p>
              See our{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              for full details.
            </p>
          </>
        ),
      },
      {
        id: "memories-retention",
        question: "How long are memories kept?",
        content: (
          <>
            <p>
              The memory feed runs in <strong>90-day seasons</strong>. When a season ends, the
              photos, videos, and voice notes in it are permanently deleted from our servers and the
              feed starts fresh. That&rsquo;s deliberate: photos of your children are the most
              personal thing in PointPals, and we&rsquo;d rather not hold them a day longer than
              needed.
            </p>
            <p>Nothing disappears by surprise:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We email you a few days before a season ends.</li>
              <li>
                You can download the whole season as a <strong>video montage</strong> from the
                Memories page — a keepsake of everything your family did.
              </li>
              <li>
                Prefer to keep the feed forever? Switch off the seasonal refresh in Settings → Your
                data.
              </li>
            </ul>
            <p>
              The full details are in our{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        id: "offline",
        question: "Does PointPals work offline?",
        content: (
          <>
            <p>
              PointPals works best with an internet connection so points sync across all family
              devices. Some core features (viewing progress, awarding points) may work with
              intermittent connectivity, but full syncing requires a connection.
            </p>
            <p>We&rsquo;re exploring improved offline support for future updates.</p>
          </>
        ),
      },
      {
        id: "nz-made",
        question: "Is PointPals really made in New Zealand?",
        content: (
          <>
            <p>
              Yes. PointPals is proudly designed and built in Aotearoa, New Zealand. Our small team
              is based here, and the app is developed with Kiwi families in mind — though it works
              just as well anywhere in the world.
            </p>
          </>
        ),
      },
      {
        id: "contact",
        question: "How can I get help or give feedback?",
        content: (
          <>
            <p>
              Email us at{" "}
              <a href="mailto:support@pointpals.co.nz" className="underline hover:text-foreground">
                support@pointpals.co.nz
              </a>
              . We read every message and genuinely value your input — PointPals is better because
              of the families who use it.
            </p>
          </>
        ),
      },
    ],
  },
];

const TINTS = [
  { border: "var(--pastel-blush)", bg: "color-mix(in oklab, var(--pastel-blush) 22%, white)" },
  { border: "var(--pastel-sky)", bg: "color-mix(in oklab, var(--pastel-sky) 22%, white)" },
  { border: "var(--pastel-sage)", bg: "color-mix(in oklab, var(--pastel-sage) 22%, white)" },
  { border: "var(--pastel-butter)", bg: "color-mix(in oklab, var(--pastel-butter) 25%, white)" },
  { border: "var(--pastel-lilac)", bg: "color-mix(in oklab, var(--pastel-lilac) 22%, white)" },
  { border: "var(--pastel-foam)", bg: "color-mix(in oklab, var(--pastel-foam) 22%, white)" },
];

function FaqPage() {
  const allItems = SECTIONS.flatMap((s) => s.items);
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = allItems.find((i) => i.id === openId) ?? null;

  return (
    <PublicPageLayout wide>
      <article className="mx-auto max-w-2xl md:max-w-6xl space-y-10">
        <header>
          <img
            src="https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/faq_page.jpeg"
            alt="A jar of marbles on a wooden table with question mark bubbles floating above and a cup of tea nearby"
            width={1536}
            height={768}
            className="w-full h-auto rounded-3xl shadow-sm mb-6 md:max-h-[420px] md:object-cover"
          />
          <h1 className="font-display text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Everything you&rsquo;ve wondered about PointPals — how it works, why it works, and how
            to get the most out of it.
          </p>
        </header>

        {SECTIONS.map((section, sIdx) => (
          <section key={section.heading} className="space-y-4">
            <h2 className="font-display text-2xl font-bold">{section.heading}</h2>

            {/* Mobile: accordion */}
            <Accordion type="multiple" className="space-y-1 md:hidden">
              {section.items.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-0 rounded-2xl bg-card/50 px-5 data-[state=open]:bg-card/80 transition-colors"
                >
                  <AccordionTrigger className="py-4 hover:no-underline cursor-pointer">
                    <span className="font-display text-lg font-bold text-left">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 leading-relaxed text-foreground/90 pb-4">
                      {item.content}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Desktop: scrapbook card grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.items.map((item, i) => {
                const tint = TINTS[(sIdx * 2 + i) % TINTS.length];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpenId(item.id)}
                    className="group text-left flex flex-col justify-between bg-card rounded-[1.75rem] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[180px]"
                    style={{
                      borderBottom: `8px solid ${tint.border}`,
                      borderRight: `8px solid ${tint.border}`,
                    }}
                    aria-label={`Read answer: ${item.question}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-xl font-bold text-foreground"
                        style={{ background: tint.bg }}
                      >
                        ?
                      </span>
                      <h3 className="font-display text-lg font-bold leading-snug text-foreground">
                        {item.question}
                      </h3>
                    </div>
                    <span
                      className="mt-6 inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase"
                      style={{ color: tint.border }}
                    >
                      Read answer →
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Desktop answer dialog */}
        <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenId(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {openItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl md:text-3xl font-bold text-left">
                    {openItem.question}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Answer to: {openItem.question}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 leading-relaxed text-foreground/90 mt-2">
                  {openItem.content}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </article>
    </PublicPageLayout>
  );
}
