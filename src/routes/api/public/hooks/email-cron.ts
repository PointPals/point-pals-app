// Daily nurture-email cron hook. Scheduled by pg_cron once per day (09:00
// UTC) via the SQL job installed in this project. Sends the time-based
// parenting-tip emails (PointPals is free — no trial/billing lifecycle):
//
//   02 tip-day3       — day 3 after sign-up
//   03 tip-day7       — day 7 after sign-up
//   08 tip-month1     — day 30 after sign-up
//
// Auth: pg_cron sends the Supabase anon key in the `apikey` header. We match
// it against SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY.

import { createFileRoute } from "@tanstack/react-router";

type HouseholdRow = {
  id: string;
  created_at: string;
  email_tip_day3_sent_at: string | null;
  email_tip_day7_sent_at: string | null;
  email_tip_month1_sent_at: string | null;
};

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

async function adminEmailFor(
  supabaseAdmin: import("@supabase/supabase-js").SupabaseClient,
  householdId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .eq("role", "admin")
    .limit(1);
  const userId = data?.[0]?.user_id as string | undefined;
  if (!userId) return null;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  return u?.user?.email ?? null;
}

export const Route = createFileRoute("/api/public/hooks/email-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { sendTemplate } = await import("@/lib/emails.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rows, error } = await supabaseAdmin
          .from("households")
          .select("id, created_at, email_tip_day3_sent_at, email_tip_day7_sent_at, email_tip_month1_sent_at");

        if (error) {
          console.error("[email-cron] fetch households failed:", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const now = new Date();
        const summary = { sent: [] as string[], failed: [] as string[] };

        for (const h of (rows ?? []) as HouseholdRow[]) {
          const created = new Date(h.created_at);
          const daysSinceCreated = daysBetween(created, now);
          const nowIso = now.toISOString();
          let toSend: { key: "tipDay3" | "tipDay7" | "tipMonth1"; column: string } | null = null;

          if (daysSinceCreated >= 3 && !h.email_tip_day3_sent_at) {
            toSend = { key: "tipDay3", column: "email_tip_day3_sent_at" };
          } else if (daysSinceCreated >= 7 && !h.email_tip_day7_sent_at) {
            toSend = { key: "tipDay7", column: "email_tip_day7_sent_at" };
          } else if (daysSinceCreated >= 30 && !h.email_tip_month1_sent_at) {
            toSend = { key: "tipMonth1", column: "email_tip_month1_sent_at" };
          }

          if (!toSend) continue;

          const to = await adminEmailFor(supabaseAdmin, h.id);
          if (!to) continue;

          const res = await sendTemplate({ templateKey: toSend.key, to });
          if (res.ok) {
            const patch: Record<string, string> = { [toSend.column]: nowIso };
            await supabaseAdmin
              .from("households")
              .update(patch as never)
              .eq("id", h.id);
            summary.sent.push(`${toSend.key}:${h.id}`);
          } else {
            summary.failed.push(`${toSend.key}:${h.id}:${res.error ?? ""}`);
          }
        }

        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
