import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PublicLogo } from "@/components/PublicLogo";

const PAGES = [
  { to: "/about", label: "Research" },
  { to: "/faq", label: "FAQ" },
  { to: "/blog", label: "Blog" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refunds", label: "Refunds" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicPageLayout({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const mainCls = wide
    ? "max-w-6xl mx-auto px-5 pb-12"
    : "max-w-4xl mx-auto px-5 pb-12";
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1000px 700px at 15% 10%, #FEE7B5 0%, transparent 60%)," +
          "radial-gradient(900px 700px at 85% 20%, #FBD0E4 0%, transparent 60%)," +
          "linear-gradient(180deg, #FFF6E4 0%, #FCE7F3 60%, #FDE1EC 100%)",
      }}
    >
      {/* Thin nav bar */}
      <nav className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
        <PublicLogo />
        <Link
          to="/welcome"
          className="text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-2"
        >
          Back to home
        </Link>
      </nav>

      <main className={mainCls}>{children}</main>

      <footer className="max-w-4xl mx-auto px-6 pb-10 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {PAGES.map((p) => (
            <Link key={p.to} to={p.to} className="hover:text-foreground transition">
              {p.label}
            </Link>
          ))}
          <a href="mailto:support@pointpals.co.nz" className="hover:text-foreground transition">
            support@pointpals.co.nz
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; 2026 PointPals &middot; Proudly made in New Zealand
        </p>
      </footer>
    </div>
  );
}
