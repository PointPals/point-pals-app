import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Sparkles, Heart, Gift, ArrowRight } from "lucide-react";
import { formatPrice, BILLING_CONFIG } from "@/lib/entitlements";
import { HERO_IMAGE_URL, LOGO_POINTS_URL } from "@/lib/image-urls";
import { HeroJarScene } from "@/components/HeroJarScene";
import { WalkingMascots } from "@/components/WalkingMascots";
import { HeroBackground } from "@/components/HeroBackground";
import { ThemeTune } from "@/components/ThemeTune";
import { playChime } from "@/lib/feedback";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "PointPals — Family Chore & Behaviour Chart, NZ-Made" },
      {
        name: "description",
        content:
          "Chores that don't feel like a fight. A research-backed system that turns everyday responsibilities into rewards your family earns and celebrates together. Built for Kiwi families. Made in NZ. Free trial.",
      },
      {
        name: "keywords",
        content:
          "chore chart, behaviour chart NZ, chore chart app, family chore tracker, reward chart for kids, parenting app NZ, token economy for kids, NZ-made app, behaviour chart for children, award chart, chore reward system",
      },
      { name: "theme-color", content: "#F3E1A0" },
      { property: "og:title", content: "PointPals — NZ-made Family Chore & Behaviour Chart" },
      {
        property: "og:description",
        content:
          "Chores that don't feel like a fight. A research-backed system that turns everyday responsibilities into rewards your family earns and celebrates together. Built for Kiwi families. Made in NZ.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pointpals.co.nz/welcome" },
      { property: "og:image", content: HERO_IMAGE_URL },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "PointPals" },
      { property: "og:locale", content: "en_NZ" },
      { name: "twitter:image", content: HERO_IMAGE_URL },
    ],
  }),
});

