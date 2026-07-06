// AI icon generation (§9) — RATE-LIMITED per household so generation costs stay
// predictable. Each household gets a capped number of generations per calendar
// month; premium households get a higher cap. The ledger lives in
// public.icon_generations (see 0001_init.sql).
//
// Deploy: `supabase functions deploy generate-icon`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY
//
// Uses the Google Gemini API (Imagen 3 / Gemini 2.0 Flash) to generate
// on-brand PointPals icons. The style prompt ensures visual consistency with
// the existing icon set.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";

// Monthly caps by entitlement — tune freely; this is the cost guardrail.
const FREE_MONTHLY_CAP = 10;
const PREMIUM_MONTHLY_CAP = 120;

// Style prompt to keep generated icons visually consistent with the existing set.
// Paste the user's style preferences into this constant.
const STYLE_PROMPT = `A single app icon illustration. Flat-but-dimensional custom icon style — NOT emoji, NOT clipart, NOT a photo, NOT flat vector-only. Friendly, slightly rounded, chunky illustration with soft gradients and gentle highlights, thick soft black-free outline (a heavier line weight than a normal icon, drawn in a dark warm charcoal, not pure black). The illustration sits centred on a soft pastel-coloured square background with slightly rounded corners. The background square is a single solid pastel colour (choose from dusty blue, buttercream yellow, sage green, blush pink, lilac, warm sand, or seafoam). The illustration fills roughly 70% of the background square, with generous padding. No white die-cut border, no sticker edge, no drop shadow beneath the illustration or behind the square. No text, no letters, no numbers, no watermark, no photorealism, no rendered human faces (use an object stand-in instead, e.g. a toothbrush rather than a child brushing teeth). Square canvas overall, with the pastel background card filling most of the frame.`;

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Call the Gemini 2.0 Flash (Imagen) API to generate an image. */
async function generateImage(prompt: string): Promise<Uint8Array> {
  const fullPrompt = `${STYLE_PROMPT}\n\n${prompt}`;

  // Gemini 2.0 Flash with image generation via Imagen
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: fullPrompt }],
      }],
      generationConfig: {
        temperature: 0.4,
        topP: 1,
        topK: 32,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) =>
    p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    // The model may return text instead if generation is blocked
    const text = parts.map((p: { text?: string }) => p.text ?? "").join(" ").trim();
    throw new Error(text ? `Gemini returned text instead of image: "${text.slice(0, 200)}"` : "No image returned by Gemini");
  }

  const base64 = imagePart.inlineData.data;
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, prompt } = await req.json();
    if (!householdId || !prompt) return json({ error: "Missing householdId/prompt" }, 400);
    if (!GOOGLE_API_KEY) {
      return json({ error: "GOOGLE_API_KEY not configured. Ask your admin to set it as a Supabase secret." }, 500);
    }

    const { data: household, error: hErr } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .single();
    if (hErr || !household) return json({ error: "Unknown household" }, 404);

    const premium =
      household.subscription_status === "active" || household.subscription_status === "trialing";
    const cap = premium ? PREMIUM_MONTHLY_CAP : FREE_MONTHLY_CAP;

    // Count this household's generations since the start of the month.
    const { count, error: cErr } = await admin
      .from("icon_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gte("created_at", monthStartISO());
    if (cErr) return json({ error: "rate check failed" }, 500);

    if ((count ?? 0) >= cap) {
      return json(
        { error: "monthly_limit_reached", cap, used: count, premium },
        429,
      );
    }

    // Generate the image via Gemini
    const imageBytes = await generateImage(prompt);

    // Upload to Supabase Storage
    const filename = `generated/${householdId}/${crypto.randomUUID()}.png`;
    const { error: uploadErr } = await admin.storage
      .from("assets")
      .upload(filename, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadErr) {
      return json({ error: `Storage upload failed: ${uploadErr.message}` }, 500);
    }

    // Get public URL
    const { data: urlData } = admin.storage.from("assets").getPublicUrl(filename);
    const publicUrl = urlData?.publicUrl ?? "";

    // Record the generation for rate-limiting + auditing.
    await admin.from("icon_generations").insert({
      household_id: householdId,
      prompt,
      storage_path: filename,
    });

    return json({
      ok: true,
      storagePath: filename,
      url: publicUrl,
      remaining: cap - (count ?? 0) - 1,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "generation failed" }, 500);
  }
});
