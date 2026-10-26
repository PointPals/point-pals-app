import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// GSAP (incl. ScrollTrigger, SplitText & DrawSVG) is free for commercial use
// since v3.13. Registering on the server is harmless — the plugins only touch
// the DOM inside effects — but guard anyway so SSR never evaluates them.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP);
}
gsap.defaults({ ease: "expo.out", duration: 1 });

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP };

/** gsap.matchMedia() query for "animations are welcome". */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
/** gsap.matchMedia() query for "keep it still". */
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
