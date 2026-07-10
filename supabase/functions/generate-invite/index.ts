// Generate a household invite link for extended family
//
// Parent clicks "Invite family" → picks a role (viewer/contributor) →
// this function generates a code and a shareable URL.
//
// POST /generate-invite
//   { household_id: "uuid", role: "viewer" | "contributor" }
//
// Returns:
//   { code: "ABC123", url: "https://pointpals.co.nz/join?code=ABC123" }
//
// Deploy: supabase functions deploy generate-invite
// Secrets: none required (uses Supabase-managed auth)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS helpers are inlined (rather than imported from ../_shared/cors.ts) so
// this function stays a single self-contained file — it can be redeployed by
// pasting into the Supabase dashboard without the shared module failing to
// resolve.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, opts: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: opts.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { household_id, role } = await req.json();

    if (!household_id) {
      return json({ ok: false, error: "household_id is required" }, { status: 400 });
    }

    const inviteRole = role === "contributor" ? "contributor" : "viewer";

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader);

    if (authErr || !user) {
      return json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify the caller is a member of this household. Any member — including
    // free/trial users, contributors and viewers — can generate invites; no
    // admin role or active subscription is required.
    const { data: member } = await admin
      .from("household_members")
      .select("role")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return json({ ok: false, error: "You must be a member of this household to generate invites" }, { status: 403 });
    }

    // Generate a unique 8-character code
    const { data: codeData } = await admin.rpc("generate_invite_code");
    const code = codeData as string;

    // Create the invite
    const { error: insertErr } = await admin
      .from("household_invites")
      .insert({
        household_id,
        code,
        role: inviteRole,
        created_by: user.id,
      });

    if (insertErr) {
      return json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "https://pointpals.co.nz";

    return json({
      ok: true,
      code,
      url: `${baseUrl}/join?code=${code}`,
      role: inviteRole,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
});
