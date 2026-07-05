// Photo memory wall (§4) — the emotional/memory-keeping layer
//
// v2: Audio support, likes, comments, single-screen composer.
// Images are downscaled client-side (max 1600px, JPEG) before storing.
// Audio is captured via MediaRecorder, optionally transcribed via edge function.

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export type Memory = {
  id: string;
  url: string; // convenience: first media url (or "") — prefer `media` for multi-image
  caption: string;
  kidIds: string[];
  createdAt: number;
  remote: boolean;
  kind?: "image" | "video"; // convenience: first media kind
  storagePath?: string; // convenience: first media path
  media: MemoryMedia[]; // full list — up to 10 items, empty for caption/voice-only
  audioUrl?: string; // signed URL for audio playback
  audioPath?: string; // storage path
};

export type MemoryMedia = {
  url: string; // signed URL (remote) or data URL (local)
  kind: "image" | "video";
  path?: string; // storage path (remote only)
};

export type MemoryMediaInput = { path: string; kind: "image" | "video" };

export type MemoryLikeEntry = {
  postId: string;
  userId: string;
  createdAt: number;
};

export type MemoryCommentEntry = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: number;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------------------------------------------------------------------------
// IndexedDB (local fallback)
// ---------------------------------------------------------------------------

const DB_NAME = "pointpals";
const STORE = "memories";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(m: Memory): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(m);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(): Promise<Memory[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as Memory[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Image downscaling
// ---------------------------------------------------------------------------

const MAX_DIM = 1600;

async function downscale(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
  return { blob, dataUrl };
}

// ---------------------------------------------------------------------------
// Remote (Supabase) path — best-effort with a short timeout
// ---------------------------------------------------------------------------

const REMOTE_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), REMOTE_TIMEOUT_MS)),
  ]);
}

const SIGNED_TTL = 60 * 60; // 1 hour

async function signedUrl(path: string): Promise<string> {
  const { data, error } = await withTimeout(
    db.storage.from("memories").createSignedUrl(path, SIGNED_TTL),
  );
  if (error || !data?.signedUrl) throw error ?? new Error("could not sign url");
  return data.signedUrl;
}

// The bucket's RLS policies grant access by the first folder segment
// (is_member(foldername[1])), so every object path MUST start with the
// household id — bare root-level paths are silently denied in live mode.
async function remoteUpload(
  id: string,
  householdId: string,
  medias: { blob: Blob; kind: "image" | "video"; contentType: string; ext: string }[],
  caption: string,
  kidIds: string[],
): Promise<{ media: MemoryMedia[] }> {
  const uploaded: MemoryMedia[] = [];
  for (let i = 0; i < medias.length; i++) {
    const m = medias[i];
    const suffix = medias.length > 1 ? `_${i}` : "";
    const path = `${householdId}/${id}${suffix}.${m.ext}`;
    const up = await withTimeout(
      db.storage.from("memories").upload(path, m.blob, { contentType: m.contentType }),
    );
    if (up.error) throw up.error;
    uploaded.push({ url: await signedUrl(path), kind: m.kind, path });
  }
  const first = uploaded[0];
  const ins = await withTimeout(
    Promise.resolve(
      db.from("memory_posts").insert({
        id,
        household_id: householdId,
        storage_path: first?.path ?? null,
        media_type: first?.kind ?? null,
        media_paths: uploaded.map((u) => ({ path: u.path, kind: u.kind })),
        caption,
      }),
    ),
  );
  if (ins.error) throw ins.error;
  if (kidIds.length > 0) {
    await withTimeout(
      Promise.resolve(
        db.from("memory_post_kids").insert(kidIds.map((kidId) => ({ post_id: id, kid_id: kidId }))),
      ),
    ).catch(() => {});
  }
  return { media: uploaded };
}

