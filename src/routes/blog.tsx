import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPageLayout } from "@/components/PublicPageLayout";
import blogHero from "@/assets/marketing/blog-hero.jpg";
import imgResearch from "@/assets/marketing/blog-research.jpg";
import imgCharacters from "@/assets/marketing/blog-characters.jpg";
import imgChoresFun from "@/assets/marketing/blog-chores-fun.jpg";
import imgMarbleJar from "@/assets/marketing/blog-marble-jar.jpg";
import imgScreenTime from "@/assets/marketing/blog-screen-time.jpg";
import imgAgeChores from "@/assets/marketing/blog-age-chores.jpg";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/blog")({
  component: BlogPage,
  head: () => ({
    meta: [
      { title: "Blog — PointPals" },
      {
        name: "description",
        content:
          "Research, tips, and stories about family habits, chores, rewards, and positive parenting from the PointPals team.",
      },
    ],
  }),
});

const POSTS = [
  {
    id: "research-behind-pointpals",
    seoTitle: "The Research Behind PointPals | Family Chore App",
    metaDescription:
      "Learn how PointPals uses ideas from motivation, habit formation, family routines and positive parenting to make chores feel calmer and more connected.",
    keywords: "research-backed chore app, family chore app, positive behaviour app, kids reward system, family routines",
    title: "The Research Behind PointPals",
    image: imgResearch,
    content: <ResearchPost />,
  },
  {
    id: "meet-the-pointpals-characters",
    seoTitle: "Meet the PointPals Characters | Kids Chore App Mascots",
    metaDescription:
      "Meet Sunny, Pip, Bramble, Fern, Marlow, Coda, Ridge and Ziggy — the playful PointPals characters that help make chores, kindness and family habits fun.",
    keywords: "PointPals characters, kids chore app characters, family chore app, rewards for kids, positive behaviour app",
    title: "Meet the PointPals: The Characters Behind the Family Chore App",
    image: imgCharacters,
    content: <CharactersPost />,
  },
  {
    id: "make-chores-fun-without-bribes",
    seoTitle: "How to Make Chores Fun Without Bribes",
    metaDescription:
      "Learn how to make chores fun for kids without constant nagging, bribing or screen-time battles. Use points, routines and family rewards instead.",
    keywords: "make chores fun, chore app for kids, family chore app, chores without nagging, kids chores",
    title: "How to Make Chores Fun Without Bribes",
    image: imgChoresFun,
    content: <ChoresFunPost />,
  },
  {
    id: "what-is-a-marble-jar-reward-system",
    seoTitle: "What Is a Marble Jar Reward System?",
    metaDescription:
      "A marble jar reward system helps children see progress by adding marbles for chores, kindness and positive habits. Learn how families can use one.",
    keywords: "marble jar reward system, family reward system, kids reward system, chore rewards, reward app for kids",
    title: "What Is a Marble Jar Reward System?",
    image: imgMarbleJar,
    content: <MarbleJarPost />,
  },
  {
    id: "screen-time-is-not-best-reward",
    seoTitle: "Screen-Free Rewards for Kids: Better Chore Reward Ideas",
    metaDescription:
      "Looking for screen-free rewards for kids? Here are family-friendly chore reward ideas that encourage connection, confidence and positive behaviour.",
    keywords: "screen-free rewards for kids, chore rewards, kids reward system, positive parenting app, family rewards",
    title: "Why Screen Time Is Not the Best Reward for Chores",
    image: imgScreenTime,
    content: <ScreenTimePost />,
  },
  {
    id: "age-appropriate-chores",
    seoTitle: "Age-Appropriate Chores for Kids: A Family Chore List",
    metaDescription:
      "Looking for chores for kids by age? Use this simple family chore list for toddlers, preschoolers, school-aged children and tweens.",
    keywords: "age appropriate chores for kids, chores for kids by age, chore list for kids, family chore app, kids routines",
    title: "Age-Appropriate Chores for Kids: A Family Chore List",
    image: imgAgeChores,
    content: <AgeChoresPost />,
  },
] as const;

