import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Sparkles, Heart, Gift, ArrowRight } from "lucide-react";
import { formatPrice, BILLING_CONFIG } from "@/lib/entitlements";
import heroAsset from "@/assets/brand/pp-hero.asset.json";
import { url as logoUrl } from "@/assets/brand/pointpals-logo-points.asset.json";
import { HeroJarScene } from "@/components/HeroJarScene";
import { WalkingMascots } from "@/components/WalkingMascots";
import { HeroBackground } from "@/components/HeroBackground";
import { ThemeTune } from "@/components/ThemeTune";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "PointPals — Family chores & behaviour, made kind" },
      {
        name: "description",
        content:
          "PointPals is a warm, pastel family chore & behaviour tracker. Kids earn points toward collectible plush companions and vote on shared rewards.",
      },
      { name: "theme-color", content: "#F3E1A0" },
      { property: "og:title", content: "PointPals — Family chores & behaviour, made kind" },
      {
        property: "og:description",
        content:
          "PointPals is a warm, pastel family chore & behaviour tracker. Kids earn points toward collectible plush companions and vote on shared rewards.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroAsset.url },
      { name: "twitter:image", content: heroAsset.url },
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

  const handleFull = useCallback(() => {
    setCelebrating(true);
    window.setTimeout(() => {
      setValue(0);
      window.setTimeout(() => setCelebrating(false), 900);
    }, 3200);
  }, []);

  const addPoints = useCallback(
    (n: number) => {
      if (celebrating) return;
      setValue((v) => Math.min(TARGET, v + n));
    },
    [celebrating],
  );

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
            src={logoUrl}
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
        <div className="relative z-10">
          <div className="rounded-3xl bg-white/70 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(236,72,153,0.35)] border border-white/60">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-butter/60 border border-butter px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/70">
              <Sparkles className="h-3.5 w-3.5" /> Research-backed &amp; NZ-made
            </div>
            <h1 className="mt-4 font-display text-[2.5rem] sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Chores that feel
              <br />
              like a <GameWord />,
              <br />
              not a fight.
            </h1>
            <p className="mt-5 text-lg text-foreground/80 max-w-xl">
              PointPals turns everyday chores and good behaviour into points the whole family fills
              a shared jar with together - then celebrates by choosing a reward as a team.
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

        {/* Massive marble jar centrepiece */}
        <div className="relative z-10">
          <HeroJarScene
            value={value}
            target={TARGET}
            celebrating={celebrating}
            onFull={handleFull}
          />
        </div>

        {/* Full-width walking mascots + floating points */}
        <WalkingMascots paused={celebrating} onPointsLand={addPoints} />
      </section>

      {/* how it works */}
      <section className="relative max-w-4xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Catch kindness in the moment"
            body="A quick tap to notice the good stuff — tidying up without being asked, helping a sibling, trying something hard. The chime says 'I see you.'"
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5" />}
            title="Work toward something together"
            body="Every point drops a marble into a shared jar. The family picks the reward together — a park outing, movie night, something everyone's excited about."
          />
          <FeatureCard
            icon={<Heart className="h-5 w-5" />}
            title="Build a family story"
            body="Snap a photo of the moment — the proud grin after making the bed, the marble jar nearly full. Tag who was there and watch your family's wall grow."
          />
        </div>
      </section>

      {/* how it works — three numbered steps */}
      <section className="relative max-w-4xl mx-auto px-6 pb-4">
        <h2 className="text-center font-display text-2xl sm:text-3xl font-bold">How it works</h2>
        <ol className="mt-6 grid sm:grid-cols-3 gap-5">
          {[
            "Set up your family's chores and good-behaviour skills.",
            "Tap to award — watch a marble drop into the jar.",
            "When it's full, the family votes on the reward and celebrates.",
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
          PointPals is built on token-economy research — a well-studied behavioural psychology
          approach. External rewards scaffold habit formation for tasks that lack intrinsic
          motivation, like chores. The goal is for the habit to stick, not for the reward to last
          forever.{" "}
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

      <footer className="max-w-4xl mx-auto px-6 pb-10 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">
            About
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
        </div>
        <p className="text-xs text-muted-foreground">
          © 2025 PointPals · Proudly made in New Zealand 🇳🇿
        </p>
      </footer>
      <ThemeTune />
    </div>
  );
}

// "game" rendered in the same warm butter→pink gradient as the page
// background, with a slow glimmer sparkle sweeping across the letters.
function GameWord() {
  return (
    <span
      className="relative inline-block bg-clip-text text-transparent"
      style={{
        backgroundImage:
          "linear-gradient(100deg, #F5C64B 0%, #F19AAC 45%, #EC6FB0 100%)",
        WebkitBackgroundClip: "text",
      }}
    >
      game
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-clip-text text-transparent game-glimmer"
        style={{
          backgroundImage:
            "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.95) 50%, transparent 70%)",
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
        }}
      >
        game
      </span>
    </span>
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