/** Upload an audio blob to storage (household-prefixed — see RLS note above). */
async function remoteUploadAudio(
  householdId: string,
  blob: Blob,
): Promise<{ path: string; signedUrl: string }> {
  const id = uid();
  const path = `${householdId}/audio/${id}.webm`;
  const up = await withTimeout(
    db.storage.from("memories").upload(path, blob, { contentType: "audio/webm" }),
  );
  if (up.error) throw up.error;
  const url = await signedUrl(path);
  return { path, signedUrl: url };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let memories: Memory[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function sortWall(list: Memory[]): Memory[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

async function loadOnce() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const local = await idbAll();
    memories = sortWall(local);
    emit();
  } catch {
    /* IndexedDB unavailable */
  }

  try {
    const res = await withTimeout(
      Promise.resolve(
        db
          .from("memory_posts")
          .select("id, storage_path, media_type, media_paths, caption, audio_path, created_at"),
      ),
    );
    if (!res.error && res.data) {
      type Row = {
        id: string;
        storage_path: string | null;
        media_type: "image" | "video" | null;
        media_paths: MemoryMediaInput[] | null;
        caption: string | null;
        audio_path: string | null;
        created_at: string;
      };
      // Also fetch kid tags
      const { data: kidLinks } = await withTimeout(
        Promise.resolve(db.from("memory_post_kids").select("post_id, kid_id")),
      ).catch(() => ({ data: null }));
      const tagMap: Record<string, string[]> = {};
      if (kidLinks) {
        (kidLinks as { post_id: string; kid_id: string }[]).forEach((k) => {
          (tagMap[k.post_id] ??= []).push(k.kid_id);
        });
      }

      const remote: Memory[] = await Promise.all(
        (res.data as Row[]).map(async (r) => {
          // Prefer media_paths (multi-image), fall back to legacy single storage_path
          const list: MemoryMediaInput[] =
            Array.isArray(r.media_paths) && r.media_paths.length > 0
              ? r.media_paths
              : r.storage_path
                ? [{ path: r.storage_path, kind: r.media_type ?? "image" }]
                : [];
          const media: MemoryMedia[] = await Promise.all(
            list.map(async (item) => ({
              url: await signedUrl(item.path).catch(() => ""),
              kind: item.kind,
              path: item.path,
            })),
          );
          const first = media[0];
          return {
            id: r.id,
            url: first?.url ?? "",
            caption: r.caption ?? "",
            kidIds: tagMap[r.id] ?? [],
            createdAt: new Date(r.created_at).getTime(),
            remote: true,
            kind: first?.kind,
            storagePath: first?.path,
            media,
            audioPath: r.audio_path ?? undefined,
            audioUrl: r.audio_path ? await signedUrl(r.audio_path).catch(() => undefined) : undefined,
          };
        }),
      );
      const localIds = new Set(memories.map((m) => m.id));
      memories = sortWall([...memories, ...remote.filter((m) => !localIds.has(m.id))]);
      emit();
    }
  } catch {
    /* offline / backend not wired */
  }
}

const MAX_MEDIA_ITEMS = 10;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function addMemory(
  householdId: string,
  files: File[],
  caption: string,
  kidIds: string[],
  audioBlob?: Blob,
): Promise<Memory> {
  const id = uid();

  // Prepare each media item: images are downscaled, short videos pass
  // through as-is. Caption-/voice-only posts have an empty list.
  const clipped = files.slice(0, MAX_MEDIA_ITEMS);
  const medias: { blob: Blob; kind: "image" | "video"; contentType: string; ext: string }[] = [];
  const localMedia: MemoryMedia[] = [];
  for (const file of clipped) {
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) throw new Error("video too large");
      const ext = file.type.includes("mp4") ? "mp4" : "webm";
      medias.push({ blob: file, kind: "video", contentType: file.type, ext });
      localMedia.push({ url: await fileToDataUrl(file), kind: "video" });
    } else {
      const { blob, dataUrl } = await downscale(file);
      medias.push({ blob, kind: "image", contentType: "image/jpeg", ext: "jpg" });
      localMedia.push({ url: dataUrl, kind: "image" });
    }
  }

  let memory: Memory;
  try {
    let audioPath: string | undefined;
    let audioUrl: string | undefined;
    if (audioBlob) {
      const aud = await remoteUploadAudio(householdId, audioBlob);
      audioPath = aud.path;
      audioUrl = aud.signedUrl;
    }
    const up = await remoteUpload(id, householdId, medias, caption, kidIds);
    if (audioPath) {
      await withTimeout(
        Promise.resolve(db.from("memory_posts").update({ audio_path: audioPath }).eq("id", id)),
      ).catch(() => {});
    }
    const first = up.media[0];
    memory = {
      id,
      url: first?.url ?? "",
      caption,
      kidIds,
      createdAt: Date.now(),
      remote: true,
      kind: first?.kind,
      storagePath: first?.path,
      media: up.media,
      audioPath,
      audioUrl,
    };
  } catch {
    // Offline / backend unreachable: keep it locally, voice note included, so
    // nothing the child just said is silently dropped.
    let audioUrl: string | undefined;
    if (audioBlob) audioUrl = await fileToDataUrl(audioBlob).catch(() => undefined);
    const first = localMedia[0];
    memory = {
      id,
      url: first?.url ?? "",
      caption,
      kidIds,
      createdAt: Date.now(),
      remote: false,
      kind: first?.kind,
      media: localMedia,
      audioUrl,
    };
  }

  try {
    await idbPut(memory);
  } catch {
    /* session-only */
  }
  memories = sortWall([memory, ...memories]);
  emit();
  return memory;
}

