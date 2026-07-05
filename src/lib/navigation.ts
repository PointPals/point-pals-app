import { useRouter } from "@tanstack/react-router";

// The four root nav tabs — everything else is a "sub-page" that should offer a
// back affordance in the header (a PWA standalone shell has no browser chrome).
export const ROOT_TABS = ["/", "/library", "/memories", "/rewards"] as const;

export function isRootTab(pathname: string): boolean {
  return (ROOT_TABS as readonly string[]).includes(pathname);
}

// Human label for a sub-page, shown next to the back chevron.
const TITLES: Record<string, string> = {
  "/settings": "Settings",
  "/about": "About",
  "/onboarding": "Set up",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/refunds": "Refunds",
};

export function pageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  for (const [path, title] of Object.entries(TITLES)) {
    if (pathname.startsWith(path + "/")) return title;
  }
  // Fallback: derive from the last path segment.
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "Back";
}

// Go back through the router history stack; if we were deep-linked straight in
// (no prior entry), fall back to Home so the button is never a dead end.
export function useBackNav() {
  const router = useRouter();
  const canGoBack = router.history.length > 1;
  const goBack = () => {
    if (canGoBack) router.history.back();
    else router.navigate({ to: "/" });
  };
  return { canGoBack, goBack };
}
