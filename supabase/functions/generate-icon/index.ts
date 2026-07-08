// AI icon generation — RATE-LIMITED per household so generation costs stay
// predictable. Each household gets a capped number of generations per calendar
// month; premium households get a higher cap. The ledger lives in
// public.icon_generations.
//
// Deploy: `supabase functions deploy generate-icon`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY
//
// Uses Google Gemini 2.0 Flash (gemini-2.0-flash-exp) to generate on-brand
// PointPals icons. The style prompt ensures visual consistency with the
// existing icon set.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image as RasterImage } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// ── Inline shared helpers ─────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const GOOGLE_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

// Monthly caps by entitlement — tune freely; this is the cost guardrail.
const FREE_MONTHLY_CAP = 10;
const PREMIUM_MONTHLY_CAP = 120;

// Style prompt to keep generated icons visually consistent with the existing set.
// NOTE: the image model can't emit real alpha — asking for "transparent" gets a
// painted checkerboard. We ask for a plain white background instead and knock
// it out ourselves (see makeBackgroundTransparent).
const STYLE_PROMPT = `A single icon illustration only — no background tile, no coloured card, no sticker border, no drop shadow. Plain solid pure white (#FFFFFF) background filling the whole canvas — never a checkerboard or grey "transparency" pattern. Flat-but-dimensional custom icon style — friendly, slightly rounded, chunky illustration with soft gradients and gentle highlights, a soft warm-charcoal outline (not pure black). Soft pastel colour palette — dusty blue, buttercream yellow, sage green, blush pink, lilac, warm sand, seafoam. No text, no letters, no numbers, no watermark, no photorealism, no rendered human faces (use an object stand-in instead, e.g. a toothbrush rather than a child brushing teeth). Square canvas, generous padding, centred.`;

/** Knock out the solid white background so icons sit cleanly on coloured
 * tiles: flood-fill from the canvas edges, clearing near-white pixels. White
 * INSIDE the artwork (e.g. book pages) is unreachable from the edges and
 * survives. Accepts PNG or JPEG bytes; always returns PNG. */
async function makeBackgroundTransparent(bytes: Uint8Array): Promise<Uint8Array> {
  const img = await RasterImage.decode(bytes);
  const { width, height } = img;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  // ImageScript pixel coordinates are 1-based.
  const tryPush = (x: number, y: number) => {
    const i = (y - 1) * width + (x - 1);
    if (visited[i]) return;
    const [r, g, b, a] = RasterImage.colorToRGBA(img.getPixelAt(x, y));
    if (a > 0 && r > 238 && g > 238 && b > 238) {
      visited[i] = 1;
      stack.push(x, y);
    }
  };

  for (let x = 1; x <= width; x++) {
    tryPush(x, 1);
    tryPush(x, height);
  }
  for (let y = 1; y <= height; y++) {
    tryPush(1, y);
    tryPush(width, y);
  }
  while (stack.length > 0) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    img.setPixelAt(x, y, 0x00000000);
    if (x > 1) tryPush(x - 1, y);
    if (x < width) tryPush(x + 1, y);
    if (y > 1) tryPush(x, y - 1);
    if (y < height) tryPush(x, y + 1);
  }
  return await img.encode();
}

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Classify a Gemini error to determine alerting and logging behaviour. */
function classifyGeminiError(httpStatus: number, body: string) {
  const lower = body.toLowerCase();
  if (httpStatus === 429 || lower.includes("quota") || lower.includes("rate_limit") || lower.includes("resource_exhausted")) {
    return "quota_exceeded";
  }
  if (httpStatus === 400 && lower.includes("api_key")) {
    return "invalid_key";
  }
  if (httpStatus === 404 && lower.includes("not found")) {
    return "model_not_found";
  }
  return "gemini_error";
}

/** Log an error to the icon_generation_errors table. */
async function logError(householdId: string | null, fnName: string, errorType: string, message: string, httpStatus: number | null, rawBody: string) {
  try {
    await admin.from("icon_generation_errors").insert({
      household_id: householdId ?? null,
      function_name: fnName,
      error_type: errorType,
      error_message: message.slice(0, 2000),
      http_status: httpStatus,
      raw_response: rawBody.slice(0, 4000),
    });
  } catch {
    // Best-effort
  }
}

/** Send an alert email to support@pointpals.co.nz for billing/quota errors. */
async function sendBillingAlert(errorType: string, message: string) {
  if (!RESEND_API_KEY) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PointPals Alerts <alerts@pointpals.co.nz>",
        to: "support@pointpals.co.nz",
        subject: `⚠️ Gemini API Alert — ${errorType === "quota_exceeded" ? "Spend cap / quota reached" : "API key issue"}`,
        html: `<p><strong>Gemini API Alert — ${errorType}</strong></p>
<p>Error: ${message.replace(/</g, "&lt;").slice(0, 1000)}</p>
<p>Time: ${new Date().toISOString()}</p>
<p>Action needed: Check your Google Cloud billing and API key settings.</p>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("Billing alert email failed:", text);
    }
  } catch (e) {
    console.warn("Failed to send billing alert:", e);
  }
}

/** Call Gemini 2.0 Flash to generate an icon image. */
async function generateImage(prompt: string): Promise<Uint8Array> {
  const fullPrompt = `${STYLE_PROMPT}\n\n${prompt}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`;

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
  let householdId: string | null = null;
  try {
    const body = await req.json();
    householdId = body.householdId;
    const { prompt } = body;
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

    // Generate the image via Gemini, then knock the white background out so
    // the icon sits cleanly on coloured tiles. If post-processing fails for
    // any reason, fall back to the raw image rather than failing the request.
    let imageBytes = await generateImage(prompt);
    try {
      imageBytes = await makeBackgroundTransparent(imageBytes);
    } catch (e) {
      console.warn("Background removal failed, using raw image:", e instanceof Error ? e.message : e);
    }

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

    // Save to user_icons so the generated icon appears in the library.
    const { error: insertErr } = await admin.from("user_icons").insert({
      household_id: householdId,
      storage_path: filename,
      label: prompt,
      prompt,
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
    const message = e instanceof Error ? e.message : "generation failed";

    if (message.includes("Gemini API error")) {
      const statusMatch = message.match(/error (\d+):/);
      const httpStatus = statusMatch ? parseInt(statusMatch[1]) : null;
      const errorType = classifyGeminiError(httpStatus ?? 0, message);
      await logError(householdId, "generate-icon", errorType, message, httpStatus, message);

      if (errorType === "quota_exceeded" || errorType === "invalid_key") {
        (async () => { await sendBillingAlert(errorType, message); })();
      }

      if (errorType === "quota_exceeded") {
        return json({
          error: "Sorry, the AI icon service has reached its monthly usage limit. Please try again next month, or contact support.",
        }, 429);
      }
      if (errorType === "invalid_key") {
        return json({
          error: "Icon service is not fully configured yet — the admin needs to set up the Google API key.",
        }, 500);
      }
      if (errorType === "model_not_found") {
        return json({
          error: "Icon generation AI needs an update — this is a server-side issue that will be fixed soon.",
        }, 500);
      }
    }

    return json({ error: message }, 500);
  }
});
