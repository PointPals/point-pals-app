import { memo } from "react";

/**
 * Full-viewport animated marketing hero scene:
 *  - Warm sparkly gradient backdrop matching the mascot art
 *  - Three mascots (Sunny/Pip/Bramble) walking across the ground
 *  - +1 / +2 point bubbles floating up and arcing toward the jar
 *  - Giant glass jar filling with rising rainbow marbles
 * Pure CSS/SVG — no canvas, no JS animation loop.
 */
function Mascot({
  color,
  belly,
  bellyColor,
}: {
  color: string;
  belly: "heart" | "book" | "star";
  bellyColor: string;
}) {
  return (
    <svg viewBox="0 0 120 130" width="100%" height="100%" aria-hidden>
      {/* legs (waddle) */}
      <g style={{ transformOrigin: "60px 105px", animation: "pp-legs 0.6s ease-in-out infinite" }}>
        <ellipse cx="46" cy="115" rx="10" ry="6" fill={color} opacity="0.9" />
        <ellipse cx="74" cy="115" rx="10" ry="6" fill={color} opacity="0.9" />
      </g>
      {/* body */}
      <ellipse cx="60" cy="72" rx="46" ry="42" fill={color} />
      {/* belly patch */}
      <ellipse cx="60" cy="82" rx="28" ry="24" fill="#FFF6E8" opacity="0.85" />
      {/* belly motif */}
      {belly === "heart" && (
        <path
          d="M60 96 C 48 84, 40 76, 48 70 C 54 66, 60 72, 60 78 C 60 72, 66 66, 72 70 C 80 76, 72 84, 60 96 Z"
          fill={bellyColor}
        />
      )}
      {belly === "book" && (
        <g>
          <rect x="46" y="74" width="28" height="20" rx="3" fill={bellyColor} />
          <rect x="46" y="74" width="28" height="20" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" />
          <line x1="60" y1="76" x2="60" y2="92" stroke="#fff" strokeWidth="1.5" />
        </g>
      )}
      {belly === "star" && (
        <path
          d="M60 72 L65 84 L78 85 L68 93 L71 106 L60 99 L49 106 L52 93 L42 85 L55 84 Z"
          fill={bellyColor}
        />
      )}
      {/* cheeks */}
      <circle cx="34" cy="58" r="6" fill="#FFB4C0" opacity="0.6" />
      <circle cx="86" cy="58" r="6" fill="#FFB4C0" opacity="0.6" />
      {/* eyes */}
      <circle cx="46" cy="50" r="7" fill="#2B2237" />
      <circle cx="74" cy="50" r="7" fill="#2B2237" />
      <circle cx="48" cy="48" r="2" fill="#fff" />
      <circle cx="76" cy="48" r="2" fill="#fff" />
      {/* smile */}
      <path d="M52 62 Q60 70 68 62" stroke="#2B2237" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* ears */}
      <circle cx="24" cy="36" r="8" fill={color} />
      <circle cx="96" cy="36" r="8" fill={color} />
    </svg>
  );
}

function PointBubble({
  delay,
  left,
  x,
  value,
  color,
}: {
  delay: string;
  left: string;
  x: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="absolute bottom-[22%]"
      style={{
        left,
        // custom prop drives horizontal arc target
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...({ "--pp-x": x } as React.CSSProperties),
        animation: `pp-point-up 4.5s ease-in ${delay} infinite`,
      }}
    >
      <div
        className="rounded-2xl px-3 py-1 font-display text-lg font-extrabold text-white shadow-lg"
        style={{ background: color }}
      >
        {value}
      </div>
    </div>
  );
}

const MARBLE_COLORS = [
  "#F472B6",
  "#F59E0B",
  "#10B981",
  "#60A5FA",
  "#A78BFA",
  "#FB7185",
  "#34D399",
  "#FBBF24",
];

function Marble({ i }: { i: number }) {
  const size = 22 + ((i * 7) % 14);
  const left = 10 + ((i * 37) % 80);
  const delay = (i * 0.6) % 8;
  const top = -70 - ((i * 13) % 20);
  const color = MARBLE_COLORS[i % MARBLE_COLORS.length];
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${left}%`,
        bottom: 0,
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, #ffffffcc, ${color} 55%, ${color} 100%)`,
        boxShadow: `0 4px 10px ${color}55, inset 0 -3px 6px ${color}88`,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...({ "--pp-top": `${top}%` } as React.CSSProperties),
        animation: `pp-marble-rise 10s ease-in ${delay}s infinite`,
      }}
    />
  );
}

function Sparkle({ top, left, delay, size = 6 }: { top: string; left: string; delay: string; size?: number }) {
  return (
    <div
      className="absolute rounded-full bg-white"
      style={{
        top,
        left,
        width: size,
        height: size,
        boxShadow: "0 0 12px 4px #ffffffaa",
        animation: `pp-sparkle 2.4s ease-in-out ${delay} infinite`,
      }}
    />
  );
}

