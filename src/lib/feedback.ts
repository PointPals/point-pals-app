// Feedback layer — sound + haptics for the award loop and marble jar.
//
// Everything here is deliberately behind a thin, platform-neutral interface so a
// later Capacitor wrapper can swap the web implementations (Web Audio,
// navigator.vibrate) for native plugins (@capacitor/haptics, native audio)
// without touching call sites. See §8 (forward-compatibility) of the spec.
//
// Sound is generated with the Web Audio API (no asset downloads, tiny, and
// works offline in the service-worker cache). Tones are intentionally soft:
// upbeat *ascending* for chores/positive, calm *descending* for needs-work —
// never harsh or alarming.

type ChimeKind = "positive" | "needs-work";

// Module-level prefs, kept in sync by the settings store (src/lib/settings.ts).
// Defaults: sound on, haptics on — overridden as soon as settings hydrate.
export const feedbackPrefs = {
  sound: true,
  haptics: true,
};

// ---------------------------------------------------------------------------
// Audio engine
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // Browsers suspend the context until a user gesture; resume opportunistically.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Call once from a user gesture (e.g. first tap) to unlock audio on iOS/Safari.
export function primeAudio() {
  const ac = audio();
  if (ac && ac.state === "suspended") void ac.resume();
}

// A single soft, rounded note. Sine core + a touch of triangle for warmth,
// wrapped in a gentle attack/decay envelope so nothing clicks or stabs.
function note(freq: number, startAt: number, dur: number, gain: number) {
  const ac = ctx;
  if (!ac) return;
  const t = ac.currentTime + startAt;

  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const g = ac.createGain();

  osc.type = "sine";
  osc2.type = "triangle";
  osc.frequency.value = freq;
  osc2.frequency.value = freq;
  osc2.detune.value = -6; // slight chorus for a plush, non-digital feel

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g);
  osc2.connect(g);
  g.connect(ac.destination);

  osc.start(t);
  osc2.start(t);
  osc.stop(t + dur + 0.05);
  osc2.stop(t + dur + 0.05);
}

// Pentatonic-ish steps keep every chime consonant no matter the direction.
const ASCENDING = [523.25, 659.25, 783.99]; // C5 E5 G5 — happy, lifting
const DESCENDING = [587.33, 493.88, 392.0]; // D5 B4 G4 — calm, settling (not sad)

export function playChime(kind: ChimeKind) {
  if (!feedbackPrefs.sound) return;
  if (!audio()) return;
  const steps = kind === "positive" ? ASCENDING : DESCENDING;
  const step = 0.09;
  steps.forEach((f, i) => note(f, i * step, 0.28, 0.16));
}

// Soft glassy "clink" for a marble landing in the jar — a short high ping with
// a quick decay, quiet enough to layer under the chime.
export function playClink(pitchJitter = 0) {
  if (!feedbackPrefs.sound) return;
  if (!audio()) return;
  const base = 1180 + pitchJitter;
  note(base, 0, 0.12, 0.05);
  note(base * 1.5, 0.005, 0.08, 0.025);
}

// Celebration fanfare when the jar fills — a quick rising arpeggio + shimmer.
export function playFanfare() {
  if (!feedbackPrefs.sound) return;
  if (!audio()) return;
  const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  arp.forEach((f, i) => note(f, i * 0.08, 0.5, 0.16));
  // sparkle tail
  [1567.98, 2093.0].forEach((f, i) => note(f, 0.45 + i * 0.06, 0.4, 0.07));
}

// ---------------------------------------------------------------------------
// Haptics — abstracted so Capacitor's Haptics plugin can drop in later.
// ---------------------------------------------------------------------------

type HapticStyle = "light" | "medium" | "success" | "warning";

const VIBRATE: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 18,
  success: [12, 40, 24],
  warning: [16, 60, 16],
};

export function haptic(style: HapticStyle = "light") {
  if (!feedbackPrefs.haptics) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(VIBRATE[style]);
  } catch {
    /* unsupported — no-op */
  }
}
