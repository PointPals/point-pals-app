// Error tracking (§7) — Sentry, with PII scrubbed BEFORE anything leaves the
// device. Names and emails must never appear in an error report.
//
// Like analytics, this only initialises when a DSN is configured; otherwise it
// is a safe no-op and the app runs identically. The Sentry SDK is imported
// dynamically so it is optional.

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (e: unknown, ctx?: Record<string, unknown>) => void;
};

let sentry: SentryLike | null = null;

// Redact obvious PII from any string: emails, and anything tagged as a name.
function scrubString(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(
      /("(?:name|firstName|lastName|childName|kidName|familyName)"\s*:\s*)"[^"]*"/gi,
      '$1"[redacted]"',
    );
}

// Deep-scrub an event's strings before send. Also drops user identity fields.
function scrubEvent(event: Record<string, unknown>): Record<string, unknown> {
  const walk = (val: unknown): unknown => {
    if (typeof val === "string") return scrubString(val);
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (/name|email/i.test(k)) {
          out[k] = "[redacted]";
        } else {
          out[k] = walk(v);
        }
      }
      return out;
    }
    return val;
  };
  const scrubbed = walk(event) as Record<string, unknown>;
  delete scrubbed.user; // never attach user identity
  return scrubbed;
}

export async function initMonitoring(): Promise<void> {
  if (typeof window === "undefined" || !DSN || sentry) return;
  try {
    // Indirect specifier keeps @sentry/browser OPTIONAL (see analytics.ts).
    const spec = "@sentry/browser";
    const mod = (await import(/* @vite-ignore */ spec)) as unknown as SentryLike;
    mod.init({
      dsn: DSN,
      sendDefaultPii: false,
      // strip PII from every outgoing event
      beforeSend: (event: Record<string, unknown>) => scrubEvent(event),
      beforeBreadcrumb: (crumb: Record<string, unknown>) => {
        if (typeof crumb.message === "string") crumb.message = scrubString(crumb.message);
        return crumb;
      },
    });
    sentry = mod;
  } catch {
    sentry = null; // dep not installed — stay a no-op
  }
}

export function captureError(e: unknown, context?: Record<string, unknown>): void {
  if (sentry) {
    sentry.captureException(e, context ? { extra: scrubEvent(context) } : undefined);
  } else if (typeof console !== "undefined") {
    console.error("[monitoring]", e);
  }
}

// Exposed for unit-testing the scrubber.
export const __test = { scrubString, scrubEvent };
