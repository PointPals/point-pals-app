import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, ImagePlus, Loader2, Trash2, X, Mic, Square, Heart, MessageCircle, Check } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import { useMemories, addMemory, removeMemory, toggleLike, addComment, fetchPostFeedback } from "@/lib/memories";
import type { MemoryCommentEntry } from "@/lib/memories";
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

const MAX_RECORDING_SEC = 120;

function MemoriesPage() {
  const { kids, household } = useApp();
  const { canAward, canEdit } = useHouseholdRole(household.id);
  const wall = useMemories();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setUserId(data.user.id);
      });
    });
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Memories</h1>
        <p className="text-sm text-muted-foreground">
          Little moments, kept. Add a photo and tag who was there.
        </p>
      </div>

      {canAward ? (
        <Composer householdId={household.id} kids={kids} />
      ) : (
        <div className="card-soft px-4 py-3 text-sm border border-butter/60 bg-butter/20">
          <strong className="font-semibold">View only.</strong>{" "}
          Ask a household admin for contributor access to add memories.
        </div>
      )}

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
          {wall.map((m) => (
            <MemoryCard
              key={m.id}
              memory={m}
              kids={kids}
              canEdit={canEdit}
              userId={userId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Single-screen Composer ────────────────────────────────────────────────

function Composer({ householdId, kids }: { householdId: string; kids: { id: string; name: string; color: string; companionId?: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickFile = useCallback((f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }, [preview]);

  const toggleTag = (id: string) =>
    setTaggedIds((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));

  const reset = () => {
    pickFile(null);
    setCaption("");
    setTaggedIds([]);
    setAudioBlob(null);
    setShowAudioOptions(false);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (videoRef.current) videoRef.current.value = "";
  };

  const canPost = file !== null || caption.trim().length > 0 || audioBlob !== null;

  // ── Voice recording ──

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      audioChunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mr.mimeType });
        setAudioBlob(blob);
        setShowAudioOptions(true);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingDuration(0);
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setRecordingDuration(sec);
        if (sec >= MAX_RECORDING_SEC && mr.state !== "inactive") {
          mr.stop();
        }
      }, 1000);
    } catch {
      // Permission denied or unsupported
      alert("Microphone access is needed to record audio. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setShowAudioOptions(false);
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      await addMemory(householdId, file, caption.trim(), taggedIds, audioBlob ?? undefined);
      trackParent("memory_added", { tagged: taggedIds.length, has_caption: caption.trim() !== "", has_audio: !!audioBlob });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-soft p-4 space-y-3">
      {/* Hidden file inputs */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />

      {!file ? (
        <div className="flex gap-2">
          <button onClick={() => inputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition">
            <ImagePlus className="h-5 w-5" /> Add a photo
          </button>
          <button onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-6 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition">
            <Camera className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            {preview && <img src={preview} alt="Preview" className="w-full max-h-72 object-cover rounded-2xl" />}
            <button onClick={reset} aria-label="Remove photo" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's happening?"
            rows={1}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[42px]"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {/* Bottom action row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Media buttons */}
            <button onClick={() => inputRef.current?.click()} className="tap rounded-full p-2 border border-input hover:bg-muted transition" title="Gallery">
              <ImagePlus className="h-5 w-5" />
            </button>
            <button onClick={() => cameraRef.current?.click()} className="tap rounded-full p-2 border border-input hover:bg-muted transition" title="Camera">
              <Camera className="h-5 w-5" />
            </button>

            {/* Microphone — voice recording */}
            {recording ? (
              <button onClick={stopRecording} className="tap rounded-full p-2 bg-destructive text-destructive-foreground animate-pulse" title="Stop recording">
                <Square className="h-5 w-5 fill-current" />
              </button>
            ) : (
              <button onClick={startRecording} className="tap rounded-full p-2 border border-input hover:bg-muted transition" title="Record voice note">
                <Mic className="h-5 w-5" />
              </button>
            )}

            {recording && (
              <span className="text-xs font-semibold text-destructive animate-pulse">
                Recording {formatDuration(recordingDuration)}
                {recordingDuration > 90 && <span className="text-foreground ml-1">({MAX_RECORDING_SEC - recordingDuration}s left)</span>}
              </span>
            )}

            {audioBlob && !recording && (
              <span className="text-xs font-semibold text-sage-foreground flex items-center gap-1">
                <Mic className="w-3 h-3" /> Audio attached ({Math.round(audioBlob.size / 1024)}KB)
                <button onClick={removeAudio} className="tap ml-1 text-destructive hover:text-destructive/80">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Tag kids — inline popover */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowTagSheet(!showTagSheet)}
                className={`tap rounded-full px-3 py-2 text-sm font-semibold border transition flex items-center gap-1.5 ${
                  taggedIds.length > 0 ? "bg-foreground text-background border-foreground" : "border-input hover:bg-muted"
                }`}
              >
                {taggedIds.length > 0 ? (
                  <>
                    <span className="flex -space-x-1">
                      {taggedIds.slice(0, 3).map((id) => {
                        const k = kids.find((x) => x.id === id);
                        if (!k) return null;
                        return (
                          <span
                            key={id}
                            className="w-4 h-4 rounded-full border border-background"
                            style={{ backgroundColor: PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc" }}
                          />
                        );
                      })}
                    </span>
                    <span>{taggedIds.length > 3 ? `${taggedIds.length}` : ""}</span>
                  </>
                ) : (
                  <>👤 Tag</>
                )}
              </button>

              {showTagSheet && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTagSheet(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-50 min-w-[200px] bg-card border border-border rounded-2xl shadow-xl p-3 space-y-1 animate-pop-in">
                    {kids.map((k) => {
                      const on = taggedIds.includes(k.id);
                      return (
                        <button
                          key={k.id}
                          onClick={() => toggleTag(k.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                            on ? "bg-foreground text-background" : "hover:bg-muted"
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                            style={{ backgroundColor: PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc" }}
                          >
                            <CompanionAvatar seed={k.id} color={k.color as string} size={24} companionId={k.companionId} />
                          </span>
                          <span className="flex-1 text-left">{k.name}</span>
                          {on && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                    <button onClick={() => setShowTagSheet(false)} className="w-full text-center text-xs text-muted-foreground pt-2 mt-1 border-t border-border">
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={() => void save()}
            disabled={!canPost || saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Post
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Memory Card (Seesaw-style) ────────────────────────────────────────────

function MemoryCard({
  memory,
  kids,
  canEdit,
  userId,
}: {
  memory: { id: string; url: string; caption: string; kidIds: string[]; createdAt: number; remote: boolean; audioUrl?: string };
  kids: { id: string; name: string; color: string; companionId?: string }[];
  canEdit: boolean;
  userId: string | null;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<MemoryCommentEntry[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tagged = kids.filter((k) => memory.kidIds.includes(k.id));

  // Load likes/comments on mount (for remote posts)
  useEffect(() => {
    if (memory.remote && !feedbackLoaded) {
      fetchPostFeedback(memory.id).then((fb) => {
        setLiked(fb.likedByMe);
        setLikeCount(fb.likeCount);
        setComments(fb.comments);
        setFeedbackLoaded(true);
      }).catch(() => setFeedbackLoaded(true));
    }
  }, [memory.id, memory.remote, feedbackLoaded]);

  const handleLike = async () => {
    if (!userId || !memory.remote) return;
    const nowLiked = await toggleLike(memory.id, userId, liked);
    setLiked(nowLiked);
    setLikeCount((c) => (nowLiked ? c + 1 : Math.max(0, c - 1)));
  };

  const handleComment = async () => {
    if (!userId || !commentText.trim() || !memory.remote) return;
    try {
      await addComment(memory.id, userId, commentText.trim());
      const fb = await fetchPostFeedback(memory.id);
      setComments(fb.comments);
      setCommentText("");
    } catch {}
  };

  const playAudio = () => {
    if (audioPlaying) {
      audioRef.current?.pause();
      setAudioPlaying(false);
      return;
    }
    if (!memory.audioUrl) return;
    const audio = new Audio(memory.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setAudioPlaying(false);
    audio.play().then(() => setAudioPlaying(true)).catch(() => {});
  };

  return (
    <li className="card-soft overflow-hidden">
      {/* Seesaw-style header: show tagged kids, not the poster */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border/40">
        <div className="flex -space-x-1.5">
          {tagged.length > 0 ? (
            tagged.slice(0, 4).map((k) => (
              <span
                key={k.id}
                className="h-8 w-8 rounded-full border-2 border-card overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc" }}
              >
                <CompanionAvatar seed={k.id} color={k.color} size={28} companionId={k.companionId} />
              </span>
            ))
          ) : (
            <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
              ?
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {tagged.length > 0
              ? tagged.map((k) => k.name).join(", ")
              : "Someone in the family"}
          </div>
          <div className="text-xs text-muted-foreground">
            {timeAgo(memory.createdAt)}
            {!memory.remote && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                · local
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { if (window.confirm("Delete this memory?")) void removeMemory(memory.id); }}
            aria-label="Delete memory"
            className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Image */}
      <img src={memory.url} alt={memory.caption || "Family memory"} className="w-full max-h-[70vh] object-cover" loading="lazy" />

      {/* Caption */}
      {memory.caption && (
        <div className="px-4 pt-3">
          <p className="text-sm leading-snug">{memory.caption}</p>
        </div>
      )}

      {/* Audio player */}
      {memory.audioUrl && (
        <div className="px-4 pt-2">
          <button
            onClick={playAudio}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-muted/80 transition"
          >
            {audioPlaying ? (
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-0.5 bg-foreground rounded-full animate-soundbar" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 bg-foreground rounded-full animate-soundbar" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 bg-foreground rounded-full animate-soundbar" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {audioPlaying ? "Playing..." : "Play voice note"}
          </button>
        </div>
      )}

      {/* Like + Comment row */}
      {memory.remote && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`tap inline-flex items-center gap-1.5 py-2 text-sm font-semibold transition ${liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="tap inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <MessageCircle className="w-4 h-4" />
              {comments.length > 0 && <span>{comments.length}</span>}
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <div className="pb-3 border-t border-border/40 pt-2 space-y-2">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">No comments yet.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-semibold">{c.userId.slice(0, 8)}</span>{" "}
                  <span>{c.body}</span>
                </div>
              ))}
              {userId && (
                <form
                  onSubmit={(e) => { e.preventDefault(); void handleComment(); }}
                  className="flex gap-2 pt-1"
                >
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-full bg-muted px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tagged kids inline (Seesaw-style overflow) */}
      {tagged.length > 4 && (
        <div className="px-4 pb-3 -mt-1">
          <span className="text-xs text-muted-foreground">
            and {tagged.length - 4} more
          </span>
        </div>
      )}
    </li>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
