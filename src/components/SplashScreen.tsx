// Full-screen splash shown while the app boots. Ziggy + logo + rotating marbles.
// Lives outside AppShell so it renders before hydration completes.

import { COMPANION_URLS } from "@/lib/image-urls";

const MARBLES = [
  { color: "#8FC7EA", label: "sky", delay: 0 },
  { color: "#F1D36A", label: "butter", delay: 0.15 },
  { color: "#9CD08C", label: "sage", delay: 0.3 },
  { color: "#EDA6B2", label: "blush", delay: 0.45 },
  { color: "#B79BE0", label: "lilac", delay: 0.6 },
  { color: "#E0B673", label: "sand", delay: 0.75 },
  { color: "#84CFCB", label: "foam", delay: 0.9 },
  { color: "#F0A858", label: "orange", delay: 1.05 },
];

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FBF7EC] overflow-hidden">
      {/* Warm ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 40%, rgba(251,207,232,0.5), transparent 70%)," +
            "radial-gradient(50% 40% at 30% 60%, rgba(191,219,254,0.4), transparent 70%)," +
            "radial-gradient(45% 35% at 70% 50%, rgba(253,230,138,0.35), transparent 70%)",
        }}
      />

      {/* Orbiting marbles first — the marble jar is the app's signature. */}
      <div className="relative w-48 h-48 mb-2">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Orbit ring */}
          <div
            className="w-40 h-40 rounded-full border border-foreground/10"
            aria-hidden
          />
        </div>
        {MARBLES.map((m) => (
          <div
            key={m.label}
            className="absolute left-1/2 top-1/2"
            style={{
              marginLeft: -10,
              marginTop: -10,
              animation: `pp-splash-orbit 3s ease-in-out ${m.delay}s infinite`,
            }}
          >
            <div
              className="h-5 w-5 rounded-full shadow-md"
              style={{
                backgroundColor: m.color,
                boxShadow: `0 0 14px ${m.color}aa`,
              }}
            />
          </div>
        ))}

        {/* Central shimmer */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full"
          style={{
            background: "linear-gradient(135deg, #F1D36A, #EDA6B2)",
            boxShadow: "0 0 20px rgba(241,211,106,0.5)",
            animation: "pp-pulse 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Logo — Ziggy mascot + wordmark */}
      <div className="relative z-10 mt-6 flex flex-col items-center">
        {/* Ziggy: fits inside the frame, not squashed */}
        <img
          src={COMPANION_URLS.ziggy}
          alt="PointPals"
          className="h-24 w-auto max-w-[120px] mx-auto mb-3 select-none object-contain"
          draggable={false}
        />
        <h1 className="font-display text-3xl font-bold text-center tracking-tight">
          PointPals
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1 max-w-[260px]">
          Family chores &amp; behaviour, made kind
        </p>
      </div>

      <p className="relative z-10 mt-8 text-xs text-muted-foreground/50 animate-pulse tracking-wider uppercase">
        Loading…
      </p>

      <style>{`
        @keyframes pp-splash-orbit {
          0% {
            transform: rotate(0deg) translateX(70px) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            opacity: 1;
          }
          50% {
            transform: rotate(180deg) translateX(70px) rotate(-180deg);
            opacity: 1;
          }
          75% {
            opacity: 0.7;
          }
          100% {
            transform: rotate(360deg) translateX(70px) rotate(-360deg);
            opacity: 0.3;
          }
        }
        @keyframes pp-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
        }
      `}</style>
    </div>
  );
}
