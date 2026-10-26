import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Check, Link2, Loader2, Send, X } from "lucide-react";
import { PASTEL_HEX } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { TileIcon } from "@/components/IconTile";
import { haptic } from "@/lib/feedback";
import { endVisit, reportTotal, visitReport, visitReportUrl, type Visitor } from "@/lib/visitors";
import { hostPlace, shareVisitCard } from "@/lib/visit-card";

/**
 * The end of a visit: what the friend did, and two ways to send it home — a
 * picture for any parent (texted, WhatsApp'd, emailed) and a link that a
 * PointPals parent can open to add the points to their own child.
 */
export function VisitSummarySheet({
  visitor,
  hostName,
  onOpenChange,
}: {
  visitor: Visitor | null;
  hostName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    setStatus(null);
    setConfirmEnd(false);
  }, [visitor?.id]);

  const report = visitor ? visitReport(visitor, hostName) : null;
  const total = report ? reportTotal(report) : 0;

  const share = async () => {
    if (!report) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await shareVisitCard(report, visitReportUrl(report));
      if (result === "shared") setStatus("Sent! You can end the visit when they head home.");
      if (result === "downloaded")
        setStatus("Picture saved — send it to their parent with the link below.");
      haptic("success");
    } catch {
      setStatus("Couldn’t make the picture — copy the link instead.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(visitReportUrl(report));
      setStatus("Link copied — paste it into a message to their parent.");
      haptic("light");
    } catch {
      setStatus("Couldn’t copy — try sending the picture instead.");
    }
  };

  const finish = () => {
    if (!visitor) return;
    endVisit(visitor.id);
    haptic("success");
    onOpenChange(false);
  };

  return (
    <Drawer.Root open={!!visitor} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-ink/35 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[2rem] bg-card shadow-lift outline-none sm:bottom-6 sm:rounded-[2rem]"
        >
          {visitor && report && (
            <>
              <div
                className="rounded-t-[2rem] px-6 pb-5 pt-3"
                style={{
                  background: `linear-gradient(160deg, color-mix(in oklab, ${PASTEL_HEX[visitor.color]} 80%, white), color-mix(in oklab, ${PASTEL_HEX[visitor.color]} 20%, white) 85%)`,
                }}
              >
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/15" aria-hidden />
                <div className="flex items-center gap-3">
                  <span
                    className="block h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-clay-sm"
                    style={{ backgroundColor: PASTEL_HEX[visitor.color] }}
                  >
                    <CompanionAvatar
                      seed={visitor.id}
                      color={visitor.color}
                      size={56}
                      companionId={visitor.companionId}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Drawer.Title className="truncate font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink">
                      {visitor.name}’s visit
                    </Drawer.Title>
                    <p className="mt-1 text-xs font-medium text-ink-soft">
                      {total} {total === 1 ? "point" : "points"} at {hostPlace(hostName)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close"
                    className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/70 text-ink shadow-clay-sm hover:bg-white"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-4">
                {report.lines.length === 0 ? (
                  <p className="rounded-2xl bg-muted/60 p-4 text-sm text-ink-soft">
                    No points yet — tap {visitor.name} on Home whenever they do something great.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {report.lines.map((l) => (
                      <li key={`${l.name}-${l.points}`} className="flex items-center gap-3 py-2.5">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                          style={{ backgroundColor: PASTEL_HEX[visitor.color] }}
                        >
                          <TileIcon icon={l.icon} className="h-8 w-8 text-2xl" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                          {l.name}
                          {l.count > 1 && (
                            <span className="ml-1.5 text-sm font-medium text-ink-soft">
                              ×{l.count}
                            </span>
                          )}
                        </span>
                        <span className="font-display text-lg font-semibold tabular-nums text-ink">
                          +{l.points * l.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  The picture shows what {visitor.name} did, for their parent to add to whatever
                  they use at home. The link opens the same report — and if their family uses
                  PointPals, one tap adds the points to {visitor.name}’s jar.
                </p>
                {status && (
                  <p
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-2xl bg-jade/15 px-4 py-3 text-sm font-medium text-ink"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {status}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-border/70 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <button
                  type="button"
                  onClick={() => void share()}
                  disabled={busy || report.lines.length === 0}
                  className="tap bg-cta inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold text-white shadow-clay-sm transition disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-5 w-5" aria-hidden />
                  )}
                  Send {visitor.name}’s points home
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    disabled={report.lines.length === 0}
                    className="tap inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-semibold text-ink transition hover:bg-muted disabled:opacity-40"
                  >
                    <Link2 className="h-4 w-4" aria-hidden /> Copy link
                  </button>
                  {confirmEnd ? (
                    <button
                      type="button"
                      onClick={finish}
                      className="tap inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
                    >
                      Yes, end visit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmEnd(true)}
                      className="tap inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-input bg-card px-4 text-sm font-semibold text-ink-soft transition hover:bg-muted hover:text-ink"
                    >
                      End visit
                    </button>
                  )}
                </div>
                {confirmEnd && (
                  <p className="text-center text-xs text-muted-foreground">
                    {visitor.name} and their points will be cleared from this phone.
                  </p>
                )}
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
