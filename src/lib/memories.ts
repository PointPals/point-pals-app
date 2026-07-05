// Photo memory wall (§4) — the emotional/memory-keeping layer, separate from
// the points mechanic. One record per photo: kid tags, optional caption,
// timestamp. Chronological, most recent first.
//
// Storage strategy: photos belong in the Supabase Storage `memories` bucket
// with one row per photo in the `memories` table (see
// supabase/migrations/0003_memories.sql). That path is attempted first. When
// Supabase isn't reachable (as in this build environment) or the write fails
// (e.g. auth not yet wired), the photo falls back to LOCAL storage — a data
// URL in IndexedDB — so the feature works fully offline and nothing is lost.
// Records carry a `remote` flag so a later sync pass can upload local-only
// photos once the backend is live.
//
// Images are downscaled client-side (max 1600px, JPEG) before storing, keeping
// both IndexedDB and future uploads lean.

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// The `memories` table isn't in the generated Database types yet (types can't
// be regenerated until the project is reachable — see 0003_memories.sql), so
// talk to it through an untyped client and keep the casts in one place.
const db = supabase as unknown as SupabaseClient;

export type Memory = {
  id: string;
  url: string; // public URL (remote) or data URL (local)
  caption: string;
  kidIds: string[];
  createdAt: number;
  remote: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------------------------------------------------------------------------
// IndexedDB (local fallback) — tiny promise wrapper, no dependency.
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
// Remote (Supabase) path — best-effort with a short timeout so a blocked
// network never makes the composer feel broken.
// ---------------------------------------------------------------------------

const REMOTE_TIMEOUT_MS = 6000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), REMOTE_TIMEOUT_MS)),
  ]);
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
  const { data: pub } = db.storage.from("memories").getPublicUrl(path);
  const ins = await withTimeout(
    Promise.resolve(
      db.from("memories").insert({
        id,
        household_id: householdId,
        storage_path: path,
        caption,
        kid_ids: kidIds,
      }),
    ),
  );
  if (ins.error) throw ins.error;
  return pub.publicUrl;
}

// ---------------------------------------------------------------------------
// Store — module-level list + subscribe, so every component sees one wall.
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
    /* IndexedDB unavailable (private mode etc.) — wall starts empty */
  }
  // Best-effort remote merge; ignored when unreachable/unauthenticated.
  try {
    const res = await withTimeout(
      Promise.resolve(db.from("memories").select("id, storage_path, caption, kid_ids, created_at")),
    );
    if (!res.error && res.data) {
      type Row = {
        id: string;
        storage_path: string;
        caption: string | null;
        kid_ids: string[] | null;
        created_at: string;
      };
      const remote: Memory[] = (res.data as Row[]).map((r) => ({
        id: r.id,
        url: db.storage.from("memories").getPublicUrl(r.storage_path).data.publicUrl,
        caption: r.caption ?? "",
        kidIds: r.kid_ids ?? [],
        createdAt: new Date(r.created_at).getTime(),
        remote: true,
      }));
      const localIds = new Set(memories.map((m) => m.id));
      memories = sortWall([...memories, ...remote.filter((m) => !localIds.has(m.id))]);
      emit();
    }
  } catch {
    /* offline / backend not wired — local wall stands alone */
  }
}

export async function addMemory(householdId: string, file: File, caption: string, kidIds: string[]): Promise<Memory> {
  const id = uid();
  const { blob, dataUrl } = await downscale(file);

  let memory: Memory;
  try {
    const url = await remoteUpload(id, householdId, blob, caption, kidIds);
    memory = { id, url, caption, kidIds, createdAt: Date.now(), remote: true };
  } catch {
    // Backend unreachable — keep the photo locally so nothing is lost.
    memory = { id, url: dataUrl, caption, kidIds, createdAt: Date.now(), remote: false };
  }

  try {
    await idbPut(memory);
  } catch {
    /* IndexedDB blocked — memory lives for this session only */
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
      await withTimeout(Promise.resolve(db.from("memories").delete().eq("id", id)));
      await withTimeout(db.storage.from("memories").remove([`${id}.jpg`]));
    } catch {
      /* backend unreachable — remote copy cleaned up on a later pass */
    }
  }
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
