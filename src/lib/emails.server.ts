// Server-only Resend template sender. Uses the Lovable connector gateway so
// the RESEND_API_KEY secret never leaves the server runtime.
//
// Each PointPals lifecycle email is pre-authored in the Resend dashboard;
// we address them by template ID here so copy/design changes don't ship
// with the app.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const RESEND_FROM = "PointPals <hello@pointpals.co.nz>";
export const SUPPORT_INBOX = "support@pointpals.co.nz";

export const EMAIL_TEMPLATES = {
  trialWelcome:         "e27abaa3-ce06-4bdb-bea2-d297b81d15d8",
  tipDay3:              "303f6963-2313-40f2-b8dd-9a7e7a04846e",
  tipDay7:              "8e1eda2a-1afc-48ed-8b04-f3239e88f728",
  trialEnding:          "0613cb97-9311-4de3-95e4-47de596b012a",
  paymentConfirmation:  "1948c765-325d-420e-aabd-a5c9c05a7946",
  subscriptionRenewal:  "188f5f1c-2e98-41c3-b34b-dc85e6d79c01",
  paymentFailed:        "7521fc1b-69a3-4311-ba6b-3791525fde2e",
  tipMonth1:            "bb97dd57-3e76-47aa-8421-3630de618589",
  supportAutoreply:     "a22249dc-e162-4c29-8562-aecc63b08fa3",
  subscriptionCancelled:"0b599576-fda3-4f54-a16d-26290f0fb6e3",
} as const;

export type TemplateKey = keyof typeof EMAIL_TEMPLATES;

type SendOptions = {
  templateKey: TemplateKey;
  to: string | string[];
  subject?: string;
  data?: Record<string, unknown>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

/**
 * Send a Resend-hosted template. Failures are logged and swallowed — email is
 * fire-and-forget so it never blocks a signup/webhook/cron cycle.
 */
export async function sendTemplate(opts: SendOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.error("[emails] Missing LOVABLE_API_KEY or RESEND_API_KEY");
    return { ok: false, error: "missing_credentials" };
  }
  const templateId = EMAIL_TEMPLATES[opts.templateKey];
  const body: Record<string, unknown> = {
    from: RESEND_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    template_id: templateId,
  };
  if (opts.subject) body.subject = opts.subject;
  if (opts.data) body.data = opts.data;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.cc) body.cc = Array.isArray(opts.cc) ? opts.cc : [opts.cc];
  if (opts.bcc) body.bcc = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];

  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[emails] Resend ${opts.templateKey} failed ${res.status}: ${text}`);
      return { ok: false, error: `${res.status}: ${text.slice(0, 200)}` };
    }
    let parsed: { id?: string } = {};
    try { parsed = JSON.parse(text); } catch { /* non-JSON success */ }
    return { ok: true, id: parsed.id };
  } catch (e) {
    console.error(`[emails] Resend ${opts.templateKey} threw:`, e);
    return { ok: false, error: String(e) };
  }
}