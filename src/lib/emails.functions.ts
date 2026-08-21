// Client-callable server functions that trigger Resend templates.
// The actual sender lives in emails.server.ts (loaded dynamically so nothing
// from client.server / server-only modules leaks into the client bundle).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public contact form. Sends the autoreply back to the sender and forwards
 * the message to the support inbox. Also persists to support_messages.
 */
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(3000),
  screenshotUrl: z.string().url().optional(),
});

export const submitContactForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { sendTemplate, SUPPORT_INBOX } = await import("./emails.server");

    // Autoreply to the sender
    await sendTemplate({
      templateKey: "supportAutoreply",
      to: data.email,
      replyTo: SUPPORT_INBOX,
      data: { first_name: data.name },
    });

    // Forward the raw message to the support inbox as plain text — direct
    // Resend API (direct, no gateway).
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "PointPals Contact <hello@pointpals.co.nz>",
          to: [SUPPORT_INBOX],
          reply_to: data.email,
          subject: `Contact form — ${data.name}`,
          text:
            `From: ${data.name} <${data.email}>\n\n` +
            data.message +
            (data.screenshotUrl ? `\n\nScreenshot: ${data.screenshotUrl}` : ""),
        }),
      }).catch((e) => console.error("[contact] forward failed:", e));
    }

    return { ok: true, screenshotUrl: data.screenshotUrl };
  });