import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

type SplitRevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Split by "lines" (headlines) or "words" (short punchy lines). */
  by?: "lines" | "words";
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
  /** Hold the animation until this is true (e.g. after a preloader). */
  ready?: boolean;
};

/** Headline whose lines (or words) rise out of masks as it enters view. */
export function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  delay = 0,
  by = "lines",
  immediate,
  ready = true,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ready || !ref.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(ref.current, {
          type: by === "words" ? "words,lines" : "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(by === "words" ? self.words : self.lines, {
              yPercent: 115,
              rotate: by === "words" ? 4 : 0,
              duration: 1.25,
              stagger: by === "words" ? 0.05 : 0.09,
              delay,
              ease: "expo.out",
              scrollTrigger: immediate
                ? undefined
                : { trigger: ref.current, start: "top 88%", once: true },
            }),
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { dependencies: [ready], scope: ref },
  );

  return (
    <Tag ref={ref} className={className} style={ready ? undefined : { visibility: "hidden" }}>
      {children}
    </Tag>
  );
}
