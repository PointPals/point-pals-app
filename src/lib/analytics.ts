// Product analytics (§7) — PostHog, deliberately scoped to PARENT-facing
// screens and actions only (admin, library management, settings, paywall/
// upgrade funnel, onboarding).
//
// Hard rules encoded here:
//  - We never build a behavioural profile of a child. Kid-facing award taps are
//    NOT tracked as identified behaviour. `trackKidFlow` exists only for coarse,
//    anonymised counts and strips everything but an opaque kid_id.
//  - No session recording anywhere (we never load PostHog's recorder).
//  - PostHog only initialises if a key is configured; otherwise everything is a
//    safe no-op, so the app runs identically without it.
//
// The real PostHog SDK is loaded lazily to keep it out of the kid-facing bundle
// path and to avoid a hard dependency when unconfigured.

type Props = Record<string, string | number | boolean | null>;

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

// Minimal surface we use from posthog-js, so we don't need the dep to typecheck.
type PostHogLike = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Props) => void;
  identify: (id: string, props?: Props) => void;
  reset: () => void;
};

let ph: PostHogLike | null = null;
let loading: Promise<void> | null = null;

function enabled() {
  return typeof window !== "undefined" && !!KEY;
}

async function ensure(): Promise<void> {
  if (!enabled() || ph) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      // Dynamic import via an indirect specifier so posthog-js stays OPTIONAL:
      // tsc won't try to resolve it and the app runs without the dep installed.
      const spec = "posthog-js";
      const mod = (await import(/* @vite-ignore */ spec)) as { default: PostHogLike };
      mod.default.init(KEY as string, {
        api_host: HOST,
        autocapture: false, // explicit events only
        disable_session_recording: true, // never record sessions
        capture_pageview: false,
        person_profiles: "identified_only",
      });
      ph = mod.default;
    } catch {
      ph = null; // dep not installed / offline — stay a no-op
    }
  })();
  return loading;
}

// Track a parent action (admin/library/settings/paywall/onboarding).
export function trackParent(event: string, props?: Props): void {
  if (!enabled()) return;
  void ensure().then(() => ph?.capture(`parent:${event}`, props));
}

// Coarse, anonymised kid-flow signal — carries ONLY an opaque kid_id, never a
// name or any identifying detail. Use sparingly; there is no session recording.
export function trackKidFlowAnonymous(event: string, kidId: string): void {
  if (!enabled()) return;
  void ensure().then(() => ph?.capture(`kidflow:${event}`, { kid_id: hashId(kidId) }));
}

export function identifyHousehold(householdId: string): void {
  if (!enabled()) return;
  void ensure().then(() => ph?.identify(`household_${hashId(householdId)}`));
}

export function resetAnalytics(): void {
  ph?.reset();
}

// Opaque, stable, non-reversible id so no raw kid/household id leaves the device.
function hashId(v: string): string {
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) {
    h ^= v.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
