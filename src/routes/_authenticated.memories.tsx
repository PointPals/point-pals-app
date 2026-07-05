import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  Trash2,
  X,
  Mic,
  Square,
  Heart,
  MessageCircle,
  Check,
  Video,
} from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useHouseholdRole } from "@/lib/use-household-role";
import {
  useMemories,
  addMemory,
  removeMemory,
  toggleLike,
  addComment,
  fetchPostFeedback,
  transcribeAudio,
} from "@/lib/memories";
import type { MemoryCommentEntry } from "@/lib/memories";
import { PASTEL_HEX, type PastelKey } from "@/lib/mock-data";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { trackParent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/memories")({
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

// v2: quick child narration, not a voice memo — 90 s is plenty.
const MAX_RECORDING_SEC = 90;

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
          <strong className="font-semibold">View only.</strong> Ask a household admin for
          contributor access to add memories.
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
            <MemoryCard key={m.id} memory={m} kids={kids} canEdit={canEdit} userId={userId} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Single-screen Composer ────────────────────────────────────────────────

function Composer({
  householdId,
  kids,
}: {
  householdId: string;
  kids: { id: string; name: string; color: string; companionId?: string }[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  // v2 mic flow: transcription-to-caption is the PRIMARY path; keeping the raw
  // audio is a secondary, off-by-default extra.
  const [keepAudio, setKeepAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  // Teaser bar (default) vs. the full single-screen composer — tapping the
  // bar, or any of its icon pills, expands into the composer already built.
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const pickFile = useCallback(
    (f: File | null) => {
      if (preview) URL.revokeObjectURL(preview);
      setFile(f);
      setPreview(f ? URL.createObjectURL(f) : null);
    },
    [preview],
  );

  const toggleTag = (id: string) =>
    setTaggedIds((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]));

  const reset = () => {
    pickFile(null);
    setCaption("");
    setTaggedIds([]);
    setAudioBlob(null);
    setKeepAudio(false);
    setMicNote(null);
    setExpanded(false);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (videoRef.current) videoRef.current.value = "";
  };

  const openGallery = () => {
    setExpanded(true);
    inputRef.current?.click();
  };
  const openCamera = () => {
    setExpanded(true);
    cameraRef.current?.click();
  };
  const openMicFromTeaser = () => {
    setExpanded(true);
    void startRecording();
  };

  const canPost = file !== null || caption.trim().length > 0 || (audioBlob !== null && keepAudio);

  // ── Voice recording (v2): the child narrates the photo; the recording is
  // transcribed straight into the caption for the parent to tidy — or leave
  // exactly as spoken. ──

  const startRecording = async () => {
    setMicNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      audioChunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mr.mimeType });
        const duration = durationRef.current;
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingDuration(0);
        setRecording(false);
        // Primary path: transcribe into the caption. Deliberately verbatim —
        // typos and all, that's often the whole charm — the parent can edit.
        setTranscribing(true);
        transcribeAudio(blob, householdId, duration)
          .then((text) => {
            if (text) {
              setCaption((c) => (c.trim() ? `${c.trim()} ${text}` : text));
              setMicNote(null);
            } else {
              setMicNote("Nothing heard — try again a little closer to the phone.");
            }
          })
          .catch(() => {
            // Transcription unavailable (offline / not configured): keep the
            // recording attached instead so the child's words aren't lost.
            setKeepAudio(true);
            setMicNote("Couldn't transcribe right now — the recording is attached instead.");
          })
          .finally(() => setTranscribing(false));
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
      let sec = 0;
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        sec++;
        durationRef.current = sec;
        setRecordingDuration(sec);
        if (sec >= MAX_RECORDING_SEC && mr.state !== "inactive") {
          mr.stop();
        }
      }, 1000);
    } catch {
      // Permission denied or unsupported
      setMicNote("Microphone access is needed to record — please allow it and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setKeepAudio(false);
    setMicNote(null);
  };

  const save = async () => {
    if (!canPost || saving) return;
    setSaving(true);
    try {
      await addMemory(
        householdId,
        file,
        caption.trim(),
        taggedIds,
        keepAudio && audioBlob ? audioBlob : undefined,
      );
      trackParent("memory_added", {
        tagged: taggedIds.length,
        has_caption: caption.trim() !== "",
        has_audio: keepAudio && !!audioBlob,
        has_media: !!file,
      });
      reset();
    } catch {
      setMicNote("Couldn't save that — if it was a video, keep it under 50 MB.");
    } finally {
      setSaving(false);
    }
  };

  const isVideo = file?.type.startsWith("video/") ?? false;

  return (
    <section className="card-soft p-4 space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {!expanded ? (
        // Persistent teaser bar — an always-visible entry point at the top of
        // the feed, rather than relying solely on a floating action button.
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(true)}
          className="tap w-full flex items-center gap-2 rounded-full border border-input bg-muted/40 pl-4 pr-1.5 py-1.5 hover:bg-muted/60 transition cursor-text"
        >
          <span className="flex-1 text-sm text-muted-foreground">What&apos;s happening?</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openGallery();
              }}
              className="tap rounded-full p-2 bg-sky/40 hover:bg-sky/60 transition"
              aria-label="Add a photo"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              className="tap rounded-full p-2 bg-butter/40 hover:bg-butter/60 transition"
              aria-label="Camera"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openMicFromTeaser();
              }}
              className="tap rounded-full p-2 bg-blush/40 hover:bg-blush/60 transition"
              aria-label="Record a voice note"
            >
              <Mic className="h-4 w-4" />
            </button>
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {file && (
            <div className="relative">
              {preview &&
                (isVideo ? (
                  <video
                    src={preview}
                    controls
                    playsInline
                    className="w-full max-h-72 rounded-2xl bg-foreground/5"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-72 object-cover rounded-2xl"
                  />
                ))}
              <button
                onClick={() => pickFile(null)}
                aria-label="Remove media"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Caption — transcribed narration lands here, editable */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={transcribing ? "Listening back…" : "What's happening?"}
            rows={1}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[42px]"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {/* Recording overlay — phrased for the child, who's the one talking */}
          {recording && (
            <div className="rounded-2xl bg-blush/30 border border-blush px-4 py-3 flex items-center gap-3 animate-pop-in">
              <span className="h-3 w-3 rounded-full bg-destructive animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  What's happening here? Tell me about it!
                </div>
                <div className="text-xs text-muted-foreground">
                  Recording {formatDuration(recordingDuration)} · up to{" "}
                  {formatDuration(MAX_RECORDING_SEC)}
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="tap rounded-full px-4 py-2 bg-destructive text-destructive-foreground text-sm font-semibold flex items-center gap-1.5"
                title="Stop recording"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Done
              </button>
            </div>
          )}

          {transcribing && (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Turning their words into the caption…
            </div>
          )}
          {micNote && !transcribing && (
            <div className="text-xs text-muted-foreground">{micNote}</div>
          )}

          {/* Secondary, off by default: keep the raw recording too — a small
              voice at this age is often the more precious artifact. */}
          {audioBlob && !recording && !transcribing && (
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={keepAudio}
                onChange={(e) => setKeepAudio(e.target.checked)}
                className="accent-foreground"
              />
              Keep the audio too ({Math.round(audioBlob.size / 1024)} KB)
              <button
                onClick={removeAudio}
                aria-label="Discard recording"
                className="tap text-destructive hover:text-destructive/80"
              >
                <X className="w-3 h-3" />
              </button>
            </label>
          )}

          {/* Bottom action row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Media buttons */}
            <button
              onClick={() => inputRef.current?.click()}
              className="tap rounded-full p-2.5 bg-sky/40 hover:bg-sky/60 transition"
              title="Gallery"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              className="tap rounded-full p-2.5 bg-butter/40 hover:bg-butter/60 transition"
              title="Camera"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              className="tap rounded-full p-2.5 bg-sage/40 hover:bg-sage/60 transition"
              title="Video"
            >
              <Video className="h-5 w-5" />
            </button>

            {/* Microphone — hand the phone to the child and let them narrate */}
            {recording ? (
              <button
                onClick={stopRecording}
                className="tap rounded-full p-2.5 bg-destructive text-destructive-foreground animate-pulse"
                title="Stop recording"
              >
                <Square className="h-5 w-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={transcribing}
                className="tap rounded-full p-2.5 bg-blush/40 hover:bg-blush/60 transition disabled:opacity-50"
                title="Let them tell the story"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}

            {/* Tag kids — inline popover */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowTagSheet(!showTagSheet)}
                className={`tap rounded-full px-3 py-2 text-sm font-semibold border transition flex items-center gap-1.5 ${
                  taggedIds.length > 0
                    ? "bg-foreground text-background border-foreground"
                    : "border-input hover:bg-muted"
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
                            style={{
                              backgroundColor:
                                PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc",
                            }}
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
                            style={{
                              backgroundColor:
                                PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc",
                            }}
                          >
                            <CompanionAvatar
                              seed={k.id}
                              color={k.color as PastelKey}
                              size={24}
                              companionId={k.companionId}
                            />
                          </span>
                          <span className="flex-1 text-left">{k.name}</span>
                          {on && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setShowTagSheet(false)}
                      className="w-full text-center text-xs text-muted-foreground pt-2 mt-1 border-t border-border"
                    >
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
  memory: {
    id: string;
    url: string;
    caption: string;
    kidIds: string[];
    createdAt: number;
    remote: boolean;
    kind?: "image" | "video";
    audioUrl?: string;
  };
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
  // Seesaw-style overflow: first two tagged kids inline, the rest behind a
  // tappable "and N more" that expands in place (never a new screen).
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tagged = kids.filter((k) => memory.kidIds.includes(k.id));
  const shown = tagsExpanded ? tagged : tagged.slice(0, 2);
  const overflow = tagged.length - 2;

  // Load likes/comments on mount (for remote posts)
  useEffect(() => {
    if (memory.remote && !feedbackLoaded) {
      fetchPostFeedback(memory.id)
        .then((fb) => {
          setLiked(fb.likedByMe);
          setLikeCount(fb.likeCount);
          setComments(fb.comments);
          setFeedbackLoaded(true);
        })
        .catch(() => setFeedbackLoaded(true));
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
    } catch {
      /* comment failed — leave the text so the user can retry */
    }
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
    audio
      .play()
      .then(() => setAudioPlaying(true))
      .catch(() => {});
  };

  return (
    <li className="card-soft overflow-hidden">
      {/* Restyled header: a single stacked-avatar cluster on the left, a
          two-line text block on the right (bold name(s), date right-aligned
          on the same row; a lighter sync-status line below when relevant).
          Tagged kids are still the post's identity, never the uploading
          parent — same data, just a cleaner arrangement. */}
      <div className="px-4 py-3 flex items-start gap-3 border-b border-border/40">
        <div className="flex -space-x-2 shrink-0">
          {tagged.length > 0 ? (
            tagged.slice(0, 3).map((k) => (
              <span
                key={k.id}
                className="h-9 w-9 rounded-full border-2 border-card overflow-hidden flex items-center justify-center"
                style={{
                  backgroundColor: PASTEL_HEX[k.color as keyof typeof PASTEL_HEX] ?? "#ccc",
                }}
              >
                <CompanionAvatar
                  seed={k.id}
                  color={k.color as PastelKey}
                  size={32}
                  companionId={k.companionId}
                />
              </span>
            ))
          ) : (
            <span className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
              ?
            </span>
          )}
          {tagged.length > 3 && (
            <span className="h-9 w-9 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[11px] font-bold">
              +{tagged.length - 3}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold truncate flex items-baseline gap-1.5 min-w-0">
              <span className="truncate">
                {tagged.length === 0
                  ? "The whole family"
                  : shown.map((k) => k.name).join(tagged.length > 2 ? ", " : " & ")}
              </span>
              {!tagsExpanded && overflow > 0 && (
                <button
                  onClick={() => setTagsExpanded(true)}
                  className="tap text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
                >
                  and {overflow} more
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDateTime(memory.createdAt)}
            </span>
          </div>
          {!memory.remote && (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">
              Not yet synced
            </div>
          )}
        </div>

        {canEdit && (
          <button
            onClick={() => {
              if (window.confirm("Delete this memory?")) void removeMemory(memory.id);
            }}
            aria-label="Delete memory"
            className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Media (image, video, or none for caption/voice-only posts) */}
      {memory.url &&
        (memory.kind === "video" ? (
          <video
            src={memory.url}
            controls
            playsInline
            className="w-full max-h-[70vh] bg-foreground/5"
          />
        ) : (
          <img
            src={memory.url}
            alt={memory.caption || "Family memory"}
            className="w-full max-h-[70vh] object-cover"
            loading="lazy"
          />
        ))}

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
                <span
                  className="w-0.5 bg-foreground rounded-full animate-soundbar"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-0.5 bg-foreground rounded-full animate-soundbar"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-0.5 bg-foreground rounded-full animate-soundbar"
                  style={{ animationDelay: "300ms" }}
                />
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
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleComment();
                  }}
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
    </li>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(ts: number) {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  const time = d
    .toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
  return `${date}, ${time}`;
}
