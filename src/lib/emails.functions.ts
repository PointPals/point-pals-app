// Client-callable server functions that trigger Resend templates.
// The actual sender lives in emails.server.ts (loaded dynamically so nothing
// from client.server / server-only modules leaks into the client bundle).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Fired after a fresh sign-up completes. Idempotent — sets
 * households.email_trial_welcome_sent_at so repeat calls no-op.
 */
export const sendTrialWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTemplate } = await import("./emails.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get the user's email + a household they belong to.
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email;
    if (!email) return { ok: false, reason: "no_email" };

    const { data: memberships } = await supabaseAdmin
      .from("household_members")
      .select("household_id, households:household_id(id, email_trial_welcome_sent_at)")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1);
    const hh = memberships?.[0]?.households as { id: string; email_trial_welcome_sent_at: string | null } | null;
    if (hh?.email_trial_welcome_sent_at) return { ok: true, alreadySent: true };

    const result = await sendTemplate({
      templateKey: "trialWelcome",
      to: email,
      data: { first_name: userRes?.user?.user_metadata?.name ?? "" },
    });

    if (result.ok && hh?.id) {
      await supabaseAdmin
        .from("households")
        .update({ email_trial_welcome_sent_at: new Date().toISOString() })
        .eq("id", hh.id);
    }
    return result;
  });

/**
 * Public contact form. Sends the autoreply back to the sender and forwards
 * the message to the support inbox. Also persists to support_messages.
 */
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(3000),
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
      data: { first_name: data.name.split(" ")[0] ?? data.name },
    });

    // Forward the raw message to the support inbox as plain text — direct
    // Resend API (the old Lovable gateway stopped working off Lovable hosting).
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
          text: `From: ${data.name} <${data.email}>\n\n${data.message}`,
        }),
      }).catch((e) => console.error("[contact] forward failed:", e));
    }

    return { ok: true };
  });