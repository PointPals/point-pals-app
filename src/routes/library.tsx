import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { IconTile } from "@/components/IconTile";
import { KidChartCard } from "@/components/KidChartCard";
import type { PastelKey } from "@/lib/mock-data";
import { COMPANIONS } from "@/lib/mock-data";
import { companionArtUrl } from "@/lib/companion-assets";
import { Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — PointPals" },
      { name: "description", content: "Manage chores, positive skills, needs-work behaviours, and the family roster." },
    ],
  }),
});

const PALETTE: PastelKey[] = ["sky", "butter", "sage", "blush", "lilac", "sand", "foam"];
const EMOJI_POOL_CHORE = ["🛏️","🪥","🌙","👕","🍽️","🧸","🎒","📖","🥣","🐾","🌱","🧺","🚿","🧹","🧼","🚮"];
const EMOJI_POOL_SKILL_POS = ["🛡️","💗","💬","🤝","👣","🚩","⏰","👂","🤲","🌟","🌈","✨"];
const EMOJI_POOL_SKILL_NEG = ["✋","💢","⏸️","🌫️","🙁","😾","🚫"];

function pickIcon(pool: string[]) {
  return pool[Math.floor(Math.random() * pool.length)];
}
function pickColor(): PastelKey {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function LibraryPage() {
  const { chores, skills, kids, addChore, addSkill, removeChore, removeSkill, addKid } = useApp();
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work" | "family">("chores");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">Add, remove, and generate icons for anything your family tracks.</p>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
        {[
          { k: "chores", label: "Chores" },
          { k: "positive", label: "Positive" },
          { k: "needs-work", label: "Needs work" },
          { k: "family", label: "Family" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chores" && (
        <ItemManager
          items={chores.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, points: c.points }))}
          onAdd={(name, points) =>
            addChore({ name, icon: pickIcon(EMOJI_POOL_CHORE), color: pickColor(), points, recurrence: "none" })
          }
          onRemove={removeChore}
          addLabel="+ Add chore"
        />
      )}
      {tab === "positive" && (
        <ItemManager
          items={skills.filter((s) => s.isPositive).map((s) => ({ id: s.id, name: s.name, icon: s.icon, color: s.color, points: s.points }))}
          onAdd={(name, points) =>
            addSkill({ name, icon: pickIcon(EMOJI_POOL_SKILL_POS), color: pickColor(), points, isPositive: true })
          }
          onRemove={removeSkill}
          addLabel="+ Add positive skill"
        />
      )}
      {tab === "needs-work" && (
        <ItemManager
          items={skills.filter((s) => !s.isPositive).map((s) => ({ id: s.id, name: s.name, icon: s.icon, color: s.color, points: s.points }))}
          onAdd={(name) =>
            addSkill({ name, icon: pickIcon(EMOJI_POOL_SKILL_NEG), color: pickColor(), points: -1, isPositive: false })
          }
          onRemove={removeSkill}
          addLabel="+ Add behaviour"
          muted
          defaultPoints={-1}
        />
      )}
      {tab === "family" && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Each kid can take home a printable weekly chart — colour it in by hand, and points
              still get tapped into the app as usual.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {kids.map((k) => (
                <KidChartCard key={k.id} kid={k} />
              ))}
            </div>
          </div>
          <AddKidForm onAdd={addKid} />
        </div>
      )}
    </div>
  );
}

type Item = { id: string; name: string; icon: string; color: PastelKey; points: number };

function ItemManager({
  items, onAdd, onRemove, addLabel, muted = false, defaultPoints = 1,
}: {
  items: Item[];
  onAdd: (name: string, points: number) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  muted?: boolean;
  defaultPoints?: number;
}) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(defaultPoints);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    // Simulate the icon generation call so the UX matches the spec's flow.
    await new Promise((r) => setTimeout(r, 500));
    onAdd(name.trim(), points);
    setName("");
    setPoints(defaultPoints);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card-soft p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Put away dishes"
            className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-20 mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground font-display font-bold text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {busy ? "Generating icon…" : addLabel}
        </button>
      </form>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-6 justify-items-center">
        {items.map((it) => (
          <div key={it.id} className="relative group">
            <IconTile icon={it.icon} label={it.name} color={it.color} points={it.points} muted={muted} />
            <button
              onClick={() => onRemove(it.id)}
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddKidForm({
  onAdd,
}: {
  onAdd: (name: string, color: PastelKey, companionId?: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<PastelKey>("sky");
  const [companionId, setCompanionId] = useState<string>(COMPANIONS[0].id);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), color, companionId);
        setName("");
      }}
      className="card-soft p-4 space-y-4"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Kid's name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground"
          />
        </div>
        <div className="flex gap-2">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
              style={{ backgroundColor: `var(--pastel-${c})` }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pick a mascot
        </label>
        <div className="mt-2 grid grid-cols-4 sm:grid-cols-8 gap-2">
          {COMPANIONS.map((c) => {
            const url = companionArtUrl(c.id);
            const selected = companionId === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCompanionId(c.id)}
                className={`aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition ${
                  selected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105"
                    : "hover:scale-105 opacity-80"
                }`}
                style={{ backgroundColor: `var(--pastel-${c.color})` }}
                aria-label={c.name}
                title={`${c.name} — ${c.trait}`}
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-2xl">{c.symbol}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold">
          Add kid
        </button>
      </div>
    </form>
  );
}
