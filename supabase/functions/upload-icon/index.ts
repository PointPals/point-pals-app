// Background-removal edge function — strips the background from a user-uploaded
// photo using Gemini 2.0 Flash (Imagen via gemini-2.0-flash-exp), producing a transparent PNG that sits
// on the coloured tiles alongside the pre-made registry icons.
//
// Deploy: `supabase functions deploy upload-icon`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY
//
// Rate-limited per household via public.icon_generations (shared cap with AI
// generation — see generate-icon for details).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
// @ts-ignore — pngjs loaded via npm: specifier for Deno compat
import pngjs from "npm:pngjs@7.4.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const GOOGLE_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const FREE_MONTHLY_CAP = 10;
const PREMIUM_MONTHLY_CAP = 10;

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
    // Best-effort — don't let error logging cause cascading failures
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

/**
 * Post-process a PNG buffer by chroma-keying out #00FF00 green.
 *
 * Gemini 2.5 Flash cannot natively produce alpha-channel transparency — it
 * cannot render "transparent" pixels. Instead we ask Gemini to place the
 * subject on a solid-green background (#00FF00) and this function keys
 * that green out to real transparency.
 *
 * Algorithm:
 * 1. For each pixel compute its colour distance from #00FF00 in RGB space.
 * 2. If distance < threshold → background → set fully transparent.
 * 3. Near the threshold boundary, use proportional alpha for feathering.
 */
function cleanTransparency(raw: Uint8Array): Uint8Array {
  try {
    const png = pngjs.PNG.sync.read(raw);
    const data = png.data;

    const KEY_R = 0, KEY_G = 255, KEY_B = 0;
    const THRESHOLD = 80;       // max RGB-distance for a "solid background" pixel
    const FEATHER_MIN = 80;     // distance at which feathering starts
    const FEATHER_MAX = 120;    // distance at which pixel is fully subject

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Euclidean distance in RGB space from key green
      const dr = r - KEY_R;
      const dg = g - KEY_G;
      const db = b - KEY_B;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      let alpha = 255;
      if (dist <= THRESHOLD) {
        alpha = 0;
      } else if (dist < FEATHER_MAX) {
        // Linear feather between FEATHER_MIN and FEATHER_MAX
        alpha = Math.round(((dist - FEATHER_MIN) / (FEATHER_MAX - FEATHER_MIN)) * 255);
        alpha = Math.max(0, Math.min(255, alpha));
      }

      if (alpha < 255) {
        // Preserve original RGB but force alpha
        data[i + 3] = alpha;
        // Zero out RGB for fully transparent pixels (cleaner PNG)
        if (alpha === 0) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
        }
      }
    }

    return pngjs.PNG.sync.write(png);
  } catch {
    return raw;
  }
}

/**
 * Crop the subject to its bounding box, then re-center on a padded square
 * canvas so uploaded/photo icons fill roughly the same proportion as the
 * pre-made icon library (subject ≈80 % of tile width/height).
 *
 * Without this, a portrait photo ends up as a small floating head in a sea
 * of transparent pixels — looks much smaller than the square pre-made icons.
 */
function cropAndPadToSquare(raw: Uint8Array, paddingFrac = 0.12): Uint8Array {
  try {
    const png = pngjs.PNG.sync.read(raw);
    const { width, height, data } = png;

    // ── 1. Find bounding box of non‑transparent pixels ────────────────
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let opaquePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 30) { // 30 = nearly-transparent threshold
          opaquePixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If no opaque pixels or already fills most of the canvas, skip
    if (opaquePixels < 50) return raw;
    const fillRatio = opaquePixels / (width * height);
    if (fillRatio > 0.65) return raw; // already fills enough space

    // ── 2. Expand bounding box by padding ─────────────────────────────
    const subjectW = maxX - minX + 1;
    const subjectH = maxY - minY + 1;
    const padX = Math.max(Math.round(subjectW * paddingFrac), 4);
    const padY = Math.max(Math.round(subjectH * paddingFrac), 4);

    const cropLeft = Math.max(0, minX - padX);
    const cropTop = Math.max(0, minY - padY);
    const cropRight = Math.min(width - 1, maxX + padX);
    const cropBottom = Math.min(height - 1, maxY + padY);
    const cropW = cropRight - cropLeft + 1;
    const cropH = cropBottom - cropTop + 1;

    // ── 3. Create new square canvas, center the cropped subject ───────
    const size = Math.max(cropW, cropH);
    const out = new pngjs.PNG({ width: size, height: size });
    const outData = out.data;
    // Initialise to fully transparent (already zeroed by pngjs constructor)

    const offsetX = Math.floor((size - cropW) / 2);
    const offsetY = Math.floor((size - cropH) / 2);

    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcIdx = ((cropTop + y) * width + (cropLeft + x)) * 4;
        const dstIdx = ((offsetY + y) * size + (offsetX + x)) * 4;
        outData[dstIdx] = data[srcIdx];
        outData[dstIdx + 1] = data[srcIdx + 1];
        outData[dstIdx + 2] = data[srcIdx + 2];
        outData[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    return pngjs.PNG.sync.write(out);
  } catch {
    return raw;
  }
}

/** Call Gemini 2.0 Flash to remove the background from the uploaded image. */
async function removeBackground(imageBase64: string, mimeType: string): Promise<Uint8Array> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Remove the entire background from this image completely. Replace the background with a solid green screen color #00FF00 (pure green, hex 00FF00, RGB 0,255,0). The subject must NOT have any green tint. The resulting image should be: subject exactly as-is on a solid #00FF00 background. This is for chroma-key processing. Output as PNG." },
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

  // Post-process: strip transparency artefacts, then crop + center on a
  // square canvas so the subject fills ≈80 % of the tile (matching the
  // visual weight of pre-made icon library PNGs).
  const cleaned = cleanTransparency(bytes);
  return cropAndPadToSquare(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let householdId: string | null = null;
  try {
    const body = await req.json();
    householdId = body.householdId;
    const { imageBase64, label, mimeType } = body;
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
    const message = e instanceof Error ? e.message : "background removal failed";

    // If it's a Gemini API error, log it and potentially alert
    if (message.includes("Gemini API error")) {
      const statusMatch = message.match(/error (\d+):/);
      const httpStatus = statusMatch ? parseInt(statusMatch[1]) : null;
      const errorType = classifyGeminiError(httpStatus ?? 0, message);
      await logError(householdId, "upload-icon", errorType, message, httpStatus, message);

      // Send alert for critical errors (quota/billing/key issues)
      if (errorType === "quota_exceeded" || errorType === "invalid_key") {
        // Fire-and-forget — don't let email delay the response
        (async () => { await sendBillingAlert(errorType, message); })();
      }

      // Return a friendly error to the user
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
