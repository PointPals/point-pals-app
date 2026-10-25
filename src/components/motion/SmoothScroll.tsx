import Lenis from "lenis";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";

const LenisContext = createContext<Lenis | null>(null);

/**
 * Inertial scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger scenes
 * stay frame-locked. Marketing pages only — the in-app shell keeps native
 * scroll (pull-to-refresh, sheets and modals rely on it). Skipped entirely
 * when the OS asks for reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

export function useLenis() {
  return useContext(LenisContext);
}

/** Scroll to a selector or y-offset, via Lenis when it's running. */
export function scrollToTarget(lenis: Lenis | null, target: string | number, immediate = false) {
  lenis?.resize();
  if (typeof target === "string") {
    const el = document.querySelector(target);
    if (!el) return;
    if (lenis) lenis.scrollTo(el as HTMLElement, { immediate, force: true, offset: -24 });
    else el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
    return;
  }
  if (lenis) lenis.scrollTo(target, { immediate, force: true });
  else window.scrollTo({ top: target, behavior: immediate ? "auto" : "smooth" });
}
