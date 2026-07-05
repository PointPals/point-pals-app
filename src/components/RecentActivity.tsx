import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { iconUrl, isIconKey } from "@/lib/icons";

// A compact, collapsed-by-default log of the 10 most recent point events, so a
// parent can see what was last tapped without the home screen turning back into
// a feed. Not the photo wall — just quick context.
export function RecentActivity() {
  const { history, kids } = useApp();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (history.length === 0) return null;
  const recent = history.slice(0, 10);

  return (
    <section className="card-soft overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-display font-bold">Recent activity</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {recent.map((e) => {
            const kid = kids.find((k) => k.id === e.kidId);
            const showImg =
              isIconKey(e.itemIcon) || e.itemIcon.startsWith("http") || e.itemIcon.startsWith("/");
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                {showImg ? (
                  <img
                    src={isIconKey(e.itemIcon) ? iconUrl(e.itemIcon) : e.itemIcon}
                    alt=""
                    aria-hidden
                    className="w-8 h-8 rounded-lg object-contain shrink-0"
                  />
                ) : (
                  <span className="text-xl w-8 text-center shrink-0">{e.itemIcon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{e.itemName}</div>
                  <div className="text-xs text-muted-foreground">
                    {kid?.name ?? "—"}
                    {mounted ? ` · ${timeAgo(e.at)}` : ""}
                  </div>
                </div>
                <span
                  className={`font-display font-bold ${e.points < 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {e.points > 0 ? "+" : ""}
                  {e.points}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
