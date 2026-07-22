import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { MarbleJar } from "@/components/MarbleJar";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PASTEL_HEX, type PastelKey, type Kid, type PointEvent } from "@/lib/mock-data";
import { fetchKidsView, type KidsViewData, type KidsViewKid } from "@/lib/kids-view-link";

// The public page has jar totals but no event log, so synthesise one point
// event per marble for the given kid(s). That drives MarbleJar's kid-coloured
// marbles (Ruby pink, Leo blue) instead of the neutral rainbow fallback.
function synthEvents(entries: { kidId: string; n: number }[]): PointEvent[] {
  const events: PointEvent[] = [];
  let i = 0;
  for (const { kidId, n } of entries) {
    for (let j = 0; j < Math.max(0, n); j++) {
      events.push({ id: `${kidId}-${i}`, kidId, itemName: "", itemIcon: "", points: 1, at: i });
      i++;
    }
  }
  return events;
}

// Minimal Kid shape MarbleJar needs for per-kid marble colour.
function asKid(k: KidsViewKid): Kid {
  return { id: k.id, color: k.color as PastelKey } as Kid;
}

// Public, read-only family "Kids' view" — opened via a private share link
// (/k/<token>). No login, no PIN: the unguessable token is the gate. Kids save
// it to their home screen and check jars + points anytime. Renders standalone
// (no app shell) and refreshes on focus + a gentle interval so points stay
// current without a live socket.
export const Route = createFileRoute("/k/$token")({
  // Client-only: fetches with the publishable key against the get_kids_view RPC.
  ssr: false,
  component: KidsViewPublic,
  head: () => ({
    meta: [{ title: "PointPals — How we're doing" }, { name: "robots", content: "noindex" }],
  }),
});

const REFRESH_MS = 30_000;

function KidsViewPublic() {
  const { token } = Route.useParams();
  const [data, setData] = useState<KidsViewData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
  const reducedMotion =
    typeof window !== "undefined"
      ? (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
      : false;

  // "Add to Home Screen" normally saves the app's manifest start_url ("/"),
  // which redirects to sign-in. Swap in a per-page manifest whose start_url +
  // scope are THIS token link, so the saved icon opens straight into the kids'
  // view. Restored on unmount so the rest of the app keeps its own manifest.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    const origin = window.location.origin;
    const manifest = {
      name: "PointPals — My Points",
      short_name: "My Points",
      start_url: href,
      scope: href,
      display: "standalone",
      background_color: "#FBF7EC",
      theme_color: "#FBF7EC",
      icons: [
        { src: `${origin}/app-icon.png`, sizes: "512x512", type: "image/png" },
        {
          src: `${origin}/app-icon-maskable.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    };
    const blobUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }),
    );
    const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevHref = existing?.getAttribute("href") ?? null;
    const link = existing ?? document.createElement("link");
    link.rel = "manifest";
    link.setAttribute("href", blobUrl);
    if (!existing) document.head.appendChild(link);
    // Give iOS a matching home-screen title.
    const appleTitle = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-title"]',
    );
    const prevTitle = appleTitle?.getAttribute("content") ?? null;
    appleTitle?.setAttribute("content", "My Points");
    return () => {
      URL.revokeObjectURL(blobUrl);
      if (existing) {
        if (prevHref) existing.setAttribute("href", prevHref);
      } else {
        link.remove();
      }
      if (appleTitle && prevTitle !== null) appleTitle.setAttribute("content", prevTitle);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const load = async (initial: boolean) => {
      const res = await fetchKidsView(token);
      if (cancelled) return;
      if (res.status === "ok") {
        attempts = 0;
        setData(res.data);
        setStatus("ready");
      } else if (res.status === "empty") {
        // The token genuinely doesn't match — only then is it "not found".
        if (initial) setStatus("notfound");
      } else {
        // Transient error — retry a few times before giving up, so a blip on
        // reload doesn't wrongly show "no longer active".
        if (initial) {
          attempts += 1;
          if (attempts <= 5) window.setTimeout(() => void load(true), 1500);
          else setStatus("notfound");
        }
      }
    };
    void load(true);
    const onFocus = () => void load(false);
    const interval = window.setInterval(() => void load(false), REFRESH_MS);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-dvh grid place-items-center bg-background px-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "notfound" || !data) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-bold">Link not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This Kids&apos; view link is no longer active. Ask a parent for a fresh link from
            PointPals → Settings.
          </p>
        </div>
      </div>
    );
  }

  const { household, kids } = data;
  const showFamily = household.sharedJarEnabled;
  const jarKids = kids.filter((k) => k.personalTarget > 0);
  const allKids = kids.map(asKid);
  // Round-robin the shared pool across kids so the family jar shows the kids'
  // colours rather than a rainbow (we don't have per-kid contribution here).
  const familyEvents = kids.length
    ? synthEvents(
        Array.from({ length: household.sharedPool }, (_, i) => ({
          kidId: kids[i % kids.length].id,
          n: 1,
        })),
      )
    : [];

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles className="w-5 h-5" /> How we&apos;re doing
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[45%] text-right">
          {household.name}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-10">
        {showFamily && (
          <div className="flex flex-col items-center text-center">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Family jar
            </div>
            <MarbleJar
              value={household.sharedPool}
              target={household.rewardTarget}
              events={familyEvents}
              kids={allKids}
              size={260}
              reducedMotion={reducedMotion}
              className="-my-2"
            />
            <div className="font-display text-3xl font-bold leading-none">
              {household.sharedPool}
              <span className="text-muted-foreground text-lg font-sans font-normal">
                {" "}
                / {household.rewardTarget}
              </span>
            </div>
            {household.rewardName && (
              <div className="mt-1 text-sm text-muted-foreground">
                Working towards: {household.rewardName}
              </div>
            )}
          </div>
        )}

        {jarKids.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {jarKids.map((k) => (
              <div key={k.id} className="flex flex-col items-center text-center">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {k.name}&apos;s jar
                </div>
                <MarbleJar
                  value={k.personalPool}
                  target={k.personalTarget > 0 ? k.personalTarget : 999}
                  events={synthEvents([{ kidId: k.id, n: k.personalPool }])}
                  kids={[asKid(k)]}
                  size={150}
                  reducedMotion={reducedMotion}
                  className="-my-1"
                />
                <div className="font-display text-2xl font-bold leading-none">
                  {k.personalPool}
                  <span className="text-muted-foreground text-sm font-sans font-normal">
                    {" "}
                    / {k.personalTarget}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Every kid's total, so a child can always find their own number. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kids.map((k) => (
            <div key={k.id} className="card-soft p-3 flex flex-col items-center text-center gap-1">
              <span
                className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: PASTEL_HEX[k.color as PastelKey] ?? "#ccc" }}
              >
                <CompanionAvatar
                  seed={k.id}
                  color={k.color as PastelKey}
                  size={48}
                  companionId={k.companionId ?? undefined}
                />
              </span>
              <div className="text-sm font-semibold truncate max-w-full">{k.name}</div>
              <div className="font-display text-2xl font-bold">
                {household.splitJarsEnabled ? k.personalPool : k.currentPoints}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70 pt-2">
          Read-only • saved to your home screen, this always shows the latest points.
        </p>
      </div>
    </div>
  );
}
