/**
 * ParentalGate – a lightweight adult-verification step.
 *
 * Apple and Google both look for this on apps that kids could plausibly
 * encounter (even if marketed to parents).  A simple arithmetic problem is
 * the standard pattern — it's not a security measure, it's a store-policy
 * signal that says "we only let adults reach purchase flows."
 *
 * Usage:
 *   const [showPaywall, setShowPaywall] = useState(false);
 *   return (
 *     <ParentalGate onPassed={() => setShowPaywall(true)}>
 *       <button>Subscribe</button>
 *     </ParentalGate>
 *   );
 *
 * The gate only fires on native (Capacitor); on web it passes children
 * through transparently since the PWA doesn't go through app-store review.
 */

import { useState, type ReactNode } from "react";
import { isNative } from "@/lib/platform";

interface Props {
  children: ReactNode;
  onPassed: () => void;
}

export function ParentalGate({ children, onPassed }: Props) {
  if (!isNative()) {
    // Web/PWA — no store rules apply; skip the gate.
    return <>{children}</>;
  }

  const [open, setOpen] = useState(false);

  // Trap: show the gate once per session before the first protected action.
  const [passed, setPassed] = useState(() => {
    // Allow the user to re-verify if they haven't yet.
    try {
      return sessionStorage.getItem("pp_parental_gate") === "1";
    } catch {
      return false;
    }
  });

  const handleClick = () => {
    if (passed) {
      onPassed();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <span onClick={handleClick} className="contents">
        {children}
      </span>

      {open && (
        <ArithmeticGate
          onPassed={() => {
            try { sessionStorage.setItem("pp_parental_gate", "1"); } catch {}
            setPassed(true);
            setOpen(false);
            onPassed();
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─────────────── math gate overlay ─────────────── */

function ArithmeticGate({ onPassed, onCancel }: { onPassed: () => void; onCancel: () => void }) {
  const [a] = useState(() => Math.floor(Math.random() * 9) + 2); // 2–10
  const [b] = useState(() => Math.floor(Math.random() * 9) + 2);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);

  const correct = a * b;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() === String(correct)) {
      onPassed();
    } else {
      setWrong(true);
      setAnswer("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="card-soft w-full max-w-sm p-6 space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Please verify you're an adult to continue
        </p>
        <p className="font-display text-2xl font-bold">
          {a} × {b} = ?
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setWrong(false); }}
            className="w-24 text-center text-lg font-semibold rounded-xl border border-input bg-card px-3 py-2.5"
          />
          {wrong && (
            <p className="text-xs text-destructive">Not quite — try again.</p>
          )}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-input bg-card px-5 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
