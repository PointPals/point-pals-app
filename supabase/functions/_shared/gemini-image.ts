// Shared Gemini image call for generate-icon and upload-icon.
//
// Google retires image models on a schedule — gemini-2.5-flash-image was shut
// down on 2 Oct 2026, which took both icon functions down with a 404. So try
// the current model first and step down the list only when Google says the
// model doesn't exist; anything else (quota, bad key, safety) is returned as-is
// so it isn't retried against every model. Set the GEMINI_IMAGE_MODEL secret
// to move to a newer model without a code change.

const MODELS = [
  Deno.env.get("GEMINI_IMAGE_MODEL"),
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
].filter((m, i, all): m is string => !!m && all.indexOf(m) === i);

const MODEL_GONE = /not found|no longer available|deprecated|retired|is not supported/i;

/** POST a generateContent body to the first image model that still exists. */
export async function geminiImageRequest(apiKey: string, body: unknown): Promise<Response> {
  for (let i = 0; i < MODELS.length; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS[i]}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.ok || i === MODELS.length - 1) return res;
    if (res.status !== 404 && res.status !== 400) return res;
    const text = await res.text();
    if (res.status === 404 || MODEL_GONE.test(text)) {
      console.warn(`Gemini model ${MODELS[i]} unavailable (${res.status}); trying the next one`);
      continue;
    }
    return new Response(text, { status: res.status, headers: res.headers });
  }
  throw new Error("No Gemini image model configured");
}

type Part = { text?: string; thought?: boolean; inlineData?: { mimeType?: string; data?: string } };

/** The final image in a response — newer models can also return draft "thought" images. */
export function pickImagePart(parts: Part[]): Part | undefined {
  const images = parts.filter((p) => p.inlineData?.mimeType?.startsWith("image/") && p.inlineData.data);
  return images.filter((p) => !p.thought).at(-1) ?? images.at(-1);
}
