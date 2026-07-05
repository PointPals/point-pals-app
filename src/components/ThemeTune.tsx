import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import tuneAsset from "@/assets/audio/sunny-day-celebration.mp3.asset.json";

/**
 * Floating theme-tune toggle. Autoplays muted (browsers allow this), and
 * unmutes on first click. Loops the Sunny Day Celebration MP3 in the
 * background — the marble-drop chimes from MarbleJar layer naturally on top.
 */
export function ThemeTune() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.35;
    a.loop = true;
    a.muted = true;
    a.play().catch(() => {});
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (on) {
      a.muted = true;
      setOn(false);
    } else {
      a.muted = false;
      a.play().catch(() => {});
      setOn(true);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={tuneAsset.url} preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-label={on ? "Mute theme tune" : "Play theme tune"}
        className="fixed bottom-5 right-5 z-[70] tap flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-foreground shadow-[0_10px_30px_-8px_rgba(236,72,153,0.4)] border border-white/70 hover:bg-white transition"
      >
        {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {on ? "Playing" : "Play theme"}
      </button>
    </>
  );
}