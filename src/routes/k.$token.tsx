import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { MarbleJar } from "@/components/MarbleJar";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { fetchKidsView, type KidsViewData } from "@/lib/kids-view-link";

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

  useEffect(() => {
    let cancelled = false;
    const load = async (initial: boolean) => {
      const res = await fetchKidsView(token);
      if (cancelled) return;
      if (res) {
        setData(res);
        setStatus("ready");
      } else if (initial) {
        setStatus("notfound");
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
