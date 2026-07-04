import type { Companion, PastelKey } from "@/lib/mock-data";
import { PASTEL_HEX } from "@/lib/mock-data";

// Pixar-plush-inspired SVG stand-in. Vector so all 8 look consistent
// without depending on AI image generation for the prototype.
export function PlushCompanion({
  companion,
  locked = false,
  size = 140,
}: {
  companion: Companion;
  locked?: boolean;
  size?: number;
}) {
  const bodyFill = locked ? "#D4CFC5" : PASTEL_HEX[companion.color];
  const accent = locked ? "#B8B3A8" : shift(companion.color);
  const eyeFill = locked ? "#7A7568" : "#3C2F26";

  const body = bodyPath(companion.bodyShape);

  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className="drop-shadow-[0_10px_16px_rgba(120,110,90,0.15)]">
      <defs>
        <radialGradient id={`sheen-${companion.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shade-${companion.id}`} cx="70%" cy="80%" r="70%">
          <stop offset="0%" stopColor="black" stopOpacity="0.14" />
          <stop offset="80%" stopColor="black" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="80" cy="146" rx="42" ry="6" fill="black" opacity="0.08" />

      {/* body */}
      <path d={body} fill={bodyFill} />
      <path d={body} fill={`url(#shade-${companion.id})`} />
      <path d={body} fill={`url(#sheen-${companion.id})`} />

      {/* belly patch (only Ridge in mock — subtle for others) */}
      {companion.id === "ridge" && !locked && (
        <ellipse cx="80" cy="105" rx="22" ry="18" fill={PASTEL_HEX.sand} opacity="0.9" />
      )}

      {/* chest symbol badge */}
      <circle cx="80" cy="100" r="14" fill="white" opacity={locked ? 0.35 : 0.85} />
      <text x="80" y="106" textAnchor="middle" fontSize="17" style={{ filter: locked ? "grayscale(1)" : undefined, opacity: locked ? 0.5 : 1 }}>
        {companion.symbol}
      </text>

      {/* eyes — large glossy ovals */}
      <ellipse cx="66" cy="72" rx="7" ry="9" fill={eyeFill} />
      <ellipse cx="94" cy="72" rx="7" ry="9" fill={eyeFill} />
      {!locked && (
        <>
          <circle cx="63" cy="68" r="2.2" fill="white" />
          <circle cx="91" cy="68" r="2.2" fill="white" />
        </>
      )}

      {/* tiny closed smile */}
      <path d="M 74 87 Q 80 90 86 87" stroke={eyeFill} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={locked ? 0.5 : 1} />

      {/* accent (little sprout for Fern, ear-leaf for Bramble) */}
      {companion.id === "fern" && !locked && (
        <path d="M 80 32 Q 76 22 82 18 Q 88 24 80 32 Z" fill={accent} />
      )}
      {companion.id === "bramble" && !locked && (
        <path d="M 118 44 Q 128 42 126 52 Q 118 54 118 44 Z" fill={PASTEL_HEX.sage} stroke="#6a8a68" strokeWidth="0.5" />
      )}
    </svg>
  );
}

function bodyPath(shape: Companion["bodyShape"]) {
  switch (shape) {
    case "egg":
      return "M 80 40 C 45 40 40 90 42 110 C 44 132 60 140 80 140 C 100 140 116 132 118 110 C 120 90 115 40 80 40 Z";
    case "pear":
      return "M 80 42 C 60 42 55 62 56 78 C 40 92 40 122 60 134 C 72 141 88 141 100 134 C 120 122 120 92 104 78 C 105 62 100 42 80 42 Z";
    case "dumpling":
    default:
      return "M 80 40 C 45 40 34 70 36 96 C 38 124 55 140 80 140 C 105 140 122 124 124 96 C 126 70 115 40 80 40 Z";
  }
}

function shift(color: PastelKey): string {
  // slightly deeper accent for details
  const map: Record<PastelKey, string> = {
    sky: "#7FA9CE",
    butter: "#D9BE58",
    sage: "#8FB585",
    blush: "#D19AA6",
    lilac: "#B39CD9",
    sand: "#C9A672",
    foam: "#82BEBC",
  };
  return map[color];
}