// Public marketing page (§8) - separate from the authenticated in-app
// experience, no auth required, no app chrome (AppShell hides its header/nav
// for this route - see components/AppShell.tsx). Kept light and fast: no
// canvas jar animation, no client-only state, just the pitch.
function WelcomePage() {
  const TARGET = 24;
  const [value, setValue] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [pendingDrops, setPendingDrops] = useState<{ n: number; tint: string }[]>([]);

  const handleFull = useCallback(() => {
    setCelebrating(true);
    window.setTimeout(() => {
      setValue(0);
      window.setTimeout(() => setCelebrating(false), 900);
    }, 3200);
  }, []);

  const addPoints = useCallback(
    (n: number, tint?: string) => {
      if (celebrating) return;
      // Positive chime plays synchronously inside the mascot-tap gesture so
      // iOS Safari honours it.
      playChime("positive");
      setValue((v) => Math.min(TARGET, v + n));
      if (tint) {
        setPendingDrops((d) => [...d, { n, tint }]);
      }
    },
    [celebrating],
  );

  // Clear pending drops after MarbleJar's effect has consumed them (React
  // fires effects bottom-up, so MarbleJar's child effect runs before this).
  useEffect(() => {
    if (pendingDrops.length > 0) {
      setPendingDrops([]);
    }
  });

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px 700px at 15% 10%, #FEE7B5 0%, transparent 60%)," +
          "radial-gradient(900px 700px at 85% 20%, #FBD0E4 0%, transparent 60%)," +
          "linear-gradient(180deg, #FFF6E4 0%, #FCE7F3 60%, #FDE1EC 100%)",
      }}
    >
      {/* header */}
      <header className="relative z-30 max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src={LOGO_POINTS_URL}
            alt="PointPals — family chores & behaviour, made kind"
            className="h-20 sm:h-28 lg:h-32 w-auto select-none drop-shadow-[0_10px_20px_rgba(236,72,153,0.35)]"
            draggable={false}
          />
        </Link>
        <Link
          to="/sign-in"
          className="tap text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          Log in
        </Link>
      </header>

      {/* hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-8 pb-12 grid lg:grid-cols-2 gap-8 items-center">
        <HeroBackground />

        {/* Marble jar first in DOM so it stacks above text on mobile */}
        <div className="relative z-10 lg:order-2">
          <HeroJarScene
            value={value}
            target={TARGET}
            celebrating={celebrating}
            pendingDrops={pendingDrops}
            onFull={handleFull}
          />
        </div>

        {/* Text block second in DOM, re-ordered left on desktop */}
        <div className="relative z-10 lg:order-1">
          <div className="rounded-3xl bg-white/70 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(236,72,153,0.35)] border border-white/60">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-butter/60 border border-butter px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
              <BadgeCheck className="h-3.5 w-3.5" /> Research-backed &amp; NZ-made
            </div>
            <h1 className="mt-4 font-display text-[2.5rem] sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Chores that don't feel like a fight.
            </h1>
            <p className="mt-5 text-lg text-foreground/80 max-w-xl">
              Award points for everyday tasks and kindness — each point drops a marble into a shared family jar. When it's full, your family celebrates with a reward you earned together.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-start gap-3">
              <Link
                to="/sign-up"
                className="tap inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-4 text-base font-semibold text-background hover:opacity-90 transition shadow-[0_10px_30px_-8px_rgba(236,72,153,0.5)]"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sign-in"
                className="tap inline-flex items-center justify-center gap-2 rounded-full border border-input bg-card px-7 py-4 text-base font-semibold hover:bg-muted transition"
              >
                Log in
              </Link>
            </div>
            <p className="mt-3 text-xs text-foreground/60">
              Free for {BILLING_CONFIG.trialDays} days, then {formatPrice()}. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Full-width walking mascots + floating points */}
        <WalkingMascots paused={celebrating} onPointsLand={addPoints} />
      </section>

      {/* how it works */}
      <section className="relative max-w-4xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Notice effort"
            body="A quick tap to award points for chores, kindness, and effort — tidying up without being asked, helping a sibling, trying something hard. The chime lets your child know you noticed."
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5" />}
            title="Earn it together"
            body="Every point drops a marble into the shared jar. Your family chooses the reward together — a park outing, movie night, camp in the lounge. Something everyone's excited about."
          />
          <FeatureCard
            icon={<Heart className="h-5 w-5" />}
            title="Remember the wins"
            body="Snap a photo of the proud grin after making the bed, the jar nearly full. Tag who was there and watch your family's story grow — not just a chore chart, but a family journal."
          />
        </div>
      </section>

      {/* how it works — three numbered steps */}
      <section className="relative max-w-4xl mx-auto px-6 pb-4">
        <h2 className="text-center font-display text-2xl sm:text-3xl font-bold">How it works</h2>
        <ol className="mt-6 grid sm:grid-cols-3 gap-5">
          {[
            "Set up your family's chores and the things you want to celebrate — kindness, effort, helping without being asked.",
            "Tap to award — watch a marble drop into the jar.",
            "When it's full, it's time to celebrate the reward everyone's been working towards.",
          ].map((step, i) => (
            <li key={i} className="card-soft p-5 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background font-display font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-foreground/80 leading-snug">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* evidence strip */}
      <section className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          PointPals is research-backed, not gimmicky. The idea is simple: children contribute more
          when they can <em>see</em> their effort add up — and when they feel connected to the
          outcome. External rewards scaffold habits, but the goal is always for the habit to stick,
          not the reward to last forever.{" "}
          <Link to="/about" className="underline hover:text-foreground">
            Read the research →
          </Link>
        </p>
      </section>

      {/* pricing card */}
      <section className="max-w-md mx-auto px-6 pb-16">
        <div className="card-soft p-7 text-center">
          <div className="font-display text-2xl font-bold">
            Free for {BILLING_CONFIG.trialDays} days
          </div>
          <div className="mt-1 text-muted-foreground">
            Then <span className="font-semibold text-foreground">{formatPrice()}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Cancel any time. No hidden fees.</p>
          <Link
            to="/sign-up"
            className="tap mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-base font-semibold text-background hover:opacity-90 transition"
          >
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Download from app stores */}
      <section className="max-w-lg mx-auto px-6 pb-16 text-center">
        <h2 className="font-display text-2xl font-bold">PointPals on your phone</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          PointPals runs in your browser — no app store needed. Add it to your home screen for
          the app-like experience. Native apps for iOS and Android are on their way.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="tap inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3 text-white hover:opacity-90 transition shadow-lg"
            aria-label="Download on the App Store"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.64 5.98.53 7.13-.64 1.63-1.51 3.24-2.58 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className="text-left">
              <div className="text-[10px] leading-tight">Download on the</div>
              <div className="text-lg font-semibold leading-tight">App Store</div>
            </div>
          </a>
          <a
            href="#"
            className="tap inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3 text-white hover:opacity-90 transition shadow-lg"
            aria-label="Get it on Google Play"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
              <path d="M3.61 2.76c-.14.18-.22.41-.22.7v17.08c0 .29.08.52.22.7l.08.07 9.93-9.25v-.62l-9.93-9.25-.08.07zm13.65 7.38l-3.38-3.14-4.5 4.19 4.5 4.19 3.38-3.14c.72-.66.72-1.44 0-2.1zM3.61 2.76L17.26 10.14l2.13-1.97c.98-.9.71-1.72-.12-2.17L3.69 2.69l-.08.07zm13.65 7.38L17.26 13.86l2.13 1.97c.98.9.71 1.72-.12 2.17L3.69 21.31l-.08-.07A1.16 1.16 0 0 1 3.61 2.76z"/>
            </svg>
            <div className="text-left">
              <div className="text-[10px] leading-tight">Get it on</div>
              <div className="text-lg font-semibold leading-tight">Google Play</div>
            </div>
          </a>
        </div>
      </section>

      {/* SEO keyword strip */}
      <section className="max-w-4xl mx-auto px-6 pb-8">
        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          PointPals is an <strong>NZ-made family chore system</strong> built on research, not gimmicks.
          A <strong>behaviour chart for children</strong> that turns everyday tasks into points toward a shared
          jar — then your family celebrates a reward you earned together.
          The <strong>best family chore tracker</strong> for <strong>Kiwi families</strong>.
          Try it free.
        </p>
      </section>

      <footer className="max-w-4xl mx-auto px-6 pb-10 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">
            Research
          </Link>
          <Link to="/faq" className="hover:text-foreground">
            FAQ
          </Link>
          <Link to="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/refunds" className="hover:text-foreground">
            Refunds
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <a href="mailto:support@pointpals.co.nz" className="hover:text-foreground">
            support@pointpals.co.nz
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 PointPals · Proudly made in New Zealand
        </p>
      </footer>
      <ThemeTune />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-soft p-5 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-butter/50 text-foreground/70">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-snug">{body}</p>
    </div>
  );
}
