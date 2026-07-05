import { Link } from "@tanstack/react-router";
import { Sparkles, PlusCircle } from "lucide-react";

// Purpose-built empty states for a brand-new household (§9 — this needs its own
// design pass, not a blank dashboard). Warm, encouraging, action-first.
export function EmptyState({ variant }: { variant: "no-kids" | "no-items" }) {
  if (variant === "no-kids") {
    return (
      <div className="card-soft mx-auto max-w-md text-center px-6 py-12 mt-6">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-butter/60">
          <Sparkles className="h-9 w-9 text-foreground/70" />
        </div>
        <h1 className="font-display text-2xl font-bold">Welcome to PointPals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the first family member to start turning everyday chores into a habit worth cheering
          for. Points fill a shared jar the whole family builds together.
        </p>
        <Link
          to="/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
        >
          <PlusCircle className="h-4 w-4" /> Set up your family
        </Link>
      </div>
    );
  }

  return (
    <div className="card-soft text-center px-6 py-10">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage/50">
        <PlusCircle className="h-8 w-8 text-foreground/70" />
      </div>
      <h2 className="font-display text-xl font-bold">Nothing to tap yet</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Add your family's first chores and skills in the Library — a handful of daily must-dos is a
        great start.
      </p>
      <Link
        to="/library"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
      >
        Go to Library
      </Link>
    </div>
  );
}
