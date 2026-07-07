import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://1afbd0fe61f257cec3c81fdcc50ab72a@o4511692266536960.ingest.us.sentry.io/4511692268699648",

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below.
    // userInfo: false,
    // httpBodies: [],
  },

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
});
