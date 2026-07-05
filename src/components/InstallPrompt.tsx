import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { url as logoUrl } from "@/assets/brand/pointpals-logo-points.asset.json";

// "Add to Home Screen" banner (§2c). Appears — as a dismissible card above the
// bottom nav, never a modal — once a user has opened the app 2+ times and the
// browser has offered an install (beforeinstallprompt). Hidden on desktop, when
// already installed, or after the user dismisses it (remembered in
// localStorage). iOS Safari never fires beforeinstallprompt, so the banner
// simply doesn't appear there.

const DISMISS_KEY = "pointpals.install.dismissed";
const SESSIONS_KEY = "pointpals.sessions";
const SESSION_FLAG = "pointpals.session-counted";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function countSession(): number {
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      const n = Number(localStorage.getItem(SESSIONS_KEY) ?? "0") + 1;
      localStorage.setItem(SESSIONS_KEY, String(n));
      return n;
    }
    return Number(localStorage.getItem(SESSIONS_KEY) ?? "0");
  } catch {
    return 0;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Never on desktop, when already installed, or after a prior dismissal.
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* ignore */
    }
    const sessions = countSession();
    if (standalone || !coarse || dismissed) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (sessions >= 2) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!show || !deferred) return null;

  const install = async () => {
    setShow(false);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user cancelled or unsupported */
    }
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-x-4 z-40 pp-install-banner">
      <div className="mx-auto max-w-md card-soft flex items-center gap-3 p-3 pr-2 shadow-xl animate-toast-in">
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          className="h-10 w-auto shrink-0 select-none"
          draggable={false}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">
            Add PointPals to your home screen
          </div>
          <div className="text-xs text-muted-foreground">Full-screen, one tap away.</div>
        </div>
        <button
          onClick={install}
          className="tap inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold"
        >
          <Download className="w-4 h-4" /> Add
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="tap p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
