// Sentry client initialization - only runs in the browser (SSR-guarded).
// Uses dynamic import so it's safe even when the package isn't installed.

const IS_BROWSER = typeof window !== "undefined";

if (IS_BROWSER) {
  import("@sentry/tanstackstart-react").then((Sentry) => {
    Sentry.init({
      dsn: "https://1afbd0fe61f257cec3c81fdcc50ab72a@o4511692266536960.ingest.us.sentry.io/4511692268699648",

      dataCollection: {
        // To disable sending user data and HTTP bodies, uncomment the lines below.
        // userInfo: false,
        // httpBodies: [],
      },

      integrations: [
        Sentry.replayIntegration(),
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for tracing.
      tracesSampleRate: 1.0,

      // Capture Replay for 10% of all sessions,
      // plus for 100% of sessions with an error.
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Enable logs to be sent to Sentry
      enableLogs: true,
    });
  }).catch(() => {
    // Sentry package not available - skip client-side init silently
  });
}

export { IS_BROWSER };
