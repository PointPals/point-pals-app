// Feedback layer — sound + haptics for the award loop and marble jar.
//
// Everything here is deliberately behind a thin, platform-neutral interface so a
// later Capacitor wrapper can swap the web implementations (Web Audio,
// navigator.vibrate) for native plugins (@capacitor/haptics, native audio)
// without touching call sites. See §8 (forward-compatibility) of the spec.
//
// Sound is generated with the Web Audio API (no audio files to host, tiny, and
// works offline). Tones are intentionally soft: upbeat *ascending* for
// chores/positive, calm *descending* for needs-work — never harsh or alarming.
//
// AUTOPLAY-POLICY NOTE (the "no sound" bug): browsers keep a fresh AudioContext
// in the "suspended" state until it's resumed inside a user gesture. The old
// code fired `void ctx.resume()` and scheduled notes immediately — against a
// context whose clock was frozen — so every note collapsed onto the same
// instant and nothing audible played. `withAudio` below resumes the context
// *synchronously within the tap gesture* (which preserves the user-activation
// grant) and only schedules notes once the context is actually running. All
// play* functions must therefore be called directly from the tap handler,
// BEFORE any state updates or network writes — never after an await.

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
  return ctx;
}

// Run `schedule` against a *running* context. Must be invoked synchronously
// from a user gesture: resume() is called inside the gesture (so the browser
// honours it), and the schedule callback fires as soon as the clock is live.
function withAudio(schedule: (ac: AudioContext) => void) {
  if (!feedbackPrefs.sound) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === "running") {
    schedule(ac);
    return;
  }
  ac.resume()
    .then(() => schedule(ac))
    .catch(() => {
      /* resume denied (no gesture) — stay silent rather than throw */
    });
}

// Call from any early user gesture (first tap anywhere useful) so the context
// is already running by the time the first award happens. iOS Safari especially
// benefits: the first resume() inside a touch gesture unlocks audio for good.
export function primeAudio() {
  const ac = audio();
  if (ac && ac.state !== "running") {
    ac.resume().catch(() => {
      /* not in a gesture yet — the next tap will unlock it */
    });
  }
}

// A single soft, rounded note. Sine core + a touch of triangle for warmth,
// wrapped in a gentle attack/decay envelope so nothing clicks or stabs.
function note(ac: AudioContext, freq: number, startAt: number, dur: number, gain: number) {
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
  withAudio((ac) => {
    const steps = kind === "positive" ? ASCENDING : DESCENDING;
    const step = 0.09;
    steps.forEach((f, i) => note(ac, f, i * step, 0.28, 0.16));
  });
}

// Soft glassy "clink" for a marble landing in the jar — a short high ping with
// a quick decay, quiet enough to layer under the chime.
export function playClink(pitchJitter = 0) {
  withAudio((ac) => {
    const base = 1180 + pitchJitter;
    note(ac, base, 0, 0.12, 0.05);
    note(ac, base * 1.5, 0.005, 0.08, 0.025);
  });
}

// Celebration fanfare when the jar fills — a quick rising arpeggio + shimmer.
export function playFanfare() {
  withAudio((ac) => {
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    arp.forEach((f, i) => note(ac, f, i * 0.08, 0.5, 0.16));
    // sparkle tail
    [1567.98, 2093.0].forEach((f, i) => note(ac, f, 0.45 + i * 0.06, 0.4, 0.07));
  });
}

// Exposed for tests/diagnostics: current audio state without side effects.
export function audioState(): AudioContextState | "unavailable" {
  return ctx?.state ?? "unavailable";
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
