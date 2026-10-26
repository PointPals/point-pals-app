import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MarbleJar } from "@/components/MarbleJar";
import { KidsBoard } from "@/components/kid-mode/KidsBoard";
import { type PastelKey, type Kid, type PointEvent } from "@/lib/mock-data";
import { fetchKidsView, type KidsViewData, type KidsViewKid } from "@/lib/kids-view-link";
import { supabase } from "@/integrations/supabase/client";
import { primeAudio } from "@/lib/feedback";

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

// Near-real-time: re-poll every few seconds so a parent's award shows on the
// kid's device within moments (MarbleJar animates the newly-added marbles).
const REFRESH_MS = 4_000;

function KidsViewPublic() {
  const { token } = Route.useParams();
  const [data, setData] = useState<KidsViewData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");
  // Latest silent refetch, so the realtime broadcast handler can pull fresh
  // jars the instant a parent awards — without re-subscribing on every render.
  const refetchRef = useRef<() => void>(() => {});
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
    refetchRef.current = () => void load(false);
    void load(true);
    const onFocus = () => void load(false);
    const interval = window.setInterval(() => void load(false), REFRESH_MS);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      refetchRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token]);

  // Instant sync: join the same Realtime broadcast channel the parent app pings
  // on every award/undo (`household:<id>`). On a ping we refetch straight away,
  // so the newly-added marbles animate + clink on the kid's device within a
  // moment — the 4s poll above is just the fallback. Broadcast is ephemeral
  // messaging, so no household data is exposed by joining.
  const householdId = data?.household.id;
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`household:${householdId}`)
      .on("broadcast", { event: "jar" }, () => refetchRef.current())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  // Mobile browsers block sound until the first touch. Prime the audio engine
  // on the kid's first tap so the marble clinks can play when a broadcast
  // award drops new marbles into the jar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFirstTap = () => primeAudio();
    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTap);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-dvh grid place-items-center bg-cream px-6">
        <Loader2 className="h-8 w-8 animate-spin text-ink-soft" aria-label="Loading" />
      </div>
    );
  }

  if (status === "notfound" || !data) {
    return (
      <div className="min-h-dvh grid place-items-center bg-cream px-6 text-center">
        <div className="max-w-sm rounded-3xl bg-card p-8 shadow-clay">
          <h1 className="font-display text-3xl font-semibold">Link not found</h1>
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
    <KidsBoard
      householdName={household.name}
      rewardName={household.rewardName}
      sharedPool={household.sharedPool}
      rewardTarget={household.rewardTarget}
      showFamily={showFamily}
      kids={kids.map((k) => ({
        id: k.id,
        name: k.name,
        color: (k.color as PastelKey) ?? "sky",
        companionId: k.companionId ?? undefined,
        points: household.splitJarsEnabled ? k.personalPool : k.currentPoints,
        personalPool: k.personalPool,
        personalTarget: k.personalTarget,
        personalReward: null,
      }))}
      familyJar={
        <MarbleJar
          value={household.sharedPool}
          target={household.rewardTarget}
          events={familyEvents}
          kids={allKids}
          size={260}
          reducedMotion={reducedMotion}
          className="-my-2"
        />
      }
      personalJar={(bk) => {
        const k = jarKids.find((x) => x.id === bk.id);
        if (!k) return null;
        return (
          <MarbleJar
            value={k.personalPool}
            target={k.personalTarget > 0 ? k.personalTarget : 999}
            events={synthEvents([{ kidId: k.id, n: k.personalPool }])}
            kids={[asKid(k)]}
            size={110}
            reducedMotion={reducedMotion}
            className="-my-1"
          />
        );
      }}
      footnote="Saved to your home screen, this always shows the latest marbles."
    />
  );
}
