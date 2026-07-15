/**
 * Capacitor SPA instrumentation — lightweight browser-only init.
 *
 * Skips Sentry (which pulls in @tanstack/start-server-core) for the
 * Capacitor build. Sentry can be added later via @sentry/browser or
 * @sentry/react if mobile crash reporting is needed.
 */

export const IS_BROWSER = typeof window !== "undefined";

if (IS_BROWSER) {
  // Log app version for debugging
  console.log(
    "[PointPals] Capacitor app loaded (build %s)",
    typeof __PP_BUILD_ID__ !== "undefined" ? __PP_BUILD_ID__ : "dev",
  );
}
