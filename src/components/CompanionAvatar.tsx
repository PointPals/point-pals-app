import type { PastelKey } from "@/lib/mock-data";
import { PASTEL_HEX } from "@/lib/mock-data";
import { companionImageUrl } from "@/lib/companion-assets";

// Each kid is shown as their chosen companion avatar (§2). The real product
// swaps in AI-generated mascot art from Supabase Storage; until that bucket is
// reachable this renders a warm, deterministic vector face so every kid still
// has a distinct, friendly companion (no emoji, no broken image).
//
// `companionImageUrl(seed)` is the single swap point: return a real URL there
// and this component uses it automatically, falling back to the vector face.

const ACCENT: Record<PastelKey, string> = {
  sky: "#6E9BC6",
  butter: "#D3B347",
  sage: "#7FAe74",
  blush: "#CE8593",
  lilac: "#9E82CF",
  sand: "#C39A5F",
  foam: "#5FBCB7",
};

// tiny deterministic hash → stable per-kid features
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function CompanionAvatar({
  seed,
  color,
  size = 60,
}: {
  seed: string;
  color: PastelKey;
  size?: number;
}) {
  const url = companionImageUrl(seed);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />
    );
  }

  const h = hash(seed);
  const eyeGap = 9 + (h % 4); // 9..12
  const cheeky = (h >> 3) % 2 === 0;
  const ears = (h >> 5) % 3; // 0 round, 1 pointy, 2 none
  const accent = ACCENT[color];
  const body = PASTEL_HEX[color];

  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className="select-none pointer-events-none">
      {/* ears */}
      {ears === 0 && (
        <>
          <circle cx="18" cy="14" r="7" fill={body} stroke={accent} strokeWidth="1.5" />
          <circle cx="42" cy="14" r="7" fill={body} stroke={accent} strokeWidth="1.5" />
        </>
      )}
      {ears === 1 && (
        <>
          <path
            d="M14 18 L18 4 L26 16 Z"
            fill={body}
            stroke={accent}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M46 18 L42 4 L34 16 Z"
            fill={body}
            stroke={accent}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* head */}
      <circle cx="30" cy="32" r="19" fill={body} />
      <ellipse cx="30" cy="44" rx="14" ry="9" fill="#ffffff" opacity="0.25" />

      {/* cheeks */}
      {cheeky && (
        <>
          <circle cx="19" cy="36" r="3.4" fill={accent} opacity="0.35" />
          <circle cx="41" cy="36" r="3.4" fill={accent} opacity="0.35" />
        </>
      )}

      {/* eyes */}
      <circle cx={30 - eyeGap} cy="30" r="3.2" fill="#3C2F26" />
      <circle cx={30 + eyeGap} cy="30" r="3.2" fill="#3C2F26" />
      <circle cx={30 - eyeGap - 1} cy="29" r="1.1" fill="#fff" />
      <circle cx={30 + eyeGap - 1} cy="29" r="1.1" fill="#fff" />

      {/* smile */}
      <path
        d={`M ${30 - 5} 38 Q 30 ${cheeky ? 43 : 41} ${30 + 5} 38`}
        stroke="#3C2F26"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
