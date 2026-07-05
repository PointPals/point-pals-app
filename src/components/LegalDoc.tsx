import type { ReactNode } from "react";

// Shared layout for the legal/policy pages (§9). Plain, readable, honest.
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl pb-12">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="legal-body mt-6 space-y-5 leading-relaxed text-foreground/90">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        This is a plain-language policy for a small independent app; it isn't legal advice.
        Questions?{" "}
        <a className="underline" href="mailto:support@pointpals.app">
          support@pointpals.app
        </a>
        .
      </p>
    </article>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-bold pt-2">{children}</h2>;
}
