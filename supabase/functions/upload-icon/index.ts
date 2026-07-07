// Background-removal edge function — strips the background from a user-uploaded
// photo using Gemini 2.0 Flash (Imagen), producing a transparent PNG that sits
// on the coloured tiles alongside the pre-made registry icons.
//
// Deploy: `supabase functions deploy upload-icon`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY
//
// Rate-limited per household via public.icon_generations (shared cap with AI
// generation — see generate-icon for details).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";

const FREE_MONTHLY_CAP = 10;
const PREMIUM_MONTHLY_CAP = 120;

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Call Gemini 2.0 Flash to remove the background from the uploaded image. */
async function removeBackground(imageBase64: string, mimeType: string): Promise<Uint8Array> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GOOGLE_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Remove the entire background from this image completely. Return ONLY the main subject on a fully transparent (alpha channel) background. The result must be a PNG with transparency. Do not add any new elements, text, or decorations — keep the original subject exactly as-is, just with the background stripped away." },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 1,
        topK: 32,
        maxOutputTokens: 4096,
        responseModalities: ["IMAGE", "TEXT"],
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
    const text = parts.map((p: { text?: string }) => p.text ?? "").join(" ").trim();
    throw new Error(
      text
        ? `Gemini returned text instead of image: "${text.slice(0, 200)}"`
        : "No image returned by Gemini",
    );
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
    const { householdId, imageBase64, label, mimeType } = await req.json();
    if (!householdId || !imageBase64) {
      return json({ error: "Missing householdId or imageBase64" }, 400);
    }
    if (!GOOGLE_API_KEY) {
      return json(
        { error: "GOOGLE_API_KEY not configured. Ask your admin to set it as a Supabase secret." },
        500,
      );
    }

    // Check household exists and subscription status
    const { data: household, error: hErr } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .single();
    if (hErr || !household) return json({ error: "Unknown household" }, 404);

    const premium =
      household.subscription_status === "active" ||
      household.subscription_status === "trialing";
    const cap = premium ? PREMIUM_MONTHLY_CAP : FREE_MONTHLY_CAP;

    // Count this household's generations/uploads since the start of the month
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

    // Remove background via Gemini
    const imageBytes = await removeBackground(imageBase64, mimeType ?? "image/jpeg");

    // Upload clean PNG to storage
    const filename = `uploads/${householdId}/${crypto.randomUUID()}.png`;
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

    // Record the generation for rate-limiting + auditing
    await admin.from("icon_generations").insert({
      household_id: householdId,
      prompt: label ?? "uploaded icon",
      storage_path: filename,
    });

    // Record in user_icons for the household's custom icon library
    const { error: insertErr } = await admin.from("user_icons").insert({
      household_id: householdId,
      storage_path: filename,
      label: label ?? "",
      prompt: label ?? null,
    });
    if (insertErr) {
      console.warn("Failed to insert user_icons record:", insertErr.message);
    }

    return json({
      ok: true,
      storagePath: filename,
      url: publicUrl,
      remaining: cap - (count ?? 0) - 1,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "background removal failed" }, 500);
  }
});
