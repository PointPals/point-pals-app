import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { submitContactForm } from "@/lib/emails.functions";
import { PublicLogo } from "@/components/PublicLogo";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact PointPals — we're here to help" },
      {
        name: "description",
        content: "Get in touch with the PointPals team. We reply to every message from real humans in New Zealand.",
      },
      { property: "og:title", content: "Contact PointPals" },
      {
        property: "og:description",
        content: "Questions, feedback, or a story to share? Send us a note — we reply personally.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await submitContactForm({ data: { name, email, message } });
      setSent(true);
      setName(""); setEmail(""); setMessage("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[linear-gradient(180deg,#FFF6E4_0%,#FCE7F3_100%)]">
      <PublicLogo fixed />
      <div className="card-soft p-7 w-full max-w-lg">
        <h1 className="font-display text-3xl font-bold">Get in touch</h1>
        <p className="text-sm text-muted-foreground mt-2">
          A real human on the PointPals team will reply, usually within one working day.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-butter/40 border border-butter p-5 text-sm">
            <p className="font-semibold">Message received 🌱</p>
            <p className="mt-1 text-foreground/80">
              Check your inbox — we've sent a confirmation. Talk soon!
            </p>
            <Link to="/" className="mt-4 inline-block font-semibold underline">Back home</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your name</span>
              <input
                type="text" required maxLength={100} value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email" required maxLength={255} value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</span>
              <textarea
                required maxLength={3000} rows={6} value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 resize-y"
              />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send message"}
            </button>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Or email us directly at{" "}
              <a href="mailto:support@pointpals.co.nz" className="underline">support@pointpals.co.nz</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}