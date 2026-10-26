import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * A readable message for a failed `supabase.functions.invoke`. On any non-2xx
 * reply supabase-js only says "Edge Function returned a non-2xx status code";
 * our functions send `{ error: "…" }` with the real reason, so show that.
 */
export async function functionErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await (err.context as Response).clone().json();
      if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    } catch {
      /* not JSON — fall through */
    }
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
