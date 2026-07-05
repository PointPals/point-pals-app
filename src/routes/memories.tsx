import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useMemories, addMemory, removeMemory } from "@/lib/memories";
import { PASTEL_HEX } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { trackParent } from "@/lib/analytics";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
  head: () => ({
    meta: [
      { title: "Memories — PointPals" },
      {
        name: "description",
        content: "Your family's photo memory wall — little moments, kept.",
      },
    ],
  }),
});

// The family memory wall (§4) — a story archive, not an activity log. Parents
// add a photo, an optional caption, and tag which kids are in it; the wall
// shows everything chronologically, most recent first.
function MemoriesPage() {
  const { kids } = useApp();
  const wall = useMemories();

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Memories</h1>
        <p className="text-sm text-muted-foreground">
          Little moments, kept. Add a photo and tag who was there.
        </p>
      </div>

      <Composer />

      {wall.length === 0 ? (
        <div className="card-soft text-center px-6 py-12">
          <Camera className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-3 font-display text-xl font-bold">No memories yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The first tidy room, a brave moment, a pancake morning — add a photo above and start
            your family's story.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {wall.map((m) => {
            const tagged = kids.filter((k) => m.kidIds.includes(k.id));
            return (
              <li key={m.id} className="card-soft overflow-hidden">
                <img
                  src={m.url}
                  alt={m.caption || "Family memory"}
                  className="w-full max-h-[70vh] object-cover"
                  loading="lazy"
                />
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {m.caption && <p className="text-sm leading-snug">{m.caption}</p>}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {tagged.map((k) => (
                        <span
                          key={k.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted pl-0.5 pr-2 py-0.5 text-xs font-semibold"
                        >
                          <span
                            className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center"
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
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span>
                      {!m.remote && (
                        <span
                          className="text-[10px] uppercase tracking-wide text-muted-foreground/70"
                          title="Saved on this device; syncs when the backend is connected"
                        >
                          on this device
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this memory?")) void removeMemory(m.id);
                    }}
                    aria-label="Delete memory"
                    className="shrink-0 h-9 w-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Composer() {
  const { kids } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const toggleTag = (id: string) =>
    setTaggedIds((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));

  const reset = () => {
    pick(null);
    setCaption("");
    setTaggedIds([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      await addMemory(file, caption.trim(), taggedIds);
      trackParent("memory_added", { tagged: taggedIds.length, has_caption: caption.trim() !== "" });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-soft p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition"
        >
          <ImagePlus className="h-5 w-5" /> Add a photo
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-72 object-cover rounded-2xl"
              />
            )}
            <button
              onClick={reset}
              aria-label="Remove photo"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            maxLength={140}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {kids.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Who's in it?</div>
              <div className="flex flex-wrap gap-2">
                {kids.map((k) => {
                  const on = taggedIds.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      onClick={() => toggleTag(k.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-sm font-semibold transition border ${
                        on
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-input hover:bg-muted"
                      }`}
                    >
                      <span
                        className="h-6 w-6 rounded-full overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: PASTEL_HEX[k.color] }}
                      >
                        <CompanionAvatar
                          seed={k.id}
                          color={k.color}
                          size={24}
                          companionId={k.companionId}
                        />
                      </span>
                      {k.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => void save()}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Save memory
          </button>
        </div>
      )}
    </section>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
