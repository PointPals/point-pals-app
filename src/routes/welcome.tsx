import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Heart, Gift, ArrowRight } from "lucide-react";
import { PASTEL_HEX } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { formatPrice, BILLING_CONFIG } from "@/lib/entitlements";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "PointPals — Family chores & habits, made kind" },
      {
        name: "description",
        content:
          "PointPals turns everyday chores into habits worth cheering for. Points fill a shared family jar; kids collect companion avatars along the way.",
      },
      { name: "theme-color", content: "#F3E1A0" },
      { property: "og:title", content: "PointPals — Family chores & habits, made kind" },
      {
        property: "og:description",
        content: "A warm, pastel family chore & behaviour tracker — not a boring points list.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

// Public marketing page (§8) — separate from the authenticated in-app
// experience, no auth required, no app chrome (AppShell hides its header/nav
// for this route — see components/AppShell.tsx). Kept light and fast: no
// canvas jar animation, no client-only state, just the pitch.
function WelcomePage() {
  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="max-w-5xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div className="text-2xl font-display font-extrabold tracking-tight">PointPals</div>
        <Link
          to="/sign-in"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          Log in
        </Link>
      </header>

      {/* hero */}
      <section className="max-w-3xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-butter/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
          <Sparkles className="h-3.5 w-3.5" /> Now with photo memories
        </div>
        <h1 className="mt-5 font-display text-4xl sm:text-5xl font-bold leading-tight">
          Chores that feel like a game,
          <br />
          not a fight.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          PointPals turns everyday chores and good behaviour into points the whole family fills a
          shared jar with together — then celebrates by choosing a reward as a team.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-base font-semibold text-background hover:opacity-90 transition shadow-lg"
          >
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/sign-in"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-card px-7 py-3.5 text-base font-semibold hover:bg-muted transition"
          >
            Log in
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Free for {BILLING_CONFIG.trialDays} days, then {formatPrice()}. Cancel anytime.
        </p>
      </section>

      {/* companion strip */}
      <section className="max-w-3xl mx-auto px-6 pb-4">
        <div className="flex items-center justify-center gap-4">
          {(["blush", "sky", "sage", "lilac"] as const).map((c, i) => (
            <div
              key={c}
              className="h-16 w-16 rounded-full overflow-hidden shadow-md"
              style={{
                backgroundColor: PASTEL_HEX[c],
                transform: `translateY(${i % 2 === 0 ? "0px" : "10px"})`,
              }}
            >
              <CompanionAvatar seed={`welcome-${c}`} color={c} size={64} />
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Tap to award points"
            body="Tap a kid's avatar, pick a chore or a kind moment — a chime plays and their points bounce up instantly."
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5" />}
            title="Fill the family jar"
            body="Every point drops a marble into a shared glass jar. Watch it fill together, then pick a reward as a family."
          />
          <FeatureCard
            icon={<Heart className="h-5 w-5" />}
            title="Keep the memories"
            body="Snap a photo of the moment, tag who was there — a family memory wall alongside the points."
          />
        </div>
      </section>

      {/* honesty section */}
      <section className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <p className="text-sm text-muted-foreground">
          We're upfront that PointPals uses external rewards to help routines stick — and that the
          goal is the habit, not permanent dependence on points.{" "}
          <Link to="/about" className="underline hover:text-foreground">
            Read the research behind it
          </Link>
          .
        </p>
      </section>

      <footer className="max-w-4xl mx-auto px-6 pb-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link to="/refunds" className="hover:text-foreground">
          Refunds
        </Link>
        <a href="mailto:support@pointpals.app" className="hover:text-foreground">
          Support
        </a>
      </footer>
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
