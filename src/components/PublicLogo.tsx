import { Link } from "@tanstack/react-router";
import { url as logoUrl } from "@/assets/brand/pointpals-logo-points.asset.json";

export function PublicLogo({ fixed = false }: { fixed?: boolean }) {
  const wrapperCls = fixed
    ? "fixed top-4 left-4 sm:top-5 sm:left-5 z-50"
    : "block";

  return (
    <Link
      to="/"
      className={`${wrapperCls} hover:opacity-80 transition`}
      aria-label="PointPals home"
    >
      <img
        src={logoUrl}
        alt="PointPals logo"
        width={180}
        height={72}
        className="h-10 w-auto select-none"
        draggable={false}
      />
    </Link>
  );
}
