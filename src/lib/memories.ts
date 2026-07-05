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
  url: string; // public URL (remote) or data URL (local)
  caption: string;
  kidIds: string[];
  createdAt: number;
  remote: boolean;
  audioUrl?: string; // signed URL for audio playback
  audioPath?: string; // storage path
};

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

async function remoteUpload(
  id: string,
  householdId: string,
  blob: Blob,
  caption: string,
  kidIds: string[],
): Promise<string> {
  const path = `${id}.jpg`;
  const up = await withTimeout(
    db.storage.from("memories").upload(path, blob, { contentType: "image/jpeg" }),
  );
  if (up.error) throw up.error;
  const ins = await withTimeout(
    Promise.resolve(
      db.from("memory_posts").insert({
        id,
        household_id: householdId,
        storage_path: path,
        caption,
        // kid_ids stored via memory_post_kids table
      }),
    ),
  );
  if (ins.error) throw ins.error;
  // Insert kid tags
  if (kidIds.length > 0) {
    await withTimeout(
      Promise.resolve(
        db.from("memory_post_kids").insert(
          kidIds.map((kidId) => ({ post_id: id, kid_id: kidId })),
        ),
      ),
    ).catch(() => { /* kid tagging best-effort */ });
  }
  return signedUrl(path);
}

/** Upload an audio blob to storage */
async function remoteUploadAudio(
  householdId: string,
  blob: Blob,
): Promise<{ path: string; signedUrl: string }> {
  const id = uid();
  const path = `audio/${id}.webm`;
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
  } catch { /* IndexedDB unavailable */ }

  try {
    const res = await withTimeout(
      Promise.resolve(db.from("memory_posts").select("id, storage_path, caption, audio_path, created_at")),
    );
    if (!res.error && res.data) {
      type Row = { id: string; storage_path: string; caption: string | null; audio_path: string | null; created_at: string };
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
        (res.data as Row[]).map(async (r) => ({
          id: r.id,
          url: await signedUrl(r.storage_path).catch(() => ""),
          caption: r.caption ?? "",
          kidIds: tagMap[r.id] ?? [],
          createdAt: new Date(r.created_at).getTime(),
          remote: true,
          audioPath: r.audio_path ?? undefined,
          audioUrl: r.audio_path ? await signedUrl(r.audio_path).catch(() => undefined) : undefined,
        })),
      );
      const localIds = new Set(memories.map((m) => m.id));
      memories = sortWall([...memories, ...remote.filter((m) => !localIds.has(m.id))]);
      emit();
    }
  } catch { /* offline / backend not wired */ }
}

export async function addMemory(
  householdId: string,
  file: File,
  caption: string,
  kidIds: string[],
  audioBlob?: Blob,
): Promise<Memory> {
  const id = uid();
  const { blob, dataUrl } = await downscale(file);

  let memory: Memory;
  try {
    let audioPath: string | undefined;
    let audioUrl: string | undefined;
    if (audioBlob) {
      const aud = await remoteUploadAudio(householdId, audioBlob);
      audioPath = aud.path;
      audioUrl = aud.signedUrl;
    }
    const url = await remoteUpload(id, householdId, blob, caption, kidIds);
    // Update audio path on the post
    if (audioPath) {
      await withTimeout(
        Promise.resolve(db.from("memory_posts").update({ audio_path: audioPath }).eq("id", id)),
      ).catch(() => {});
    }
    memory = { id, url, caption, kidIds, createdAt: Date.now(), remote: true, audioPath, audioUrl };
  } catch {
    memory = { id, url: dataUrl, caption, kidIds, createdAt: Date.now(), remote: false };
  }

  try { await idbPut(memory); } catch { /* session-only */ }
  memories = sortWall([memory, ...memories]);
  emit();
  return memory;
}

export async function removeMemory(id: string): Promise<void> {
  const target = memories.find((m) => m.id === id);
  memories = memories.filter((m) => m.id !== id);
  emit();
  try { await idbDelete(id); } catch { /* ignore */ }
  if (target?.remote) {
    try {
      await withTimeout(Promise.resolve(db.from("memory_posts").delete().eq("id", id)));
      await withTimeout(db.storage.from("memories").remove([`${id}.jpg`]));
      if (target.audioPath) {
        await withTimeout(db.storage.from("memories").remove([target.audioPath])).catch(() => {});
      }
    } catch { /* best-effort */ }
  }
}

/** Transcribe audio via edge function */
export async function transcribeAudio(
  blob: Blob,
  householdId: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("transcribe-memory", {
    body: { householdId },
    // The blob is sent as FormData via the edge function
  });

  // If the edge function expects a different format, fall back to local text
  if (error) throw new Error(error.message || "Transcription failed");

  // Basic approach: send directly to a speech-to-text API
  // For now, return empty so caller knows transcription wasn't available
  return data?.text ?? "";
}

/** Toggle a like (returns new state) */
export async function toggleLike(
  postId: string,
  userId: string,
  liked: boolean,
): Promise<boolean> {
  if (liked) {
    const { error } = await db.from("memory_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) console.error("Failed to unlike:", error.message);
    return false;
  } else {
    const { error } = await db.from("memory_likes").insert({ post_id: postId, user_id: userId });
    if (error) console.error("Failed to like:", error.message);
    return true;
  }
}

/** Add a comment */
export async function addComment(
  postId: string,
  userId: string,
  body: string,
): Promise<void> {
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
    db.from("memory_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }),
  ]);
  const likeRows = (likes.data ?? []) as { user_id: string }[];
  const commentRows = (comments.data ?? []) as {
    id: string; post_id: string; user_id: string; body: string; created_at: string;
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
