import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Fades and lifts its direct children into place, staggered, as the block
 * scrolls into view. Children render in their final state for reduced motion
 * and before hydration, so nothing is ever stuck invisible.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  stagger = 0.08,
  y = 36,
  delay = 0,
  start = "top 85%",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (!ref.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(ref.current!.children, {
          y,
          opacity: 0,
          duration: 1.1,
          delay,
          stagger,
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
