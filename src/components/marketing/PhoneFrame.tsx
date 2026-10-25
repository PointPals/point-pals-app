import type { CSSProperties, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * Pure-CSS phone mockup. The screen is a size container, so everything inside
 * can be sized in `cqw` and scale perfectly with the phone.
 */
export function PhoneFrame({
  children,
  className,
  screenClassName,
  style,
  ref,
  label,
}: {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  /** Accessible description of what the screen shows. */
  label?: string;
}) {
  return (
    <div
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("lp-phone relative aspect-[9/19] rounded-[16%/7.6%]", className)}
      style={style}
    >
      {/* side buttons */}
      <span
        aria-hidden
        className="absolute -left-[1.4%] top-[18%] h-[6%] w-[1.6%] rounded-l-full bg-ink"
      />
      <span
        aria-hidden
        className="absolute -left-[1.4%] top-[27%] h-[9%] w-[1.6%] rounded-l-full bg-ink"
      />
      <span
        aria-hidden
        className="absolute -right-[1.4%] top-[24%] h-[12%] w-[1.6%] rounded-r-full bg-ink"
      />
      <div
        aria-hidden={label ? true : undefined}
        className={cn(
          "@container absolute inset-x-[3%] inset-y-[1.42%] overflow-hidden rounded-[13.5%/6.4%] bg-cream",
          screenClassName,
        )}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-[1.6%] z-30 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-ink"
        />
        {children}
        <span aria-hidden className="lp-phone-glare pointer-events-none absolute inset-0 z-40" />
      </div>
    </div>
  );
}

/** iOS-ish status bar, sized for a cqw container. */
export function StatusBar({ tone = "ink" }: { tone?: "ink" | "cream" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-between px-[8cqw] pt-[3.4cqw] text-[3.6cqw] font-semibold",
        tone === "cream" ? "text-cream" : "text-ink",
      )}
    >
      <span>6:04</span>
      <span className="flex items-center gap-[1.4cqw]">
        <span className="flex items-end gap-[0.5cqw]">
          {[1.2, 1.8, 2.4, 3].map((h) => (
            <span
              key={h}
              className="w-[0.8cqw] rounded-full bg-current"
              style={{ height: `${h}cqw` }}
            />
          ))}
        </span>
        <span className="relative h-[3cqw] w-[6cqw] rounded-[0.9cqw] border-[0.35cqw] border-current/70 p-[0.4cqw]">
          <span className="block h-full w-[70%] rounded-[0.4cqw] bg-current" />
        </span>
      </span>
    </div>
  );
}
