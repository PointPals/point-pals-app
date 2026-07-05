import { memo, useEffect, useState } from "react";
import sunny from "@/assets/companions/sunny.png.asset.json";
import pip from "@/assets/companions/pip.png.asset.json";
import bramble from "@/assets/companions/bramble.png.asset.json";
import { MarbleJar } from "@/components/MarbleJar";

/**
 * Full-viewport animated marketing hero:
 *  - Warm sparkly gradient backdrop matching the mascot art
 *  - The real PointPals mascots (Sunny, Pip, Bramble) walking across the ground
 *  - +1 / +2 point bubbles floating up and arcing toward the jar
 *  - The real in-app MarbleJar canvas filling itself on a loop
 */
function Mascot({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="w-full h-full object-contain select-none drop-shadow-[0_12px_24px_rgba(236,72,153,0.35)]"
    />
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
      className="absolute bottom-[24%]"
      style={{
        left,
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
  // Drive the real MarbleJar with a slowly climbing value so the jar visibly
  // fills while you watch — resets so the loop keeps going.
  const target = 40;
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => (v >= target ? 0 : v + 1));
    }, 550);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {/* backdrop matching the mascot / jar illustration */}
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

      {/* Real MarbleJar canvas — the same one the app uses, filling in a loop */}
      <div className="absolute right-[3%] bottom-[6%] scale-90 sm:scale-100 origin-bottom-right drop-shadow-[0_30px_60px_rgba(236,72,153,0.35)]">
        <MarbleJar value={value} target={target} size={340} />
      </div>

      {/* Walking mascots along the ground — the real PointPals characters */}
      <div className="absolute inset-x-0 bottom-[8%] h-44">
        <div
          className="absolute bottom-0 w-28 h-32 sm:w-36 sm:h-40"
          style={{ animation: "pp-walk 22s linear infinite" }}
        >
          <div style={{ animation: "pp-bob 0.6s ease-in-out infinite", height: "100%" }}>
            <Mascot src={sunny.url} alt="" />
          </div>
        </div>
        <div
          className="absolute bottom-0 w-28 h-32 sm:w-36 sm:h-40"
          style={{ animation: "pp-walk 26s linear infinite", animationDelay: "-7s" }}
        >
          <div style={{ animation: "pp-bob 0.55s ease-in-out infinite", height: "100%" }}>
            <Mascot src={pip.url} alt="" />
          </div>
        </div>
        <div
          className="absolute bottom-0 w-28 h-32 sm:w-36 sm:h-40"
          style={{ animation: "pp-walk 30s linear infinite", animationDelay: "-15s" }}
        >
          <div style={{ animation: "pp-bob 0.65s ease-in-out infinite", height: "100%" }}>
            <Mascot src={bramble.url} alt="" />
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