function BlogPage() {
  return (
    <PublicPageLayout>
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <img
          src={blogHero}
          alt="An open notebook and marble jar on a soft peach blanket with crayons scattered around"
          width={1536}
          height={768}
          className="w-full h-auto rounded-3xl shadow-sm mb-6"
        />
        <h1 className="font-display text-4xl font-bold">PointPals Blog</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Research, tips, and stories about building family habits — from chore strategies to
          reward systems that actually work. Tap a post below to read it.
        </p>
      </header>

      <div className="space-y-2">
        {POSTS.map((post) => (
          <Link
            key={post.id}
            to="/blog"
            hash={post.id}
            className="block card-soft p-4 hover:bg-card/80 transition-colors no-underline"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(`post-${post.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                // Trigger the accordion to open
                const trigger = el.querySelector("button");
                if (trigger && trigger.getAttribute("data-state") === "closed") {
                  trigger.click();
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={post.image}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                className="h-14 w-14 rounded-xl object-cover shrink-0"
              />
              <div>
                <h3 className="font-display text-base font-bold">{post.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {post.metaDescription.slice(0, 90)}&hellip;
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Accordion type="multiple" className="space-y-4">
        {POSTS.map((post) => (
          <AccordionItem
            key={post.id}
            value={post.id}
            id={`post-${post.id}`}
            className="border-0 rounded-2xl bg-card/50 px-5 data-[state=open]:bg-card/80 transition-colors"
          >
            <AccordionTrigger className="py-4 hover:no-underline cursor-pointer">
              <span className="font-display text-xl font-bold text-left">{post.title}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 leading-relaxed text-foreground/90 pb-4">
                <img
                  src={post.image}
                  alt=""
                  width={768}
                  height={768}
                  loading="lazy"
                  className="w-full h-auto rounded-2xl mb-3"
                />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.keywords.split(", ").map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                {post.content}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </article>
    </PublicPageLayout>
  );
}

function Quote({ children, author, source }: { children: React.ReactNode; author: string; source: string }) {
  return (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-sm text-muted-foreground my-3">
      {children}
      <br />
      <span className="not-italic text-xs">
        — {author}, <em>{source}</em>
      </span>
    </blockquote>
  );
}

/* ── Blog Post 1: The Research Behind PointPals ── */
function ResearchPost() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> The Research Behind PointPals | Family Chore App<br />
        <strong>Meta:</strong> Learn how PointPals uses ideas from motivation, habit formation, family routines and positive parenting to make chores feel calmer and more connected.
      </p>
      <hr className="border-border" />

      <p>
        PointPals was built around a simple idea: children are more likely to contribute when they feel connected, capable and part of something meaningful.
      </p>
      <p>
        That does not mean every chore will suddenly become magical. Real family life is still real family life. Kids get tired. Parents get stretched. Routines fall apart. Some mornings are chaos.
      </p>
      <p>
        But the way we frame chores matters.
      </p>
      <p>
        When chores become a daily power struggle, everyone loses. Parents feel ignored. Children feel controlled. The home becomes filled with reminders, negotiations and consequences.
      </p>
      <p>
        PointPals takes a different approach. It turns chores, kindness and positive habits into visible family progress. Instead of focusing only on compliance, it helps families notice contribution.
      </p>
      <p>This article explains the thinking behind that approach.</p>

      <h3 className="font-display text-lg font-bold mt-5">1. Children need connection, not constant correction</h3>
      <p>
        A useful starting point is Self-Determination Theory, a major theory of human motivation. It highlights three core psychological needs: autonomy, competence and relatedness. In simple terms, people tend to do better when they feel they have some choice, feel capable, and feel connected to others.
      </p>
      <p>
        That idea fits family life beautifully. A child who is constantly ordered around may complete a task, but they may not feel ownership over it. A child who feels trusted and included is more likely to see helping as part of who they are becoming.
      </p>
      <p>
        PointPals is designed to support this by making contribution visible without turning every moment into a lecture. When a child earns points for brushing teeth, making the bed or helping a sibling, they see evidence that they are capable. When those points fill a shared family jar, they see that their effort matters to everyone.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">2. Routines reduce friction</h3>
      <p>
        Parents often think behaviour is about motivation. Sometimes it is. But very often, family behaviour is about rhythm.
      </p>
      <p>
        Research on family routines has found that consistent routines are associated with children&rsquo;s well-being and can provide both predictable structure and an emotional environment that supports development.
      </p>
      <p>
        That matters because chores are rarely isolated tasks. They sit inside routines. Morning routine. After-school routine. Dinner routine. Bedtime routine.
      </p>
      <p>
        When a task happens in the same place, at the same time and in the same sequence, it becomes easier. Children know what comes next. Parents do not have to start from zero every day.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">3. Rewards need to be handled carefully</h3>
      <p>
        A lot of parents worry about rewards, and rightly so. There is research suggesting that some types of expected tangible rewards can reduce intrinsic motivation, especially when rewards feel controlling or disconnected from meaning.
      </p>
      <p>
        PointPals is not built around paying children for every action. It is designed around shared progress, visible contribution and family celebration.
      </p>
      <p>
        There is a difference between: &ldquo;Do this or you do not get your prize&rdquo; and &ldquo;Your effort helped our family. Look how far we have come together.&rdquo; The first can feel like control. The second can feel like belonging.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">4. Contribution is more powerful than bribery</h3>
      <p>
        Michaeleen Doucleff&rsquo;s <em>Hunt, Gather, Parent</em> explores parenting practices from Maya, Inuit and Hadzabe families, with a strong focus on cooperation, emotional regulation and children being included in meaningful family life.
      </p>
      <p>
        In many homes, children are entertained while adults do the work. Then, when parents suddenly need help, chores feel like an interruption. PointPals flips the framing: children are not outsiders being forced to do jobs. They are members of the family who can help.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">5. Screen-free rewards matter</h3>
      <p>
        Screens are part of modern family life, and they are not all bad. But PointPals works best when rewards are not only screen-based. A family reward might be pancakes on Saturday morning, a trip to the playground, movie night, baking together, or a board game night. The reward becomes another chance for connection.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">6. Small prompts make behaviour easier</h3>
      <p>
        BJ Fogg&rsquo;s behaviour model says behaviour happens when motivation, ability and a prompt come together at the same moment. PointPals helps by making chores clear, repeatable and easy to notice.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">7. Habits take time</h3>
      <p>
        You do not need to fix everything at once. Start with one routine. One child. One task. One marble. The goal is not instant perfection. The goal is steady practice.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">How PointPals applies the research</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Autonomy:</strong> children can be involved in choosing goals and rewards.</li>
        <li><strong>Competence:</strong> children see proof that they can complete tasks and build habits.</li>
        <li><strong>Relatedness:</strong> points fill a shared jar, so progress belongs to the family.</li>
        <li><strong>Routine:</strong> chores become repeatable parts of daily life.</li>
        <li><strong>Positive reinforcement:</strong> effort is noticed and celebrated.</li>
        <li><strong>Screen-free connection:</strong> rewards can become family memories.</li>
        <li><strong>Small steps:</strong> families can start with easy wins and build from there.</li>
      </ul>
      <p className="font-display font-bold mt-4">
        The real goal is not to make children chase points forever. The goal is to help families practise noticing effort.
      </p>
    </>
  );
}

/* ── Blog Post 2: Meet the PointPals Characters ── */
function CharactersPost() {
  const characters = [
    { name: "Sunny", symbol: "a glowing heart", tag: "kindness, empathy and helpful behaviour", verb: "celebrates", color: "warm, cheerful and encouraging" },
    { name: "Pip", symbol: "a book", tag: "curiosity, reading and learning", verb: "perfect for", color: "curious and thoughtful" },
    { name: "Bramble", symbol: "a star", tag: "effort, encouragement and little wins", verb: "represents", color: "calm and steady" },
    { name: "Fern", symbol: "a leaf", tag: "growth, calm and care", verb: "represents", color: "soft and nature-inspired" },
    { name: "Marlow", symbol: "helping hands", tag: "teamwork, service and family contribution", verb: "is all about", color: "warm and collaborative" },
    { name: "Coda", symbol: "a footprint", tag: "progress, movement and taking the next step", verb: "represents", color: "encouraging" },
    { name: "Ridge", symbol: "a mountain", tag: "resilience, courage and doing hard things", verb: "represents", color: "strong and steady" },
    { name: "Ziggy", symbol: "a paintbrush", tag: "imagination, play and self-expression", verb: "represents", color: "playful and creative" },
  ];

  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> Meet the PointPals Characters | Kids Chore App Mascots<br />
        <strong>Meta:</strong> Meet Sunny, Pip, Bramble, Fern, Marlow, Coda, Ridge and Ziggy — the playful PointPals characters that help make chores, kindness and family habits fun.
      </p>
      <hr className="border-border" />

      <p>
        PointPals is not meant to feel like a spreadsheet for chores. It is meant to feel warm, playful and encouraging — the kind of app children actually want to open with their family.
      </p>
      <p>
        That is where the PointPals characters come in. Each character has their own colour, symbol and personality. Together, they help turn everyday chores, kindness and positive habits into something children can understand and enjoy.
      </p>

      {characters.map((c) => (
        <div key={c.name} className="rounded-2xl bg-muted/40 p-4 my-4">
          <h4 className="font-display text-lg font-bold">{c.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {c.name}&rsquo;s symbol is {c.symbol}, making them the PointPal of {c.tag}. {c.name} is {c.color}.
          </p>
          <p className="text-xs font-display font-bold mt-2 text-muted-foreground">
            {c.name}&rsquo;s message:
          </p>
          <p className="text-sm italic">
            {c.name === "Sunny" && "Small acts of kindness can brighten the whole family."}
            {c.name === "Pip" && "Every skill starts with one small try."}
            {c.name === "Bramble" && "Every small win deserves a star."}
            {c.name === "Fern" && "Little habits grow into big changes."}
            {c.name === "Marlow" && "Helping hands make family life lighter."}
            {c.name === "Coda" && "You do not have to do everything. Just take the next step."}
            {c.name === "Ridge" && "Hard things get easier when you keep climbing."}
            {c.name === "Ziggy" && "A little creativity makes everyday life more fun."}
          </p>
        </div>
      ))}

      <h3 className="font-display text-lg font-bold mt-5">How the characters work inside PointPals</h3>
      <p>
        The PointPals characters do more than decorate the app. They can help children understand different types of progress. Sunny appears for kindness points. Pip appears for learning. Bramble appears for chores and routines. Fern for care habits. Marlow for helping tasks. Coda for progress streaks. Ridge for resilience. Ziggy for rewards and creativity.
      </p>
      <p>
        This gives PointPals a strong emotional world. Children are not just ticking boxes. They are building a collection of positive moments with characters who make each win feel special.
      </p>
      <p className="font-display font-bold mt-4">
        The PointPals characters make the app feel playful, but their purpose is deeper than cuteness. They turn values into something children can see.
      </p>
    </>
  );
}

/* ── Blog Post 3: How to Make Chores Fun Without Bribes ── */
function ChoresFunPost() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> How to Make Chores Fun Without Bribes<br />
        <strong>Meta:</strong> Learn how to make chores fun for kids without constant nagging, bribing or screen-time battles. Use points, routines and family rewards instead.
      </p>
      <hr className="border-border" />

      <p>
        Most parents do not want to nag. But chores have a way of turning even calm parents into broken record machines.
      </p>
      <p>
        &ldquo;Put your shoes away.&rdquo; &ldquo;Please brush your teeth.&rdquo; &ldquo;Can you make your bed?&rdquo; Before long, everyone is annoyed. The child feels bossed around. The parent feels ignored. The chore still is not done.
      </p>
      <p>
        The answer is not to make chores optional. It is to make progress visible, shared and rewarding in a way that supports family connection.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Start with the reason, not the rule</h3>
      <p>
        Children are more likely to help when they understand why the job matters. Instead of &ldquo;Clear your plate because I said so,&rdquo; try &ldquo;When you clear your plate, it helps dinner clean-up go faster for everyone.&rdquo;
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Make the invisible visible</h3>
      <p>
        A big problem with chores is that children often cannot see progress. Adults can imagine the whole house running smoothly. Children usually cannot. They see one boring task in front of them.
      </p>
      <p>
        That is why visual systems work so well. A chart, jar or app gives children something they can see. When a task is completed, something changes. A sticker appears. A marble drops. A point is added.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Keep the points simple</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>1 point for everyday chores</li>
        <li>2 points for bigger jobs</li>
        <li>3 points for extra helpful behaviour</li>
        <li>Bonus points for kindness, effort or trying something hard</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Choose family rewards, not just individual prizes</h3>
      <p>
        Family rewards feel different. When the jar fills, everyone celebrates together. The reward becomes a shared memory.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Make chores part of a routine</h3>
      <p>
        Try creating simple routine groups: Morning routine (make bed, get dressed, brush teeth, pack bag), After-school routine (shoes away, lunchbox out, homework), Evening routine (clear plate, bath, pyjamas, book).
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Celebrate effort, not perfection</h3>
      <p>
        A child does not need to complete a chore perfectly for the effort to matter. The first time a young child makes a bed, it may look like a blanket explosion. That is okay. &ldquo;I noticed you tried&rdquo; goes a long way.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Avoid turning points into threats</h3>
      <p>
        Instead of &ldquo;If you do not do this, you will not get points,&rdquo; try &ldquo;When this is done, we can add it to the jar.&rdquo;
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Start small</h3>
      <p>
        Do not launch with thirty chores. Start with three. Choose tasks your child can realistically complete: brush teeth, put shoes away, clear plate. Once those feel normal, add more.
      </p>

      <p className="font-display font-bold mt-4">
        Chores do not need to feel like a daily fight. They can become small moments of contribution, confidence and connection.
      </p>
    </>
  );
}

/* ── Blog Post 4: What Is a Marble Jar Reward System? ── */
function MarbleJarPost() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> What Is a Marble Jar Reward System?<br />
        <strong>Meta:</strong> A marble jar reward system helps children see progress by adding marbles for chores, kindness and positive habits. Learn how families can use one.
      </p>
      <hr className="border-border" />

      <p>
        A marble jar reward system is a simple way to help children see progress. When a child completes a chore, shows kindness or practises a positive habit, a marble goes into the jar. When the jar is full, the family celebrates with a reward.
      </p>
      <p>
        PointPals takes this classic idea and turns it into a digital family chore app, so families can track points, fill a shared jar and work toward rewards together.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Why marble jars work for children</h3>
      <p>
        Children often live in the present moment. They may not naturally connect today&rsquo;s small task with a bigger family goal. A marble jar helps bridge that gap.
      </p>
      <p>
        When a child makes their bed, a marble appears. When they brush their teeth, the jar fills a little more. The child can see that small actions add up.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">A shared jar encourages teamwork</h3>
      <p>
        Instead of &ldquo;I am earning more than you,&rdquo; it becomes &ldquo;We are filling the jar together.&rdquo; That shared goal is one of the most important parts of PointPals.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">What should children earn marbles for?</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Chores:</strong> making the bed, putting dishes away, feeding pets</li>
        <li><strong>Positive habits:</strong> brushing teeth, reading, getting dressed</li>
        <li><strong>Kindness:</strong> helping a sibling, sharing, apologising</li>
        <li><strong>Family contribution:</strong> helping cook, tidying shared spaces</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Common mistakes to avoid</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Making the jar too big:</strong> Start small. Let the family experience success early.</li>
        <li><strong>Using it only for chores:</strong> Kindness and effort deserve recognition too.</li>
        <li><strong>Taking points away too often:</strong> The jar works best when it is mostly about building progress.</li>
        <li><strong>Choosing rewards that create conflict:</strong> Create a family reward list together.</li>
      </ul>

      <p className="font-display font-bold mt-4">
        A marble jar reward system is not about bribing children. Used well, it is about helping them see contribution. Every marble says: &ldquo;You helped.&rdquo;
      </p>
    </>
  );
}

/* ── Blog Post 5: Why Screen Time Is Not the Best Reward ── */
function ScreenTimePost() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> Screen-Free Rewards for Kids: Better Chore Reward Ideas<br />
        <strong>Meta:</strong> Looking for screen-free rewards for kids? Here are family-friendly chore reward ideas that encourage connection, confidence and positive behaviour.
      </p>
      <hr className="border-border" />

      <p>
        Screen time is an easy reward. It is quick. It is exciting. Children usually want it. Parents usually have access to it. &ldquo;Finish your chores and you can have the tablet.&rdquo;
      </p>
      <p>
        There is no shame in this. Every parent reaches for the easy option sometimes. But when screen time becomes the main reward, it can create problems.
      </p>
      <p>
        PointPals was designed to help families build a different kind of reward system — one based on shared goals, family connection and memories.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Screens are not all bad</h3>
      <p>
        Digital media can support learning, creativity and social connection. The goal is not to panic about screens. The goal is to avoid making screens the only thing children work toward.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">The reward teaches children what matters</h3>
      <p>
        Rewards send a message. When the reward is always a device, children learn &ldquo;I help so I can escape into a screen.&rdquo; When the reward is a shared family experience, children learn &ldquo;I help because our family works together.&rdquo;
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Better rewards do not have to cost money</h3>
      <p>
        Try: choosing the family dinner, pancakes on Saturday, a trip to a favourite playground, family movie night, baking cookies, camping in the lounge, one-on-one time with a parent, a board game night, a nature walk.
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Keep screen rewards occasional, not automatic</h3>
      <p>
        A screen reward that disconnects: &ldquo;Go watch the tablet by yourself.&rdquo; A screen reward that connects: &ldquo;Tonight we are having family movie night with popcorn.&rdquo; The second one still involves a screen, but the centre of the reward is togetherness.
      </p>

      <p className="font-display font-bold mt-4">
        Use rewards to build memories. The points are the path. The reward is the memory.
      </p>
    </>
  );
}

/* ── Blog Post 6: Age-Appropriate Chores ── */
function AgeChoresPost() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        <strong>SEO title:</strong> Age-Appropriate Chores for Kids: A Family Chore List<br />
        <strong>Meta:</strong> Looking for chores for kids by age? Use this simple family chore list for toddlers, preschoolers, school-aged children and tweens.
      </p>
      <hr className="border-border" />

      <p>
        Children want to feel capable. They may not always show it when you ask them to put away shoes or clear the table, but most children enjoy feeling useful when the task is clear and achievable.
      </p>
      <p>
        The key is choosing chores that match their age, confidence and stage of development. A chore that is too hard creates frustration. A chore that is too easy may feel pointless. The right chore helps a child feel, &ldquo;I can do this.&rdquo;
      </p>

      <h3 className="font-display text-lg font-bold mt-5">Chores for toddlers (2-3)</h3>
      <p>
        Toddlers are still learning coordination, attention and language, so chores should be very simple. The goal is not perfect completion — the goal is participation.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Putting toys in a basket</li>
        <li>Placing dirty clothes in a hamper</li>
        <li>Wiping small spills with help</li>
        <li>Putting books on a low shelf</li>
        <li>Helping feed a pet with supervision</li>
        <li>Putting shoes near the door</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Chores for preschoolers (4-5)</h3>
      <p>
        Preschoolers can handle more routine and responsibility, especially when tasks are visual and repeatable.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Making the bed with help</li>
        <li>Brushing teeth</li>
        <li>Getting dressed</li>
        <li>Putting shoes away</li>
        <li>Clearing their plate</li>
        <li>Feeding pets with supervision</li>
        <li>Putting toys away</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Chores for early school-aged (5-7)</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Making the bed</li>
        <li>Packing school bag</li>
        <li>Clearing the table</li>
        <li>Setting the table</li>
        <li>Watering plants</li>
        <li>Putting clean clothes away</li>
        <li>Tidying bedroom floor</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Chores for older school-aged (8-10)</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Loading or unloading dishwasher</li>
        <li>Folding washing</li>
        <li>Vacuuming small areas</li>
        <li>Preparing simple breakfast</li>
        <li>Helping with younger siblings</li>
        <li>Taking rubbish out</li>
        <li>Cleaning bedroom</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">Chores for tweens (11-13)</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Cooking simple meals</li>
        <li>Doing laundry steps</li>
        <li>Vacuuming and mopping</li>
        <li>Cleaning bathroom surfaces</li>
        <li>Changing sheets</li>
        <li>Packing lunches</li>
        <li>Taking care of pets independently</li>
      </ul>

      <h3 className="font-display text-lg font-bold mt-5">How to introduce chores without a fight</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Make the task clear.</strong> &ldquo;Clean your room&rdquo; can feel huge. &ldquo;Put clothes in the hamper&rdquo; is clear.</li>
        <li><strong>Make it repeatable.</strong> A chore that happens every day becomes easier than one that appears randomly.</li>
        <li><strong>Notice the effort.</strong> &ldquo;I saw you put your lunchbox away without being asked. That helped our morning.&rdquo;</li>
      </ul>

      <p className="font-display font-bold mt-4">
        The goal is not a perfect house. The goal is a family where everyone learns to help.
      </p>
    </>
  );
}
