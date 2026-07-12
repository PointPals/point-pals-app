// Persisted household/device settings.
//
// These are device-local preferences (sound, haptics) plus a couple of
// parent-controlled options that also mirror to the household record when a
// backend is connected (sibling leaderboard — OFF by default per spec §4).
//
// Kept deliberately tiny and framework-light: a localStorage-backed store with
// a React hook via useSyncExternalStore so any component (settings screen,
// award loop, leaderboard) sees the same live value.

import { useSyncExternalStore } from "react";
import { feedbackPrefs } from "./feedback";

export type Settings = {
  sound: boolean;
  haptics: boolean;
  // Sibling leaderboard is parent-controlled and OFF by default. It's a recap,
  // never a live competitive ranking pushed at kids.
  leaderboard: boolean;
  // Reduce/skip the physics-y jar & confetti motion (also auto-honoured from
  // prefers-reduced-motion at the component level).
  reducedMotion: boolean;
  // Kids' view: a full-screen, read-only "how am I doing?" screen a child can
  // use to check the jars without being able to award points or leave the
  // page. `kidsViewActive` locks the app into it; `kidsViewPin` (4 digits, ""
  // = unset) is what a parent enters to exit. Device-local.
  kidsViewActive: boolean;
  kidsViewPin: string;
};

const DEFAULTS: Settings = {
  sound: true,
  haptics: true,
  leaderboard: false,
  reducedMotion: false,
  kidsViewActive: false,
  kidsViewPin: "",
};

const KEY = "pointpals.settings.v1";

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

let current: Settings = load();
syncFeedback(current);

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function syncFeedback(s: Settings) {
  feedbackPrefs.sound = s.sound;
  feedbackPrefs.haptics = s.haptics;
}

export function getSettings(): Settings {
  return current;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  current = { ...current, [key]: value };
  syncFeedback(current);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* storage full/blocked — settings stay in-memory for the session */
    }
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULTS);
}
