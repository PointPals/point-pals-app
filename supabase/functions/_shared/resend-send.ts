// Shared Resend send helper — uses the Resend Templates API.
// Docs: https://resend.com/docs/api-reference/templates/send-template-email
//
// All variables are stringified — the Resend dashboard editor substitutes
// them via {{handlebars}} placeholders.

export const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendTemplateOptions {
  to: string | string[];
  templateId: string;
  variables?: Record<string, unknown>;
  from: string;
  subject?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

function stringifyVars(vars?: Record<string, unknown>): Record<string, string> {
  if (!vars) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === null || v === undefined) {
      out[k] = "";
    } else if (typeof v === "string") {
      out[k] = v;
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

export interface ResendHtmlOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Send a plain HTML email (no hosted template) via the Resend API. */
export async function sendResendHtml(
  apiKey: string,
  opts: ResendHtmlOptions,
): Promise<{ ok: boolean; status: number; body: string }> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const payload: Record<string, unknown> = {
    from: opts.from,
    to,
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.replyTo) payload.reply_to = opts.replyTo;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

export async function sendResendTemplate(
  apiKey: string,
  opts: ResendTemplateOptions,
): Promise<{ ok: boolean; status: number; body: string }> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const payload: Record<string, unknown> = {
    from: opts.from,
    to,
    template: {
      id: opts.templateId,
      variables: stringifyVars(opts.variables),
    },
  };
  if (opts.subject) payload.subject = opts.subject;
  if (opts.replyTo) payload.reply_to = opts.replyTo;
  if (opts.headers) payload.headers = opts.headers;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}
