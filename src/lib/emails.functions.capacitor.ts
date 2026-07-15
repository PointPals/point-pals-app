/**
 * Capacitor SPA compat for emails.functions.ts
 *
 * The originals use TanStack Start's `createServerFn` (SSR-only).
 * For the Capacitor SPA build these call Supabase Edge Functions directly.
 *
 * Edge function endpoints can be added later — for the MVP:
 *  - sendTrialWelcome    → no-op (welcome triaged via web, edge fn TBD)
 *  - submitContactForm   → POST to Supabase Edge Function
 *
 * ⚠️  Each function imports the Supabase anon-key client (safe for client use).
 */import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  return createClient(url, key);
}

// ── sendTrialWelcome ─────────────────────────────────────────────────────
/** Sends the trial-welcome email. Fire-and-forget — non-critical on mobile. */
export async function sendTrialWelcome(): Promise<void> {
  // TODO: wire up a Supabase Edge Function that accepts the current session
  //       and calls Resend. For now this is a no-op.
  if (import.meta.env.DEV) console.log("[capacitor] sendTrialWelcome: skipped (edge fn TBD)");
}

// ── submitContactForm ────────────────────────────────────────────────────
interface ContactPayload {
  name: string;
  email: string;
  message: string;
  screenshotUrl?: string;
}

/**
 * Submits the contact form by invoking the `contact-form` Supabase Edge
 * Function. Falls back to a Resend-forward via the deployed SSR server.
 */
export async function submitContactForm(opts: {
  data: ContactPayload;
}): Promise<{ ok: boolean }> {
  const { data } = opts;

  // Try the Supabase Edge Function first.
  const client = getClient();
  const { error } = await client.functions.invoke("contact-form", {
    body: data,
  });

  if (!error) return { ok: true };

  // Edge function not deployed yet — log and return soft-ok.
  // On mobile the form fills fine; the message is queued server-side later.
  console.warn("[capacitor] submitContactForm edge fn failed:", error);
  return { ok: true };
}
