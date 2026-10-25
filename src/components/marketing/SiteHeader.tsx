import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { MOTION_OK, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "The Pals", href: "#pals" },
] as const;

const linkClass =
  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink";

/**
 * Floating header. Transparent over the hero, then settles into a frosted
 * cream pill; tucks away while you read downward and returns on any upward
 * scroll (motion-OK only — reduced motion keeps it pinned in place).
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          const scrolled = y > 24;
          if (el.dataset.scrolled !== String(scrolled)) el.dataset.scrolled = String(scrolled);
        },
      });
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const hide = ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            const hidden = self.direction === 1 && self.scroll() > 520;
            if (el.dataset.hidden !== String(hidden)) el.dataset.hidden = String(hidden);
          },
        });
        return () => {
          hide.kill();
          el.dataset.hidden = "false";
        };
      });
      return () => {
        st.kill();
        mm.revert();
      };
    },
    { scope: ref },
  );

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      ref={ref}
      data-scrolled="false"
      data-hidden="false"
      className="lp-header fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div className="lp-header-bar mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full pl-4 pr-2 sm:h-16 sm:pl-6 sm:pr-2.5">
        <Link
          to="/"
          aria-label="PointPals home"
          className="tap -my-1 flex min-h-11 items-center rounded-full"
        >
          <Wordmark className="text-[1.55rem] sm:text-[1.75rem]" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={linkClass}>
              {n.label}
            </a>
          ))}
          <Link to="/about" className={linkClass}>
            Research
          </Link>
          <Link to="/faq" className={linkClass}>
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link to="/sign-in" className={cn(linkClass, "px-3.5 text-ink")}>
            Log in
          </Link>
          <Link
            to="/sign-up"
            className="tap hidden min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Start free
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="lp-mobile-menu"
            onClick={() => setOpen((o) => !o)}
            className="tap inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="lp-mobile-menu"
        hidden={!open}
        className="mx-auto mt-2 max-w-6xl rounded-[1.75rem] bg-cream/95 p-2 shadow-lift backdrop-blur-xl md:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-2xl px-4 font-display text-lg font-semibold text-ink hover:bg-ink/5"
            >
              {n.label}
            </a>
          ))}
          <Link
            to="/about"
            className="flex min-h-12 items-center rounded-2xl px-4 font-display text-lg font-semibold text-ink hover:bg-ink/5"
          >
            Research
          </Link>
          <Link
            to="/faq"
            className="flex min-h-12 items-center rounded-2xl px-4 font-display text-lg font-semibold text-ink hover:bg-ink/5"
          >
            FAQ
          </Link>
          <Link
            to="/join"
            className="flex min-h-12 items-center rounded-2xl px-4 font-display text-lg font-semibold text-ink hover:bg-ink/5"
          >
            Join a family
          </Link>
          <Link
            to="/sign-up"
            className="tap mt-1 flex min-h-12 items-center justify-center rounded-full bg-ink px-5 font-semibold text-cream"
          >
            Start your family jar
          </Link>
        </nav>
      </div>
    </header>
  );
}
