import { memo } from "react";
import heroVideo from "@/assets/hero-background-video.mp4.asset.json";

/**
 * Animated marketing background: a huge ghostly marble jar breathes behind
 * everything, surrounded by drifting pastel marbles that tumble and float
 * across the whole hero. Purely decorative, sits behind all content.
 */

const MARBLES = [
  { c: "#F9B4C1", size: 96, top: "8%", left: "6%", dur: "18s", delay: "0s" },
  { c: "#F3D375", size: 72, top: "14%", left: "82%", dur: "22s", delay: "-4s" },
  { c: "#9CD08C", size: 110, top: "68%", left: "3%", dur: "26s", delay: "-8s" },
  { c: "#B79BE0", size: 84, top: "78%", left: "70%", dur: "20s", delay: "-2s" },
  { c: "#8FC7EA", size: 130, top: "45%", left: "88%", dur: "28s", delay: "-12s" },
  { c: "#E0B673", size: 66, top: "34%", left: "22%", dur: "24s", delay: "-6s" },
  { c: "#84CFCB", size: 90, top: "88%", left: "42%", dur: "30s", delay: "-14s" },
  { c: "#EDA6B2", size: 58, top: "22%", left: "58%", dur: "19s", delay: "-9s" },
  { c: "#F1D36A", size: 78, top: "58%", left: "48%", dur: "23s", delay: "-3s" },
];

export const HeroBackground = memo(function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {/* Ambient looping hero video — chibi mascots dropping marbles into the jar. */}
      <video
        src={heroVideo.url}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      {/* Soft wash so overlay content stays readable. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--background))]/85 via-[hsl(var(--background))]/40 to-transparent" />

      {/* Toppled ghost jar tilted on its side, breathing softly. */}
      <svg
        viewBox="0 0 300 200"
        className="absolute -left-16 bottom-4 w-[70vw] max-w-[900px] h-auto"
        style={{ animation: "pp-jar-breathe 8s ease-in-out infinite", transformOrigin: "center" }}
      >
        <defs>
          <linearGradient id="ghostjar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F9B4C1" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <g transform="rotate(-18 150 100)">
          <rect x="30" y="60" width="220" height="110" rx="30" fill="url(#ghostjar)" stroke="rgba(150,120,140,0.35)" strokeWidth="2" />
          <rect x="20" y="52" width="55" height="24" rx="12" fill="#ffffff" stroke="rgba(150,120,140,0.35)" strokeWidth="2" />
        </g>
      </svg>

      {/* Drifting pastel marbles — parallax-like floaty motion. */}
      {MARBLES.map((m, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: m.top,
            left: m.left,
            width: m.size,
            height: m.size,
            background: `radial-gradient(circle at 32% 30%, #ffffff 0%, ${m.c} 55%, ${m.c} 100%)`,
            boxShadow: `inset -6px -8px 18px rgba(0,0,0,0.08), 0 12px 30px -8px ${m.c}`,
            opacity: 0.55,
            animation: `pp-drift-bg ${m.dur} ease-in-out infinite`,
            animationDelay: m.delay,
          }}
        />
      ))}

      {/* A slower tumble layer of tiny marbles rolling along the ground. */}
      <div className="absolute inset-x-0 bottom-0 h-24">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-2 rounded-full"
            style={{
              left: `${(i / 8) * 100 + 4}%`,
              width: 22 + (i % 3) * 8,
              height: 22 + (i % 3) * 8,
              background: `radial-gradient(circle at 30% 30%, #fff, ${
                ["#F9B4C1", "#F3D375", "#9CD08C", "#B79BE0", "#8FC7EA"][i % 5]
              })`,
              opacity: 0.7,
              animation: `pp-tumble ${3 + (i % 4)}s ease-in-out ${-(i * 0.6)}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
});