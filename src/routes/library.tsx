import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-store";
import { IconTile } from "@/components/IconTile";
import { KidChartCard } from "@/components/KidChartCard";
import { CompanionPicker } from "@/components/CompanionPicker";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Chore, PastelKey } from "@/lib/mock-data";
import { COMPANIONS, PASTEL_HEX } from "@/lib/mock-data";
import { ICON_KEYS } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Sparkles, Pencil, X, Check, Wand2 } from "lucide-react";

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
        <ChoreManager
          chores={chores}
          addChore={addChore}
          updateChore={updateChore}
          removeChore={removeChore}
        />
      )}
      {tab === "positive" && (
        <SkillManager
          skills={skills.filter((s) => s.isPositive)}
          addSkill={(name, points, color) =>
            addSkill({ name, icon: pickIconForName(name), color, points, isPositive: true })
          }
          updateSkill={updateSkill}
          removeSkill={removeSkill}
          addLabel="Add positive skill"
          pointsMin={1}
          pointsMax={20}
          defaultPoints={2}
        />
      )}
      {tab === "needs-work" && (
        <SkillManager
          skills={skills.filter((s) => !s.isPositive)}
          addSkill={(name, points, color) =>
            addSkill({ name, icon: pickIconForName(name), color, points, isPositive: false })
          }
          updateSkill={updateSkill}
          removeSkill={removeSkill}
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

// ─── Chore Manager ───────────────────────────────────────────────────────────

type ChoreItem = {
  id: string;
  name: string;
  icon: string;
  color: PastelKey;
  points: number;
  tags: string[];
};

type ItemPatch = { name?: string; points?: number; color?: PastelKey; tags?: string[] };

function ChoreManager({
  chores,
  addChore,
  updateChore,
  removeChore,
}: {
  chores: { id: string; name: string; icon: string; color: PastelKey; points: number; tags: string[] }[];
  addChore: (c: Omit<Chore, "id">) => void;
  updateChore: (id: string, patch: ItemPatch) => void;
  removeChore: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(1);
  const [color, setColor] = useState<PastelKey>("sky");
  const [tagsStr, setTagsStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const [aiPanel, setAiPanel] = useState(false);

  const clampPoints = (n: number) => Math.max(1, Math.min(20, n));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    addChore({
      name: name.trim(),
      icon: pickIconForName(name.trim()),
      color,
      points: clampPoints(points),
      recurrence: "none",
      tags,
    });
    setName("");
    setPoints(1);
    setColor("sky");
    setTagsStr("");
    setBusy(false);
  };

  // Auto-scroll edit panel into view on mobile
  useEffect(() => {
    if (editingId && editPanelRef.current) {
      setTimeout(() => {
        editPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [editingId]);

  return (
    <div className="space-y-6">
      {/* Add form */}
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
              min={1}
              max={20}
              value={points}
              onChange={(e) => setPoints(clampPoints(Number(e.target.value)))}
              className="w-20 mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground font-display font-bold text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="tap rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {busy ? "Adding…" : "Add chore"}
          </button>
          <button
            type="button"
            onClick={() => setAiPanel(!aiPanel)}
            className="tap rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:bg-muted transition"
          >
            <Wand2 className="w-4 h-4" />
            AI icon
          </button>
        </div>

        {/* AI icon generation panel */}
        {aiPanel && (
          <AiIconPanel
            householdId={useApp().household.id}
            onSelect={(iconUrl) => {
              // icon will be used by caller after add
              setAiPanel(false);
            }}
            onClose={() => setAiPanel(false)}
          />
        )}

        <div className="flex flex-wrap gap-2 items-center">
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
          <div className="flex-1 min-w-[160px] ml-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tags
            </label>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. Must Do, Morning"
              className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground text-sm"
            />
          </div>
        </div>
      </form>

      {chores.length === 0 && (
        <div className="card-soft px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing here yet — add your first chore above to start tracking it.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-6 justify-items-center">
        {chores.map((it) => (
          <div key={it.id} className="w-full flex flex-col items-center">
            <div className="tap relative">
              <IconTile
                icon={it.icon}
                label={it.name}
                color={it.color}
                points={it.points}
                onClick={() => setEditingId(editingId === it.id ? null : it.id)}
                selected={editingId === it.id}
              />
              <span
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <Pencil className="w-3.5 h-3.5" />
              </span>
              {it.tags && it.tags.length > 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-card/90 px-1.5 py-0.5 rounded-full border border-border whitespace-nowrap">
                  {it.tags[0]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingId && (() => {
        const item = chores.find((i) => i.id === editingId);
        if (!item) return null;
        return (
          <div ref={editPanelRef}>
            <EditPanel
              item={item}
              pointsMin={1}
              pointsMax={20}
              onSave={(patch) => {
                updateChore(editingId, patch);
                setEditingId(null);
              }}
              onDelete={() => {
                if (item && window.confirm(`Delete "${item.name}"?`)) {
                  removeChore(editingId);
                  setEditingId(null);
                }
              }}
              onCancel={() => setEditingId(null)}
            />
          </div>
        );
      })()}
    </div>
  );
}

// ─── Skill Manager ───────────────────────────────────────────────────────────

type SkillItem = {
  id: string;
  name: string;
  icon: string;
  color: PastelKey;
  points: number;
};

function SkillManager({
  skills,
  addSkill,
  updateSkill,
  removeSkill,
  addLabel,
  muted = false,
  pointsMin,
  pointsMax,
  defaultPoints,
}: {
  skills: SkillItem[];
  addSkill: (name: string, points: number, color: PastelKey) => void;
  updateSkill: (id: string, patch: ItemPatch) => void;
  removeSkill: (id: string) => void;
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
  const editPanelRef = useRef<HTMLDivElement>(null);
  const [aiPanel, setAiPanel] = useState(false);

  const clampPoints = (n: number) => Math.max(pointsMin, Math.min(pointsMax, n));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    addSkill(name.trim(), clampPoints(points), color);
    setName("");
    setPoints(defaultPoints);
    setColor("sky");
    setBusy(false);
  };

  useEffect(() => {
    if (editingId && editPanelRef.current) {
      setTimeout(() => {
        editPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [editingId]);

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
          <button
            type="button"
            onClick={() => setAiPanel(!aiPanel)}
            className="tap rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold flex items-center gap-2 hover:bg-muted transition"
          >
            <Wand2 className="w-4 h-4" />
            AI icon
          </button>
        </div>

        {aiPanel && (
          <AiIconPanel
            householdId={useApp().household.id}
            onSelect={() => setAiPanel(false)}
            onClose={() => setAiPanel(false)}
          />
        )}

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

      {skills.length === 0 && (
        <div className="card-soft px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing here yet — add your first one above to start tracking it.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-6 justify-items-center">
        {skills.map((it) => (
          <div key={it.id} className="w-full flex flex-col items-center">
            <div className="tap relative">
              <IconTile
                icon={it.icon}
                label={it.name}
                color={it.color}
                points={it.points}
                muted={muted}
                onClick={() => setEditingId(editingId === it.id ? null : it.id)}
                selected={editingId === it.id}
              />
              <span
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <Pencil className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {editingId && (() => {
        const item = skills.find((i) => i.id === editingId);
        if (!item) return null;
        return (
          <div ref={editPanelRef}>
            <EditPanel
              item={item}
              pointsMin={pointsMin}
              pointsMax={pointsMax}
              onSave={(patch) => {
                updateSkill(editingId, patch);
                setEditingId(null);
              }}
              onDelete={() => {
                if (item && window.confirm(`Delete "${item.name}"?`)) {
                  removeSkill(editingId);
                  setEditingId(null);
                }
              }}
              onCancel={() => setEditingId(null)}
              tags={false}
            />
          </div>
        );
      })()}
    </div>
  );
}

// ─── AI Icon Generation Panel ────────────────────────────────────────────────

function AiIconPanel({
  householdId,
  onSelect,
  onClose,
}: {
  householdId: string;
  onSelect: (iconUrl: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-icon", {
        body: { householdId, prompt: prompt.trim() },
      });
      if (fnErr) throw fnErr;
      if (data.error) throw new Error(data.error);
      console.log("Icon generated:", data);
      setResult(data.storagePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card-soft p-4 space-y-3 border border-dashed border-muted-foreground/30 animate-pop-in">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Wand2 className="w-4 h-4" /> Generate icon with AI
        </h4>
        <button onClick={onClose} className="tap text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe the icon you want — e.g. "a dog brushing its teeth"
      </p>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the icon..."
          className="flex-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground text-sm"
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />
        <button
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="tap rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          {generating ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <p className="text-xs text-sage-foreground">
          Icon generated! (path: {result})
        </p>
      )}
    </div>
  );
}

// ─── Edit Panel (shared between chores & skills) ──────────────────────────────

function EditPanel({
  item,
  pointsMin,
  pointsMax,
  onSave,
  onDelete,
  onCancel,
  tags: showTags = true,
}: {
  item: { id: string; name: string; icon: string; color: PastelKey; points: number; tags?: string[] };
  pointsMin: number;
  pointsMax: number;
  onSave: (patch: ItemPatch) => void;
  onDelete: () => void;
  onCancel: () => void;
  tags?: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [points, setPoints] = useState(item.points);
  const [color, setColor] = useState<PastelKey>(item.color);
  const [tagsStr, setTagsStr] = useState((item.tags ?? []).join(", "));

  useEffect(() => {
    setName(item.name);
    setPoints(item.points);
    setColor(item.color);
    setTagsStr((item.tags ?? []).join(", "));
  }, [item.id, item.name, item.points, item.color, item.tags]);

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
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!isNaN(n)) setPoints(clamp(n));
            }}
            className="w-24 mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground font-display font-bold text-2xl"
          />
        </div>
      </div>

      {showTags && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tags
          </label>
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="e.g. Must Do, Morning"
            className="w-full mt-1 bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground text-sm"
          />
        </div>
      )}

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
            onClick={() => {
              if (!name.trim()) return;
              const patch: ItemPatch = { name: name.trim(), points: clamp(points), color };
              if (showTags) {
                patch.tags = tagsStr
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
              }
              onSave(patch);
            }}
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

// ─── Family Tab ──────────────────────────────────────────────────────────────

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
