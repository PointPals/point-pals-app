import { cn } from "@/lib/utils";

/**
 * PointPals wordmark — set in Fraunces (SOFT), with the dot of the "i"
 * replaced by a glossy marble: the whole product in one glyph. Pure
 * HTML/CSS (no remote image), so it renders instantly, scales crisply and
 * inherits colour. `tone="cream"` for dark surfaces.
 */
export function Wordmark({
  className,
  tone = "ink",
  marble = "var(--marble-saffron)",
  title = "PointPals",
}: {
  className?: string;
  tone?: "ink" | "cream";
  marble?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn(
        "inline-flex items-baseline font-display font-semibold leading-none tracking-[-0.035em] select-none",
        tone === "cream" ? "text-cream" : "text-ink",
        className,
      )}
      style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 72' }}
    >
      <span aria-hidden>Po</span>
      <span aria-hidden className="relative inline-block">
        {/* dotless ı + marble tittle */}
        ı
        <span
          className="marble absolute"
          style={{
            ["--marble" as string]: marble,
            width: "0.25em",
            height: "0.25em",
            // Sits where the tittle would: centred on the stem, just above
            // the x-height (tuned for Fraunces SOFT at leading-none).
            left: "50%",
            marginLeft: "-0.115em",
            top: "0.13em",
          }}
        />
      </span>
      <span aria-hidden>ntPals</span>
    </span>
  );
}
