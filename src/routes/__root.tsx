import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { captureError } from "../lib/monitoring";
import { AppProvider } from "../lib/app-store";
import { CorrectionProvider } from "../lib/correction-store";
import { AppShell } from "../components/AppShell";
import { ClientBoot } from "../components/ClientBoot";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-extrabold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">That page doesn't exist yet.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    captureError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "PointPals — Family chores & behaviour, made kind" },
      {
        name: "description",
        content:
          "PointPals is a warm, pastel family chore & behaviour tracker — the NZ-made chore chart app that turns everyday tasks into shared rewards kids work toward together.",
      },
      { name: "theme-color", content: "#FBF7EC" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "PointPals" },
      { property: "og:title", content: "PointPals — NZ Family Chore & Behaviour Chart App" },
      {
        property: "og:description",
        content:
          "The family chore chart that works: award points for chores & good behaviour, fill the shared jar, and celebrate rewards chosen together. Research-backed and NZ-made.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PointPals" },
      { property: "og:url", content: "https://pointpals.co.nz/welcome" },
      { property: "og:image", content: "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/pp-hero.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "en_NZ" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/pp-hero.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/app-icon.png" },
      // iOS launch screen fallback. Without per-device PNGs iOS shows the
      // icon centered on the manifest background_color — good enough until
      // dedicated splash art is generated.
      { rel: "apple-touch-startup-image", href: "/app-icon.png" },
      { rel: "canonical", href: "https://pointpals.co.nz/welcome" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://pointpals.co.nz/#org",
              name: "PointPals",
              url: "https://pointpals.co.nz",
              logo: "https://pointpals.co.nz/app-icon.png",
              email: "support@pointpals.co.nz",
              areaServed: "NZ",
            },
            {
              "@type": "WebSite",
              "@id": "https://pointpals.co.nz/#website",
              name: "PointPals",
              url: "https://pointpals.co.nz",
              publisher: { "@id": "https://pointpals.co.nz/#org" },
              inLanguage: "en-NZ",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <CorrectionProvider>
        <ClientBoot />
        <AppShell>
          <Outlet />
        </AppShell>
        </CorrectionProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
