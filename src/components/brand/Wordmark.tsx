import { cn } from "@/lib/utils";

/** Trimmed artwork's width ÷ height — keeps the box reserved before it loads. */
const RATIO = 3.194;

/**
 * PointPals logo — the marble jar with the Pals inside and the chocolate
 * wordmark, a pink marble flying in as the dot of the "i". Sized in `em`, so
 * callers set its size with a font-size class (`text-[1.8rem]`) exactly as
 * they did for the old lettered wordmark. Transparent, so it sits on any of
 * the light surfaces.
 */
export function Wordmark({
  className,
  title = "PointPals",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <img
      src="/brand/pointpals-logo-480.webp"
      srcSet="/brand/pointpals-logo-480.webp 480w, /brand/pointpals-logo-960.webp 960w, /brand/pointpals-logo-1600.webp 1600w"
      sizes="(min-width: 640px) 300px, 240px"
      alt={title}
      width={480}
      height={Math.round(480 / RATIO)}
      decoding="async"
      draggable={false}
      className={cn("inline-block h-[1.9em] w-auto max-w-none select-none align-middle", className)}
      style={{ aspectRatio: String(RATIO) }}
    />
  );
}