export const AnimatedHeroScene = memo(function AnimatedHeroScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {/* backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 20% 20%, #FEE7B5 0%, transparent 60%)," +
            "radial-gradient(1000px 800px at 80% 30%, #FBD0E4 0%, transparent 60%)," +
            "radial-gradient(900px 700px at 50% 100%, #FDE68A 0%, transparent 55%)," +
            "linear-gradient(180deg, #FFF3D6 0%, #FCE7F3 55%, #FDE1EC 100%)",
        }}
      />
      {/* floating pastel orbs */}
      <div
        className="absolute w-40 h-40 rounded-full opacity-60 blur-2xl"
        style={{ top: "8%", left: "10%", background: "#FBCFE8", animation: "pp-drift 9s ease-in-out infinite" }}
      />
      <div
        className="absolute w-52 h-52 rounded-full opacity-50 blur-3xl"
        style={{ top: "20%", right: "18%", background: "#FDE68A", animation: "pp-drift 11s ease-in-out infinite 1s" }}
      />
      <div
        className="absolute w-40 h-40 rounded-full opacity-50 blur-2xl"
        style={{ bottom: "18%", left: "35%", background: "#BBF7D0", animation: "pp-drift 13s ease-in-out infinite 2s" }}
      />

      {/* sparkles */}
      {[
        { t: "12%", l: "22%", d: "0s" },
        { t: "18%", l: "78%", d: "0.6s" },
        { t: "30%", l: "45%", d: "1.2s" },
        { t: "8%", l: "60%", d: "1.8s" },
        { t: "38%", l: "12%", d: "2.4s" },
        { t: "42%", l: "88%", d: "0.9s" },
      ].map((s, i) => (
        <Sparkle key={i} top={s.t} left={s.l} delay={s.d} size={i % 2 === 0 ? 8 : 5} />
      ))}

      {/* ground band */}
      <div
        className="absolute inset-x-0 bottom-0 h-[28%]"
        style={{
          background:
            "linear-gradient(180deg, transparent, color-mix(in oklab, #F9A8D4 30%, transparent) 30%, color-mix(in oklab, #F472B6 22%, transparent) 100%)",
        }}
      />

      {/* Jar (right side) */}
      <div className="absolute right-[4%] bottom-[6%] w-[240px] h-[300px] sm:w-[300px] sm:h-[380px] lg:w-[360px] lg:h-[460px]">
        {/* lid */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-3 w-[80%] h-8 rounded-full"
          style={{
            background: "linear-gradient(180deg, #FDE68A, #F59E0B)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15), inset 0 -3px 4px #b45309aa",
          }}
        />
        {/* glass body */}
        <div
          className="absolute inset-x-0 top-4 bottom-0 overflow-hidden"
          style={{
            borderRadius: "40% 40% 46% 46% / 12% 12% 46% 46%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.15))",
            border: "3px solid rgba(255,255,255,0.9)",
            boxShadow:
              "inset 0 20px 40px rgba(255,255,255,0.6), inset 0 -30px 40px rgba(236,72,153,0.15), 0 20px 60px -20px rgba(236,72,153,0.5)",
          }}
        >
          {/* liquid fill */}
          <div
            className="absolute inset-x-0 bottom-0 h-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(244,114,182,0.35), rgba(251,191,36,0.35) 60%, rgba(16,185,129,0.35))",
              animation: "pp-jar-fill 10s ease-in-out infinite",
            }}
          />
          {/* marbles */}
          {Array.from({ length: 14 }).map((_, i) => (
            <Marble key={i} i={i} />
          ))}
          {/* highlight */}
          <div
            className="absolute top-4 left-4 h-2/3 w-3 rounded-full opacity-70"
            style={{ background: "linear-gradient(180deg, #fff, transparent)" }}
          />
        </div>
      </div>

      {/* Walking mascots along the ground */}
      <div className="absolute inset-x-0 bottom-[10%] h-40">
        <div
          className="absolute bottom-0 w-24 h-28 sm:w-32 sm:h-36"
          style={{ animation: "pp-walk 22s linear infinite" }}
        >
          <div style={{ animation: "pp-bob 0.6s ease-in-out infinite" }}>
            <Mascot color="#FCD34D" belly="heart" bellyColor="#F472B6" />
          </div>
        </div>
        <div
          className="absolute bottom-0 w-24 h-28 sm:w-32 sm:h-36"
          style={{ animation: "pp-walk 26s linear infinite", animationDelay: "-7s" }}
        >
          <div style={{ animation: "pp-bob 0.55s ease-in-out infinite" }}>
            <Mascot color="#93C5FD" belly="book" bellyColor="#60A5FA" />
          </div>
        </div>
        <div
          className="absolute bottom-0 w-24 h-28 sm:w-32 sm:h-36"
          style={{ animation: "pp-walk 30s linear infinite", animationDelay: "-15s" }}
        >
          <div style={{ animation: "pp-bob 0.65s ease-in-out infinite" }}>
            <Mascot color="#BBF7D0" belly="star" bellyColor="#F59E0B" />
          </div>
        </div>
      </div>

      {/* Point bubbles floating up toward jar */}
      <PointBubble delay="0s" left="12%" x="60vw" value="+1" color="#F472B6" />
      <PointBubble delay="1.4s" left="28%" x="45vw" value="+2" color="#F59E0B" />
      <PointBubble delay="2.8s" left="46%" x="30vw" value="+1" color="#10B981" />
      <PointBubble delay="0.6s" left="60%" x="18vw" value="+3" color="#60A5FA" />
      <PointBubble delay="3.6s" left="22%" x="55vw" value="+1" color="#A78BFA" />
    </div>
  );
});