// Where a family came from (?source=tiktok, ?source=etsy …), saved on the
// household as attribution_source. Parents rarely sign up on the page a link
// lands them on — they read the landing page, then tap "Start free", or they
// confirm their email first — so the first source seen on this device is
// remembered and used whenever the family is actually created.

const KEY = "pointpals.source";

function clean(value: string | null | undefined): string | undefined {
  const v = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return v || undefined;
}

/** Remember the URL's ?source= (or a fallback) — first touch wins. */
export function captureSource(fallback?: string) {
  try {
    const v = clean(new URLSearchParams(window.location.search).get("source")) ?? clean(fallback);
    if (v && !window.localStorage.getItem(KEY)) window.localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

/** The source to record on a new household, if any. */
export function signupSource(): string | undefined {
  try {
    return (
      clean(new URLSearchParams(window.location.search).get("source")) ??
      clean(window.localStorage.getItem(KEY))
    );
  } catch {
    return undefined;
  }
}
