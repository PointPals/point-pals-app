import { createFileRoute } from "@tanstack/react-router";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Hero } from "@/components/marketing/Hero";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SixPm } from "@/components/marketing/SixPm";
import { OneTap } from "@/components/marketing/OneTap";
import { MeetPals } from "@/components/marketing/MeetPals";
import { HandItOver } from "@/components/marketing/HandItOver";
import { Celebrate } from "@/components/marketing/Celebrate";
import { Research } from "@/components/marketing/Research";
import { Plush } from "@/components/marketing/Plush";
import { FinalCta } from "@/components/marketing/FinalCta";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { HERO_IMAGE_URL } from "@/lib/image-urls";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "PointPals — Free Family Chore & Behaviour Chart, NZ-Made" },
      {
        name: "description",
        content:
          "Chores that don't feel like a fight. A free, research-backed family chore chart where every good thing drops a marble in a shared jar — then your family celebrates together. Built for Kiwi families. Made in NZ.",
      },
      {
        name: "keywords",
        content:
          "chore chart, behaviour chart NZ, chore chart app, family chore tracker, reward chart for kids, parenting app NZ, token economy for kids, NZ-made app, behaviour chart for children, award chart, chore reward system, marble jar",
      },
      { name: "theme-color", content: "#FBF6EE" },
      { property: "og:title", content: "PointPals — Every good thing drops a marble" },
      {
        property: "og:description",
        content:
          "A free, research-backed family chore & behaviour chart. Notice the good, fill the family jar, celebrate together. Built for Kiwi families. Made in NZ.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pointpals.co.nz/welcome" },
      { property: "og:image", content: HERO_IMAGE_URL },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "PointPals" },
      { property: "og:locale", content: "en_NZ" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PointPals — Every good thing drops a marble" },
      {
        name: "twitter:description",
        content:
          "A free, research-backed family chore & behaviour chart. Notice the good, fill the family jar, celebrate together. Made in NZ.",
      },
      { name: "twitter:image", content: HERO_IMAGE_URL },
    ],
  }),
});

// Public marketing page — no auth, no app chrome (AppShell renders this route
// bare). Eight chapters of scroll-told story; every scene renders a complete,
// static layout first (SSR, no-JS, reduced motion) and only layers GSAP
// ScrollTrigger choreography on top when motion is welcome.
function WelcomePage() {
  // Chapters create their ScrollTriggers in their own effects (children run
  // first). Once everything is mounted, sort by page position and recompute
  // so pin spacing from earlier scenes is accounted for — and again once the
  // display font has settled line lengths.
  useGSAP(() => {
    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };
    refresh();
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && refresh());
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SmoothScroll>
      <div className="lp-root relative min-h-screen overflow-x-clip bg-cream text-ink">
        <a
          href="#lp-main"
          className="sr-only z-[60] rounded-full bg-cta px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="lp-main">
          <Hero />
          <SixPm />
          <OneTap />
          <MeetPals />
          <HandItOver />
          <Celebrate />
          <Research />
          <Plush />
        </main>
        <FinalCta />
      </div>
    </SmoothScroll>
  );
}