export async function removeMemory(id: string): Promise<void> {
  const target = memories.find((m) => m.id === id);
  memories = memories.filter((m) => m.id !== id);
  emit();
  try {
    await idbDelete(id);
  } catch {
    /* ignore */
  }
  if (target?.remote) {
    try {
      await withTimeout(Promise.resolve(db.from("memory_posts").delete().eq("id", id)));
      const paths = (target.media ?? [])
        .map((m) => m.path)
        .filter((p): p is string => !!p);
      if (paths.length === 0 && target.storagePath) paths.push(target.storagePath);
      if (paths.length > 0) {
        await withTimeout(db.storage.from("memories").remove(paths)).catch(() => {});
      }
      if (target.audioPath) {
        await withTimeout(db.storage.from("memories").remove([target.audioPath])).catch(() => {});
      }
    } catch {
      /* best-effort */
    }
  }
}

/** Transcribe a recording via the transcribe-memory edge function. The raw
 *  transcript comes back verbatim (no auto-correction) and lands in the
 *  caption field for the parent to edit — or leave exactly as spoken. */
export async function transcribeAudio(
  blob: Blob,
  householdId: string,
  durationSec?: number,
): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  const { data, error } = await supabase.functions.invoke("transcribe-memory", {
    body: {
      householdId,
      audioBase64: btoa(bin),
      mimeType: blob.type || "audio/webm",
      durationSec,
    },
  });
  if (error) throw new Error(error.message || "Transcription failed");
  const out = data as { text?: string; error?: string } | null;
  if (out?.error) throw new Error(out.error);
  return out?.text ?? "";
}

/** Toggle a like (returns new state) */
export async function toggleLike(postId: string, userId: string, liked: boolean): Promise<boolean> {
  if (liked) {
    const { error } = await db
      .from("memory_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) console.error("Failed to unlike:", error.message);
    return false;
  } else {
    const { error } = await db.from("memory_likes").insert({ post_id: postId, user_id: userId });
    if (error) console.error("Failed to like:", error.message);
    return true;
  }
}

/** Add a comment */
export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const { error } = await db.from("memory_comments").insert({
    post_id: postId,
    user_id: userId,
    body,
  });
  if (error) throw error;
}

/** Fetch like count + comments for a post */
export async function fetchPostFeedback(postId: string): Promise<{
  likeCount: number;
  likedByMe: boolean;
  comments: MemoryCommentEntry[];
}> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  const [likes, comments] = await Promise.all([
    db.from("memory_likes").select("user_id").eq("post_id", postId),
    db
      .from("memory_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
  ]);
  const likeRows = (likes.data ?? []) as { user_id: string }[];
  const commentRows = (comments.data ?? []) as {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
  }[];
  return {
    likeCount: likeRows.length,
    likedByMe: uid ? likeRows.some((l) => l.user_id === uid) : false,
    comments: commentRows.map((c) => ({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      body: c.body,
      createdAt: new Date(c.created_at).getTime(),
    })),
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void loadOnce();
  return () => listeners.delete(cb);
}

const EMPTY: Memory[] = [];

export function useMemories(): Memory[] {
  return useSyncExternalStore(
    subscribe,
    () => memories,
    () => EMPTY,
  );
}
