import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/brand/Wordmark";

export function PublicLogo({ fixed = false }: { fixed?: boolean }) {
  const wrapperCls = fixed ? "fixed top-4 left-4 sm:top-5 sm:left-5 z-50" : "inline-block";

  return (
    <Link
      to="/welcome"
      className={`${wrapperCls} transition hover:opacity-80`}
      aria-label="PointPals home"
    >
      <Wordmark className="text-[1.75rem]" />
    </Link>
  );
}
