// Server-only Resend template sender — calls the Resend API directly
// (the old Lovable connector gateway required LOVABLE_API_KEY and stopped
// working once the app moved off Lovable hosting).
//
// Each PointPals lifecycle email is pre-authored (and PUBLISHED) in the
// Resend dashboard; we address them by template ID here so copy/design
// changes don't ship with the app.

const RESEND_API_URL = "https://api.resend.com/emails";

export const RESEND_FROM = "PointPals <hello@pointpals.co.nz>";
export const SUPPORT_INBOX = "support@pointpals.co.nz";

export const EMAIL_TEMPLATES = {
  trialWelcome:         "c47b8f0c-0424-48b9-8298-aea923ae161d",  // Welcome-PointPals
  tipDay3:              "f8fbb7b8-b955-48a6-b3aa-1079aeefd569",  // Parenting-Tip-StartSmall
  tipDay7:              "d12adf3c-3874-4abf-94f3-ed04b349257c",  // Parenting-Tip-LabelPraise
  trialEnding:          "929843c3-c808-4643-9ce5-3a686917f651",  // Trial-Ending-Soon
  paymentConfirmation:  "f349804b-9024-44e5-baf5-da4d18c3701a",  // Subscription-Receipt
  subscriptionRenewal:  "af7030c6-a449-4d85-beb7-b35f19a4d5fb",  // Subscription-Renewal
  paymentFailed:        "be31e3d1-c51d-4255-91fc-db501d76bf08",  // Payment-Failed
  tipMonth1:            "c61044aa-2146-4715-98c3-030fadc33646",  // Habit-Fading-Tips
  supportAutoreply:     "267dc7da-55bb-4d22-9512-3b6012f61b75",  // Contact-Confirmation
  subscriptionCancelled:"9bbe49aa-223d-44f1-af8d-88560d4a6ae2",  // Subscription-Cancelled
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

// Resend substitutes {{handlebars}} placeholders with strings — stringify
// every variable so numbers/booleans render rather than erroring.
function stringifyVars(vars?: Record<string, unknown>): Record<string, string> {
  if (!vars) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    out[k] = v === null || v === undefined ? "" : typeof v === "string" ? v : String(v);
  }
  return out;
}

/**
 * Send a Resend-hosted template. Failures are logged and swallowed — email is
 * fire-and-forget so it never blocks a signup/webhook/cron cycle.
 */
export async function sendTemplate(opts: SendOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[emails] Missing RESEND_API_KEY");
    return { ok: false, error: "missing_credentials" };
  }
  const templateId = EMAIL_TEMPLATES[opts.templateKey];
  const body: Record<string, unknown> = {
    from: RESEND_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    template: {
      id: templateId,
      variables: stringifyVars(opts.data),
    },
  };
  if (opts.subject) body.subject = opts.subject;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.cc) body.cc = Array.isArray(opts.cc) ? opts.cc : [opts.cc];
  if (opts.bcc) body.bcc = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
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