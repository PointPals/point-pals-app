import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { IconTile } from "@/components/IconTile";
import { KidChartCard } from "@/components/KidChartCard";
import { CompanionPicker } from "@/components/CompanionPicker";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { PastelKey } from "@/lib/mock-data";
import { COMPANIONS, PASTEL_HEX } from "@/lib/mock-data";
import { ICON_KEYS } from "@/lib/icons";
import { Trash2, Sparkles, Pencil, X, Check } from "lucide-react";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — PointPals" },
      {
        name: "description",
        content: "Manage chores, positive skills, needs-work behaviours, and the family roster.",
      },
    ],
  }),
});

const PALETTE: PastelKey[] = ["sky", "butter", "sage", "blush", "lilac", "sand", "foam"];

// New items get a real icon-pack tile (i00–i65), not an emoji, so the printable
// chart and tiles render a proper illustration. A deterministic hash of the
// name keeps the same chore looking consistent run-to-run.
function pickIconForName(name: string): string {
  if (ICON_KEYS.length === 0) return "i00";
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ICON_KEYS[Math.abs(h) % ICON_KEYS.length];
}
function pickColor(): PastelKey {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

function LibraryPage() {
  const {
    chores,
    skills,
    kids,
    addChore,
    addSkill,
    updateChore,
    updateSkill,
    removeChore,
    removeSkill,
  } = useApp();
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work" | "family">("chores");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, and remove anything your family tracks.
        </p>
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
            className={`tap px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chores" && (
        <ItemManager
          items={chores.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            points: c.points,
          }))}
          onAdd={(name, points, color) =>
            addChore({ name, icon: pickIconForName(name), color, points, recurrence: "none" })
          }
          onUpdate={(id, patch) => updateChore(id, patch)}
          onRemove={removeChore}
          addLabel="Add chore"
          pointsMin={1}
          pointsMax={20}
          defaultPoints={1}
        />
      )}
      {tab === "positive" && (
        <ItemManager
          items={skills
            .filter((s) => s.isPositive)
            .map((s) => ({
              id: s.id,
              name: s.name,
              icon: s.icon,
              color: s.color,
              points: s.points,
            }))}
          onAdd={(name, points, color) =>
            addSkill({ name, icon: pickIconForName(name), color, points, isPositive: true })
          }
          onUpdate={(id, patch) => updateSkill(id, patch)}
          onRemove={removeSkill}
          addLabel="Add positive skill"
          pointsMin={1}
          pointsMax={20}
          defaultPoints={2}
        />
      )}
      {tab === "needs-work" && (
        <ItemManager
          items={skills
            .filter((s) => !s.isPositive)
            .map((s) => ({
              id: s.id,
              name: s.name,
              icon: s.icon,
              color: s.color,
              points: s.points,
            }))}
          onAdd={(name, points, color) =>
            addSkill({ name, icon: pickIconForName(name), color, points, isPositive: false })
          }
          onUpdate={(id, patch) => updateSkill(id, patch)}
          onRemove={removeSkill}
          addLabel="Add behaviour"
          muted
          pointsMin={-20}
          pointsMax={-1}
          defaultPoints={-1}
        />
      )}
      {tab === "family" && <FamilyTab />}
    </div>
  );
}

type Item = { id: string; name: string; icon: string; color: PastelKey; points: number };
type ItemPatch = { name?: string; points?: number; color?: PastelKey };

function ItemManager({
  items,
  onAdd,
  onUpdate,
  onRemove,
  addLabel,
  muted = false,
  pointsMin,
  pointsMax,
  defaultPoints,
}: {
  items: Item[];
  onAdd: (name: string, points: number, color: PastelKey) => void;
  onUpdate: (id: string, patch: ItemPatch) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  muted?: boolean;
  pointsMin: number;
  pointsMax: number;
  defaultPoints: number;
}) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(defaultPoints);
  const [color, setColor] = useState<PastelKey>("sky");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clampPoints = (n: number) => Math.max(pointsMin, Math.min(pointsMax, n));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    onAdd(name.trim(), clampPoints(points), color);
    setName("");
    setPoints(defaultPoints);
    setColor("sky");
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card-soft p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Put away dishes"
              className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Points
            </label>
            <input
              type="number"
              min={pointsMin}
              max={pointsMax}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-20 mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground font-display font-bold text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="tap rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {busy ? "Adding…" : addLabel}
          </button>
        </div>
        <div className="flex gap-2">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
              style={{ backgroundColor: PASTEL_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>
      </form>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-6 justify-items-center">
        {items.map((it) => (
          <div key={it.id} className="w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setEditingId(editingId === it.id ? null : it.id)}
              className="tap relative"
              aria-label={`Edit ${it.name}`}
            >
              <IconTile
                icon={it.icon}
                label={it.name}
                color={it.color}
                points={it.points}
                muted={muted}
              />
              <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        ))}
      </div>

      {editingId && (
        <EditPanel
          item={items.find((i) => i.id === editingId)!}
          pointsMin={pointsMin}
          pointsMax={pointsMax}
          onSave={(patch) => {
            onUpdate(editingId, patch);
            setEditingId(null);
          }}
          onDelete={() => {
            const it = items.find((i) => i.id === editingId);
            if (it && window.confirm(`Delete "${it.name}"?`)) {
              onRemove(editingId);
              setEditingId(null);
            }
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function EditPanel({
  item,
  pointsMin,
  pointsMax,
  onSave,
  onDelete,
  onCancel,
}: {
  item: Item;
  pointsMin: number;
  pointsMax: number;
  onSave: (patch: ItemPatch) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [points, setPoints] = useState(item.points);
  const [color, setColor] = useState<PastelKey>(item.color);

  // Re-sync when a different item opens the panel.
  useEffect(() => {
    setName(item.name);
    setPoints(item.points);
    setColor(item.color);
  }, [item.id, item.name, item.points, item.color]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const clamp = (n: number) => Math.max(pointsMin, Math.min(pointsMax, n));

  return (
    <div className="card-soft p-5 space-y-4 border-2 border-foreground/10 animate-pop-in">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Edit “{item.name}”</h3>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="tap text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Points
          </label>
          <input
            type="number"
            min={pointsMin}
            max={pointsMax}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-24 mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground font-display font-bold text-2xl"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Colour
        </label>
        <div className="flex gap-2 mt-2">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
              style={{ backgroundColor: PASTEL_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onDelete}
          className="tap inline-flex items-center gap-1.5 rounded-full border border-destructive/40 text-destructive px-4 py-2 text-sm font-semibold hover:bg-destructive/10 transition"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="tap text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              name.trim() && onSave({ name: name.trim(), points: clamp(points), color })
            }
            disabled={!name.trim()}
            className="tap inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function FamilyTab() {
  const { kids, addKid, updateKid, removeKid } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Each kid can take home a printable weekly chart — colour it in by hand, and points still get
        tapped into the app as usual. Tap a kid to edit their name, colour, or mascot.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kids.map((k) => (
          <div key={k.id} className="relative">
            <KidChartCard kid={k} />
            <button
              onClick={() => setEditingId(k.id)}
              aria-label={`Edit ${k.name}`}
              className="tap absolute top-2 right-2 w-8 h-8 rounded-full bg-card border border-border shadow flex items-center justify-center"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {editingId && (
        <KidForm
          key={editingId}
          initial={kids.find((k) => k.id === editingId)}
          onSubmit={(name, color, companionId) => {
            updateKid(editingId, { name, color, companionId });
            setEditingId(null);
          }}
          onDelete={() => {
            const k = kids.find((x) => x.id === editingId);
            if (
              k &&
              window.confirm(
                `Remove ${k.name} from the family? Their points and history will be deleted.`,
              )
            ) {
              removeKid(editingId);
              setEditingId(null);
            }
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {!editingId &&
        (adding ? (
          <KidForm
            onSubmit={(name, color, companionId) => {
              addKid(name, color, companionId);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="tap w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition"
          >
            + Add a kid
          </button>
        ))}
    </div>
  );
}

function KidForm({
  initial,
  onSubmit,
  onDelete,
  onCancel,
}: {
  initial?: { id: string; name: string; color: PastelKey; companionId?: string };
  onSubmit: (name: string, color: PastelKey, companionId: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<PastelKey>(initial?.color ?? "sky");
  const [companionId, setCompanionId] = useState<string>(initial?.companionId ?? COMPANIONS[0].id);
  const editing = !!initial;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name.trim(), color, companionId);
      }}
      className="card-soft p-4 space-y-4 animate-pop-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">
          {editing ? `Edit ${initial!.name}` : "Add a kid"}
        </h3>
        <div
          className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: PASTEL_HEX[color] }}
        >
          <CompanionAvatar
            seed={initial?.id ?? "new"}
            color={color}
            size={40}
            companionId={companionId}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Kid's name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
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
              style={{ backgroundColor: PASTEL_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <CompanionPicker value={companionId} onChange={setCompanionId} />

      <div className="flex items-center justify-between pt-1">
        {editing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-destructive/40 text-destructive px-4 py-2 text-sm font-semibold hover:bg-destructive/10 transition"
          >
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="tap text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="tap rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {editing ? "Save changes" : "Add kid"}
          </button>
        </div>
      </div>
    </form>
  );
}
