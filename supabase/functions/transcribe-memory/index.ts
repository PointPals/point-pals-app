// Speech-to-text for the memory composer (composer v2): a child narrates a
// photo, the recording is transcribed straight into the caption field.
//
// RATE-LIMITED per household per calendar month (same guardrail pattern as
// generate-icon; ledger: public.transcriptions). Uses Gemini 1.5 Flash when
// GEMINI_API_KEY is set, otherwise returns a clear "not configured" error
// so the client can fall back to keeping the audio.
//
// Deploy: `supabase functions deploy transcribe-memory`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// PointPals is free — every household gets the full monthly allowance.
const MONTHLY_CAP = 200;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // ~90s of opus is well under this

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, audioBase64, mimeType, durationSec } = await req.json();
    if (!householdId || !audioBase64) return json({ error: "Missing householdId/audio" }, 400);

    const { data: household, error: hErr } = await admin
      .from("households")
      .select("id")
      .eq("id", householdId)
      .single();
    if (hErr || !household) return json({ error: "Unknown household" }, 404);

    // PointPals is free — every household gets the full monthly allowance.
    const cap = MONTHLY_CAP;

    const { count, error: cErr } = await admin
      .from("transcriptions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gte("created_at", monthStartISO());
    if (cErr) return json({ error: "rate check failed" }, 500);
    if ((count ?? 0) >= cap) {
      return json({ error: "monthly_limit_reached", cap, used: count }, 429);
    }

    const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_AUDIO_BYTES) return json({ error: "audio too large" }, 413);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json({ error: "transcription_not_configured" }, 503);
    }

    // audioBase64 is already base64 — pass it straight to Gemini inline_data
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || "audio/webm",
                  data: audioBase64,
                },
              },
              { text: "Transcribe the spoken audio verbatim including filler words. Output only the transcript, no explanation or commentary." },
            ],
          }],
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: "provider_failed", detail: detail.slice(0, 300) }, 502);
    }
    const out = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = out.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    await admin.from("transcriptions").insert({
      household_id: householdId,
      duration_sec: typeof durationSec === "number" ? Math.round(durationSec) : null,
    });

    // The raw transcript is returned verbatim — no auto-correction. Kids'
    // phrasing is the charm; the parent edits (or doesn't) in the caption box.
    return json({ ok: true, text, remaining: cap - (count ?? 0) - 1 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "transcription failed" }, 500);
  }
});
