// Feedback layer — sound + haptics for the award loop and marble jar.
//
// Everything here is deliberately behind a thin, platform-neutral interface so a
// later Capacitor wrapper can swap the web implementations (Web Audio,
// navigator.vibrate) for native plugins (@capacitor/haptics, native audio)
// without touching call sites. See §8 (forward-compatibility) of the spec.
//
// Sound is generated with the Web Audio API (no audio files to host, tiny, and
// works offline). Positive is a bright rising bell sparkle; needs-work is a
// low, muted "uh-oh" — instantly distinguishable, never harsh or alarming.
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

// G10 — Prime audio on the first user interaction so remote awards (real-time
// INSERTs without a local gesture) can play sound. Once the AudioContext is
// running, it stays live for the page lifetime. Called once at module import.
let primerAttached = false;
export function attachAudioPrimer() {
  if (primerAttached || typeof document === "undefined") return;
  primerAttached = true;
  document.addEventListener(
    "pointerdown",
    () => {
      const ac = audio();
      if (ac && ac.state !== "running") {
        ac.resume().catch(() => {
          /* not in a gesture yet */
        });
      }
    },
    { once: true, passive: true },
  );
}

// Auto-prime on first user interaction so remote awards can play sound.
attachAudioPrimer();

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------
// The two award sounds are designed to be told apart instantly — even by a
// five-year-old across the room — by register, timbre, contour AND rhythm:
//
//   positive   → HIGH, BRIGHT, RISING: a glassy "pop", a bell arpeggio and a
//                twinkle tail. Reads as "ta-da!".
//   needs-work → LOW, MUTED, FALLING: a soft two-note "uh-oh" through a
//                felt-like low-pass, the second note sagging gently. Clearly
//                different, never harsh or shaming.

// Every voice goes through one gentle bus compressor so stacked awards (a
// batch of five taps) never clip or get piercing.
let bus: AudioNode | null = null;
function out(ac: AudioContext): AudioNode {
  if (bus && (bus as AudioNode).context === ac) return bus;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  comp.connect(ac.destination);
  bus = comp;
  return comp;
}

// A soft, rounded note (sine + a touch of chorused triangle). Kept for the
// marble clink.
function note(ac: AudioContext, freq: number, startAt: number, dur: number, gain: number) {
  const t = ac.currentTime + startAt;
  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc2.type = "triangle";
  osc.frequency.value = freq;
  osc2.frequency.value = freq;
  osc2.detune.value = -6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  osc2.connect(g);
  g.connect(out(ac));
  osc.start(t);
  osc2.start(t);
  osc.stop(t + dur + 0.05);
  osc2.stop(t + dur + 0.05);
}

// Bell / glockenspiel: fundamental + bright inharmonic partials that decay
// faster than the body, with a near-instant attack — the "ting" of a marble
// on glass.
function bell(ac: AudioContext, freq: number, startAt: number, dur: number, gain: number) {
  const t = ac.currentTime + startAt;
  const partials: [number, number, number][] = [
    // [ratio, relative gain, relative decay]
    [1, 1, 1],
    [2.01, 0.42, 0.55],
    [3.02, 0.16, 0.32],
    [4.17, 0.07, 0.2],
  ];
  for (const [ratio, rel, decay] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const d = Math.max(0.06, dur * decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * rel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g);
    g.connect(out(ac));
    osc.start(t);
    osc.stop(t + d + 0.05);
  }
}

// Muted, woody note: a triangle through a soft low-pass with an optional
// downward bend — like a felt mallet on a wooden block.
function muted(
  ac: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  gain: number,
  bendTo?: number,
) {
  const t = ac.currentTime + startAt;
  const osc = ac.createOscillator();
  const sub = ac.createOscillator();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  osc.type = "triangle";
  sub.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  sub.frequency.setValueAtTime(freq / 2, t);
  if (bendTo) {
    osc.frequency.exponentialRampToValueAtTime(bendTo, t + dur * 0.9);
    sub.frequency.exponentialRampToValueAtTime(bendTo / 2, t + dur * 0.9);
  }
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(380, t + dur);
  lp.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.018);
  g.gain.exponentialRampToValueAtTime(gain * 0.6, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp);
  const subGain = ac.createGain();
  subGain.gain.value = 0.55;
  sub.connect(subGain);
  subGain.connect(lp);
  lp.connect(g);
  g.connect(out(ac));
  osc.start(t);
  sub.start(t);
  osc.stop(t + dur + 0.05);
  sub.stop(t + dur + 0.05);
}

// Short filtered noise burst — the "pop" of a marble leaving the hand.
let noiseBuf: AudioBuffer | null = null;
function pop(ac: AudioContext, startAt: number, centre: number, gain: number) {
  if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  }
  const t = ac.currentTime + startAt;
  const src = ac.createBufferSource();
  const bp = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = noiseBuf;
  bp.type = "bandpass";
  bp.frequency.value = centre;
  bp.Q.value = 2.2;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  src.connect(bp);
  bp.connect(g);
  g.connect(out(ac));
  src.start(t);
  src.stop(t + 0.06);
}

// positive: pop → C6 E6 G6 bell arpeggio → C7 twinkle. ~0.7 s, unmistakably up.
function positiveChime(ac: AudioContext) {
  pop(ac, 0, 2400, 0.22);
  bell(ac, 1046.5, 0.0, 0.55, 0.13); // C6
  bell(ac, 1318.51, 0.075, 0.55, 0.12); // E6
  bell(ac, 1567.98, 0.15, 0.7, 0.13); // G6
  bell(ac, 2093.0, 0.27, 0.5, 0.07); // C7 twinkle
  bell(ac, 2637.02, 0.33, 0.35, 0.035); // E7 sparkle
}

// needs-work: a soft, low "uh-oh" — G3 then E♭3 sagging to D3. ~0.55 s.
function needsWorkChime(ac: AudioContext) {
  muted(ac, 196.0, 0, 0.2, 0.24); // G3 "uh-"
  muted(ac, 155.56, 0.19, 0.38, 0.26, 146.83); // E♭3 → D3 "-oh"
}

export function playChime(kind: ChimeKind) {
  if (!feedbackPrefs.sound) return;
  withAudio((ac) => (kind === "positive" ? positiveChime(ac) : needsWorkChime(ac)));
}

// Soft glassy "clink" for a marble landing in the jar — a short high bell
// ping, quiet enough to layer under the chime.
export function playClink(pitchJitter = 0) {
  withAudio((ac) => {
    bell(ac, 2200 + pitchJitter, 0, 0.16, 0.04);
  });
}

// Celebration fanfare when the jar fills — a rising bell arpeggio with a
// warm pad underneath and a twinkle shower on top.
export function playFanfare() {
  withAudio((ac) => {
    pop(ac, 0, 2000, 0.2);
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    arp.forEach((f, i) => bell(ac, f, i * 0.07, 0.9, 0.12));
    [261.63, 329.63, 392.0].forEach((f) => note(ac, f, 0.05, 1.1, 0.05)); // C major pad
    [2093.0, 2637.02, 3135.96, 2637.02, 3520.0].forEach((f, i) =>
      bell(ac, f, 0.5 + i * 0.07, 0.4, 0.04),
    );
  });
}

// G8 — Single call site for award feedback, used from both the tap handler
// (local award) and the realtime point_events INSERT handler (remote award).
// Combines haptic + chime. Safe to call from any context — if AudioContext
// is suspended (no user gesture), it stays silent rather than throwing.
export function triggerAwardFeedback(kind: "positive" | "needs-work") {
  haptic(kind === "positive" ? "success" : "medium");
  playChime(kind);
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
