import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { IconTile } from "@/components/IconTile";
import { KidChartCard } from "@/components/KidChartCard";
import { CompanionPicker } from "@/components/CompanionPicker";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Chore, PastelKey } from "@/lib/mock-data";
import { COMPANIONS, PASTEL_HEX } from "@/lib/mock-data";
import { ICON_KEYS, iconUrl, storageUrl } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Pencil, X, Check, Wand2, Upload, Image } from "lucide-react";

function IconPickerGrid({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const { household } = useApp();
  const [aiOpen, setAiOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [userIcons, setUserIcons] = useState<
    { id: string; storagePath: string; label: string }[]
  >([]);
  const [loadingIcons, setLoadingIcons] = useState(true);

  // Fetch custom icons for this household
  useEffect(() => {
    if (!household?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingIcons(true);
      // @ts-expect-error - user_icons not in supabase types
const { data, error } = await (supabase.from("user_icons") as any)
        .select("id, storage_path, label")
        .eq("household_id", household.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled && !error && data) {
        setUserIcons(
          data.map((r: { id: string; storage_path: string; label: string }) => ({
            id: r.id,
            storagePath: r.storage_path,
            label: r.label,
          })),
        );
      }
      if (!cancelled) setLoadingIcons(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [household?.id]);

  const hasUserIcons = userIcons.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Icon
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setUploadOpen((v) => !v);
              if (!uploadOpen) setAiOpen(false);
            }}
            className={`tap text-[11px] font-semibold flex items-center gap-1 ${
              uploadOpen
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-3 h-3" />
            {uploadOpen ? "Close" : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAiOpen((v) => !v);
              if (!aiOpen) setUploadOpen(false);
            }}
            className={`tap text-[11px] font-semibold flex items-center gap-1 ${
              aiOpen
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wand2 className="w-3 h-3" />
            {aiOpen ? "Close" : "AI generate"}
          </button>
        </div>
      </div>

      {uploadOpen && (
        <UploadIconPanel
          onComplete={(url) => {
            onSelect(url);
            setUploadOpen(false);
            // Refetch user icons so the new one appears immediately
            if (household?.id) {
              // @ts-expect-error
              (supabase.from("user_icons") as any)
                .select("id, storage_path, label")
                .eq("household_id", household.id)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
                .limit(50)
                .then(({ data, error }: { data: any; error: any }) => {
                  if (!error && data) {
                    setUserIcons(
                      data.map(
                        (r: { id: string; storage_path: string; label: string }) => ({
                          id: r.id,
                          storagePath: r.storage_path,
                          label: r.label,
                        }),
                      ),
                    );
                  }
                });
            }
          }}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {aiOpen && (
        <AiIconPanel
          onSelect={(url) => {
            onSelect(url);
            setAiOpen(false);
          }}
          onClose={() => setAiOpen(false)}
        />
      )}

      <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-2">
        {/* User-uploaded icons (shown at the top) */}
        {loadingIcons && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Loading custom icons…
          </div>
        )}
        {hasUserIcons && (
          <>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-2 pb-2 border-b border-border/40">
              {userIcons.map((u) => {
                const url = storageUrl(u.storagePath);
                const on = selected === url;
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => onSelect(url)}
                    aria-pressed={on}
                    title={u.label || "Custom icon"}
                    className={`tap aspect-square rounded-xl bg-card flex items-center justify-center transition ${
                      on
                        ? "ring-2 ring-foreground scale-95"
                        : "hover:scale-105 border border-border/60"
                    }`}
                  >
                    <img
                      src={url}
                      alt={u.label || "Custom icon"}
                      className="w-[86%] h-[86%] object-contain pointer-events-none"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Registry icons */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
          {ICON_KEYS.map((k) => {
            const on = selected === k;
            return (
              <button
                type="button"
                key={k}
                onClick={() => onSelect(k)}
                aria-pressed={on}
                aria-label={`Icon ${k}`}
                className={`tap aspect-square rounded-xl bg-card flex items-center justify-center transition ${
                  on
                    ? "ring-2 ring-foreground scale-95"
                    : "hover:scale-105 border border-border/60"
                }`}
              >
                <img
                  src={iconUrl(k)}
                  alt=""
                  aria-hidden
                  className="w-[86%] h-[86%] object-contain pointer-events-none"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Points — PointPals" },
      {
        name: "description",
        content: "Manage chores, positive skills, needs-work behaviours, and the family roster.",
      },
    ],
  }),
});

const PALETTE: PastelKey[] = ["sky", "butter", "sage", "blush", "lilac", "sand", "foam"];

function pickIconForName(name: string): string {
  if (ICON_KEYS.length === 0) return "make-bed.png";
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
    household,
    addChore,
    addSkill,
    updateChore,
    updateSkill,
    removeChore,
    removeSkill,
  } = useApp();
  const { canEdit, role } = useHouseholdRole(household.id);
  const [tab, setTab] = useState<"chores" | "positive" | "needs-work" | "family">("chores");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Points</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, and remove anything your family tracks.
        </p>
      </div>

      {!canEdit && role && (
        <div className="card-soft px-4 py-3 text-sm border border-butter/60 bg-butter/20">
          <strong className="font-semibold">View only.</strong> Only admins and parents can edit
          chores, skills, and the family roster. Ask a household admin to change your role.
        </div>
      )}

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
            className={`tap inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold transition ${
              tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={canEdit ? "" : "pointer-events-none opacity-60 select-none"}
        aria-disabled={!canEdit}
      >
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
            addSkill={(name, points, color, icon) =>
              addSkill({ name, icon: icon ?? pickIconForName(name), color, points, isPositive: true })
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
            addSkill={(name, points, color, icon) =>
              addSkill({ name, icon: icon ?? pickIconForName(name), color, points, isPositive: false })
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

type ItemPatch = {
  name?: string;
  points?: number;
  color?: PastelKey;
  tags?: string[];
  assignedKidIds?: string[] | null;
};

// Mini avatar stack shown on narrowed chores/skills in the list view, so a
// parent can tell at a glance which items are limited without opening each one.
// Universal items (no allow-list) get nothing extra.
function AssignedStack({ assignedKidIds }: { assignedKidIds?: string[] | null }) {
  const { kids } = useApp();
  if (!assignedKidIds?.length) return null;
  const assigned = kids.filter((k) => assignedKidIds.includes(k.id));
  if (assigned.length === 0) return null;
  return (
    <span
      className="absolute -top-1 -left-1 flex -space-x-1.5"
      title={`Only for ${assigned.map((k) => k.name).join(", ")}`}
    >
      {assigned.slice(0, 3).map((k) => (
        <span
          key={k.id}
          className="h-5 w-5 rounded-full border-2 border-card overflow-hidden flex items-center justify-center shadow-sm"
          style={{ backgroundColor: PASTEL_HEX[k.color] }}
        >
          <CompanionAvatar seed={k.id} color={k.color} size={16} companionId={k.companionId} />
        </span>
      ))}
      {assigned.length > 3 && (
        <span className="h-5 w-5 rounded-full border-2 border-card bg-muted text-[9px] font-bold flex items-center justify-center">
          +{assigned.length - 3}
        </span>
      )}
    </span>
  );
}

// "Applies to" chip row inside the edit panel. All kids ticked = universal and
// saves as null (so kids added to the household later are included); only a
// deliberate deselection produces an explicit static allow-list.
function AppliesToChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (kidId: string) => void;
}) {
  const { kids } = useApp();
  if (kids.length === 0) return null;
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Applies to
      </label>
      <div className="flex flex-wrap gap-2 mt-2">
        {kids.map((k) => {
          const on = selected.includes(k.id);
          return (
            <button
              type="button"
              key={k.id}
              onClick={() => onToggle(k.id)}
              aria-pressed={on}
              className={`tap inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-sm font-semibold border transition ${
                on
                  ? "bg-foreground text-background border-foreground"
                  : "border-input text-muted-foreground hover:bg-muted"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: PASTEL_HEX[k.color] }}
              >
                <CompanionAvatar
                  seed={k.id}
                  color={k.color}
                  size={20}
                  companionId={k.companionId}
                />
              </span>
              {k.name}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {selected.length === 0
          ? "Pick at least one kid."
          : "Everyone ticked = applies to the whole family, including kids you add later."}
      </p>
    </div>
  );
}

function ChoreManager({
  chores,
  addChore,
  updateChore,
  removeChore,
}: {
  chores: {
    id: string;
    name: string;
    icon: string;
    color: PastelKey;
    points: number;
    tags: string[];
    assignedKidIds?: string[] | null;
  }[];
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
  const [icon, setIcon] = useState<string | null>(null);

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
      icon: icon ?? pickIconForName(name.trim()),
      color,
      points: clampPoints(points),
      recurrence: "none",
      tags,
    });
    setName("");
    setPoints(1);
    setColor("sky");
    setTagsStr("");
    setIcon(null);
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
            {busy ? "Adding…" : "Add chore"}
          </button>
        </div>

        <IconPickerGrid selected={icon} onSelect={setIcon} />

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
              <AssignedStack assignedKidIds={it.assignedKidIds} />
              {it.tags && it.tags.length > 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-card/90 px-1.5 py-0.5 rounded-full border border-border whitespace-nowrap">
                  {it.tags[0]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingId &&
        (() => {
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
  assignedKidIds?: string[] | null;
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
  addSkill: (name: string, points: number, color: PastelKey, icon?: string) => void;
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
  const [icon, setIcon] = useState<string | null>(null);

  const clampPoints = (n: number) => Math.max(pointsMin, Math.min(pointsMax, n));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    addSkill(name.trim(), clampPoints(points), color, icon ?? undefined);
    setName("");
    setPoints(defaultPoints);
    setColor("sky");
    setIcon(null);
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
            {busy ? "Adding…" : addLabel}
          </button>
        </div>

        <IconPickerGrid selected={icon} onSelect={setIcon} />

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
              <AssignedStack assignedKidIds={it.assignedKidIds} />
            </div>
          </div>
        ))}
      </div>

      {editingId &&
        (() => {
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
  onSelect,
  onClose,
}: {
  onSelect: (iconUrl: string) => void;
  onClose: () => void;
}) {
  const { household } = useApp();
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
        body: { householdId: household.id, prompt: prompt.trim() },
      });
      if (fnErr) throw fnErr;
      if (data.error) throw new Error(data.error);
      console.log("Icon generated:", data);
      setResult(data.url ?? data.storagePath);
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
          {generating ? <span className="animate-spin">⟳</span> : <Wand2 className="w-3.5 h-3.5" />}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={result}
            alt="Generated icon"
            className="w-24 h-24 rounded-xl object-contain border border-border"
          />
          <button
            onClick={() => {
              onSelect(result);
              onClose();
            }}
            className="tap rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-semibold"
          >
            Use this icon
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Edit Panel (shared between chores & skills) ──────────────────────────────


// ─── Upload Icon Panel ────────────────────────────────

function UploadIconPanel({
  onComplete,
  onClose,
}: {
  onComplete: (iconUrl: string) => void;
  onClose: () => void;
}) {
  const { household } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setResult(null);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    if (!selectedFile || !household?.id) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      // Read the file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const dataUrl = r.result as string;
          const comma = dataUrl.indexOf(",");
          resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
        };
        r.onerror = () => reject(new Error("Failed to read file"));
        r.readAsDataURL(selectedFile);
      });

      const { data, error: fnErr } = await supabase.functions.invoke("upload-icon", {
        body: {
          householdId: household.id,
          imageBase64: base64,
          mimeType: selectedFile.type || "image/jpeg",
          label: label.trim() || undefined,
        },
      });
      if (fnErr) throw fnErr;
      if (data.error) throw new Error(data.error);
      console.log("Icon uploaded:", data);
      setResult(data.url ?? data.storagePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card-soft p-4 space-y-3 border border-dashed border-muted-foreground/30 animate-pop-in">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload your own icon
        </h4>
        <button onClick={onClose} className="tap text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pick a photo of anything — we’ll strip the background and turn it into an icon.
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="tap w-full rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground hover:border-foreground hover:text-foreground transition flex flex-col items-center gap-2"
        >
          <Image className="w-8 h-8" />
          <span className="text-sm font-semibold">Tap to choose a photo</span>
          <span className="text-xs">Works best with a clear subject on a plain background</span>
        </button>
      )}

      {preview && (
        <div className="flex flex-col items-center gap-3">
          <img src={preview} alt="Preview" className="max-h-40 rounded-xl object-contain border border-border" />
          {!result && !uploading && (
            <div className="w-full space-y-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Name this icon (optional)"
                className="w-full bg-transparent border-b border-border py-1.5 focus:outline-none focus:border-foreground text-sm text-center"
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    setLabel("");
                  }}
                  className="tap rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
                >
                  Remove
                </button>
                <button
                  onClick={upload}
                  className="tap rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold flex items-center gap-1.5"
                >
                  {uploading ? <span className="animate-spin">⟳</span> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Processing…" : "Upload & clean"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {uploading && !result && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <span className="animate-spin">⟳</span> Removing background…
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col items-center gap-2">
          <img src={result} alt="Cleaned icon" className="w-24 h-24 rounded-xl object-contain border border-border" />
          <button
            onClick={() => {
              onComplete(result);
            }}
            className="tap rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-semibold"
          >
            Use this icon
          </button>
        </div>
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
  tags: showTags = true,
}: {
  item: {
    id: string;
    name: string;
    icon: string;
    color: PastelKey;
    points: number;
    tags?: string[];
    assignedKidIds?: string[] | null;
  };
  pointsMin: number;
  pointsMax: number;
  onSave: (patch: ItemPatch) => void;
  onDelete: () => void;
  onCancel: () => void;
  tags?: boolean;
}) {
  const { kids } = useApp();
  const allKidIds = kids.map((k) => k.id);
  // No allow-list = universal = every chip ticked.
  const initialAssigned = item.assignedKidIds?.length ? item.assignedKidIds : allKidIds;
  const [name, setName] = useState(item.name);
  const [points, setPoints] = useState(item.points);
  const [color, setColor] = useState<PastelKey>(item.color);
  const [tagsStr, setTagsStr] = useState((item.tags ?? []).join(", "));
  const [assigned, setAssigned] = useState<string[]>(initialAssigned);

  useEffect(() => {
    setName(item.name);
    setPoints(item.points);
    setColor(item.color);
    setTagsStr((item.tags ?? []).join(", "));
    setAssigned(item.assignedKidIds?.length ? item.assignedKidIds : kids.map((k) => k.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.name, item.points, item.color, item.tags, item.assignedKidIds]);

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

      <AppliesToChips
        selected={assigned}
        onToggle={(kidId) =>
          setAssigned((prev) =>
            prev.includes(kidId) ? prev.filter((k) => k !== kidId) : [...prev, kidId],
          )
        }
      />

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
              if (!name.trim() || assigned.length === 0) return;
              const patch: ItemPatch = { name: name.trim(), points: clamp(points), color };
              if (showTags) {
                patch.tags = tagsStr
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
              }
              // "Everyone still ticked" persists as null (universal), NOT as an
              // explicit list of today's kids — otherwise a chore nobody meant
              // to narrow would skip any kid added to the household later.
              patch.assignedKidIds = allKidIds.every((id) => assigned.includes(id))
                ? null
                : assigned;
              onSave(patch);
            }}
            disabled={!name.trim() || assigned.length === 0}
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
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[15%] sm:pt-[8%] px-4 animate-pop-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingId(null);
          }}
        >
          <div className="w-full max-w-md">
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
          </div>
        </div>
      )}

      {/* Correction tool — manual points adjustment */}
      <CorrectionSection kids={kids} />

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

// ─── Correction Tool ─────────────────────────────────────────────────────

function CorrectionSection({
  kids,
}: {
  kids: {
    id: string;
    name: string;
    currentPoints: number;
    allTimePoints: number;
    color: string;
    companionId?: string;
  }[];
}) {
  const { correctPoints } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deltaStr, setDeltaStr] = useState("0");
  const [reason, setReason] = useState("");

  const confirm = (id: string) => {
    const delta = parseInt(deltaStr, 10);
    if (isNaN(delta) || delta === 0) return;
    const kid = kids.find((k) => k.id === id);
    if (!kid) return;
    const next = Math.max(0, kid.currentPoints + delta);
    if (
      !window.confirm(
        `Change ${kid.name}'s points by ${delta > 0 ? "+" : ""}${delta} to ${next}?${
          reason ? ` Reason: "${reason}"` : ""
        } This fixes both the current total and the all-time record.`,
      )
    )
      return;
    // Adjusts BOTH currentPoints and allTimePoints and logs a neutral
    // "correction" history entry — see app-store.correctPoints.
    correctPoints(id, delta, reason.trim() || undefined);
    setOpenId(null);
    setDeltaStr("0");
    setReason("");
  };

  return (
    <section className="card-soft p-5 space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <Pencil className="w-4 h-4" /> Correction tool
      </h3>
      <p className="text-xs text-muted-foreground">
        Adjust a kid's currentPoints directly. Use for offline work that wasn't tracked or to fix
        mistakes. All corrections are logged.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {kids.map((k) => {
          const editing = openId === k.id;
          return (
            <div key={k.id} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc",
                }}
              />
              {editing ? (
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <input
                    type="number"
                    value={deltaStr}
                    onChange={(e) => setDeltaStr(e.target.value)}
                    className="w-16 bg-transparent border-b border-border py-0.5 text-sm font-semibold text-center focus:outline-none focus:border-foreground"
                    placeholder="+/-"
                    autoFocus
                  />
                  <button
                    onClick={() => confirm(k.id)}
                    className="tap p-1 text-sage-foreground"
                    title="Apply"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOpenId(null)}
                    className="tap p-1 text-muted-foreground"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold truncate">{k.name}</span>
                  <span className="text-xs text-muted-foreground">{k.currentPoints}</span>
                  <button
                    onClick={() => {
                      setOpenId(k.id);
                      setDeltaStr("0");
                      setReason("");
                    }}
                    className="tap ml-auto text-muted-foreground hover:text-foreground"
                    title="Adjust points"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {openId && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </section>
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
