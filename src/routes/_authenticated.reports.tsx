import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { PASTEL_HEX, PASTEL_MUTED } from "@/lib/mock-data";
import { iconUrl, isIconKey } from "@/lib/icons";
import {
  DATE_RANGE_LABELS,
  computeGauge,
  eventsToCsv,
  fetchReportEvents,
  resolveRange,
  type DateRangeKey,
  type ReportEvent,
} from "@/lib/reports";
import { Download, Printer, MoreVertical, Wrench, Check, X, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports — PointPals" },
      { name: "description", content: "Positive vs. needs-work trends for your family." },
    ],
  }),
});

// Parent/admin only — same "role === null means demo/full-access" convention
// used elsewhere (useHouseholdRole.canEdit etc.).
function ReportsPage() {
  const { household, kids, history, correctPoints, mode } = useApp();
  const { role } = useHouseholdRole(household.id);
  const canView = role === null || role === "admin" || role === "parent";

  const [rangeKey, setRangeKey] = useState<DateRangeKey>("this-week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [scopeKidId, setScopeKidId] = useState<string | null>(null);
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(
    () => resolveRange(rangeKey, { start: customStart, end: customEnd }),
    [rangeKey, customStart, customEnd],
  );

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setLoading(true);
    void fetchReportEvents({
      mode,
      householdId: household.id,
      history: history as ReportEvent[],
      range,
      kidId: scopeKidId,
    }).then((rows) => {
      if (!cancelled) {
        setEvents(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [canView, mode, household.id, history, range, scopeKidId]);

  const gauge = useMemo(() => computeGauge(events), [events]);
  const kidName = (id: string) => kids.find((k) => k.id === id)?.name ?? "—";

  const exportCsv = () => {
    const csv = eventsToCsv(events, kidName);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pointpals-report-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <div className="card-soft px-6 py-10 text-center text-sm text-muted-foreground">
        Reports are visible to parents and admins only.
      </div>
    );
  }

  return (
    <div className="space-y-6 pp-print-report">
      <div className="pp-print-hide">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7" /> Reports
        </h1>
        <p className="text-sm text-muted-foreground">Positive vs. needs-work trends over time.</p>
      </div>

      {/* Controls */}
      <div className="card-soft p-4 space-y-3 pp-print-hide">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex-1 min-w-[160px]">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Date range
            </span>
            <select
              value={rangeKey}
              onChange={(e) => setRangeKey(e.target.value as DateRangeKey)}
              className="w-full mt-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map((k) => (
                <option key={k} value={k}>
                  {DATE_RANGE_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          {rangeKey === "custom" && (
            <>
              <label>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  From
                </span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="block mt-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  To
                </span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="block mt-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </>
          )}
        </div>

        {/* Scope: whole family or one kid */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setScopeKidId(null)}
            className={`tap min-h-[44px] px-4 rounded-full text-sm font-semibold border transition ${
              scopeKidId === null
                ? "bg-foreground text-background border-foreground"
                : "border-input text-muted-foreground hover:bg-muted"
            }`}
          >
            Whole family
          </button>
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => setScopeKidId(k.id)}
              className={`tap min-h-[44px] px-4 rounded-full text-sm font-semibold border transition ${
                scopeKidId === k.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-input text-muted-foreground hover:bg-muted"
              }`}
            >
              {k.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gauge + count chips */}
      <div className="card-soft p-5 flex flex-col items-center gap-3">
        <RadialGauge pct={gauge.pctPositive} loading={loading} />
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-sage/30 px-3 py-1 font-semibold">
            {gauge.positive} positive
          </span>
          <span className="rounded-full bg-blush/30 px-3 py-1 font-semibold">
            {gauge.needsWork} needs work
          </span>
        </div>
        <div className="flex gap-2 pp-print-hide">
          <button
            onClick={exportCsv}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-muted transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-muted transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Event list */}
      <div className="card-soft overflow-hidden">
        {events.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            {loading ? "Loading…" : "No events in this range."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                kidName={kidName(e.kidId)}
                onCorrect={(delta, reason) => correctPoints(e.kidId, delta, reason)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Semi-circle radial gauge, sage (all positive) through the app's existing
// muted "dusty rose" token (PASTEL_MUTED.blush) — never a literal traffic-
// light red, matching the "needs work is never alarming" principle.
function RadialGauge({ pct, loading }: { pct: number | null; loading: boolean }) {
  const value = pct ?? 0;
  const r = 70;
  const circumference = Math.PI * r; // half circle
  const offset = circumference * (1 - value / 100);
  return (
    <div className="relative w-[200px] h-[110px]">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs>
          <linearGradient id="pp-gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PASTEL_MUTED.blush} />
            <stop offset="100%" stopColor={PASTEL_HEX.sage} />
          </linearGradient>
        </defs>
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke="url(#pp-gauge-grad)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : offset}
          style={{ transition: "stroke-dashoffset 500ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="font-display text-3xl font-bold leading-none">
          {pct === null ? "—" : `${Math.round(pct)}%`}
        </div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
          Positive
        </div>
      </div>
    </div>
  );
}

function EventRow({
  event,
  kidName,
  onCorrect,
}: {
  event: ReportEvent;
  kidName: string;
  onCorrect: (delta: number, reason?: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [deltaStr, setDeltaStr] = useState(String(-event.points));
  const isCorrection = event.type === "correction";

  const applyCorrection = () => {
    const delta = parseInt(deltaStr, 10);
    if (isNaN(delta) || delta === 0) return;
    onCorrect(delta, `undo "${event.itemName}"`);
    setCorrecting(false);
    setMenuOpen(false);
  };

  return (
    <li className={`px-4 py-3 flex items-center gap-3 ${isCorrection ? "opacity-70" : ""}`}>
      {isIconKey(event.itemIcon) || event.itemIcon.startsWith("http") ? (
        <img
          src={isIconKey(event.itemIcon) ? iconUrl(event.itemIcon) : event.itemIcon}
          alt=""
          className="w-9 h-9 rounded-lg object-contain shrink-0"
        />
      ) : (
        <span className="text-xl w-9 text-center shrink-0" aria-hidden>
          {event.itemIcon}
        </span>
      )}
      <span
        className={`font-display font-bold text-sm shrink-0 w-12 text-center rounded-full py-0.5 ${
          isCorrection
            ? "text-muted-foreground"
            : event.points >= 0
              ? "bg-sage/30 text-foreground"
              : "bg-blush/30 text-foreground"
        }`}
      >
        {event.points > 0 ? "+" : ""}
        {event.points}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">
          {event.itemName} <span className="text-muted-foreground font-normal">— {kidName}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(event.at).toLocaleString("en-NZ", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          {" · by "}
          {event.awardedBy ?? "—"}
        </div>
      </div>
      <div className="relative pp-print-hide">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="More actions"
          className="tap h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && !correcting && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-card border border-border rounded-2xl shadow-xl p-1.5 animate-pop-in">
              <button
                onClick={() => setCorrecting(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-muted transition"
              >
                <Wrench className="w-3.5 h-3.5" /> Correct this
              </button>
            </div>
          </>
        )}
        {correcting && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCorrecting(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-card border border-border rounded-2xl shadow-xl p-3 space-y-2 animate-pop-in">
              <label className="block text-xs font-semibold text-muted-foreground">
                Adjust by
                <input
                  type="number"
                  value={deltaStr}
                  onChange={(ev) => setDeltaStr(ev.target.value)}
                  autoFocus
                  className="block w-full mt-1 rounded-lg border border-input bg-card px-2 py-1.5 text-sm font-semibold text-center"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setCorrecting(false)}
                  className="tap p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <button onClick={applyCorrection} className="tap p-1.5 text-sage-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
