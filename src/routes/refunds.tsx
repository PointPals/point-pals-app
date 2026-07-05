import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc, H2 } from "@/components/LegalDoc";

export const Route = createFileRoute("/refunds")({
  component: Refunds,
  head: () => ({
    meta: [
      { title: "Refund Policy — PointPals" },
      { name: "description", content: "PointPals' refund policy for subscriptions and payments." },
    ],
  }),
});

function Refunds() {
  return (
    <LegalDoc title="Refund Policy" updated="July 2026">
      <p>
        We want you to feel good about supporting PointPals. This policy explains when we offer
        refunds. It sits alongside — and never overrides — your rights under mandatory consumer law.
      </p>

      <H2>Free trial</H2>
      <p>
        Where a free trial is offered, you won't be charged until it ends. Cancel before the trial
        ends (Settings → Manage subscription) and you won't be billed at all.
      </p>

      <H2>Monthly subscriptions</H2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          You can cancel anytime; your subscription stays active until the end of the current paid
          period, and you won't be charged again after that.
        </li>
        <li>
          Because periods are short (monthly), we generally don't provide partial refunds for the
          remainder of a period once it has started.
        </li>
        <li>
          If you were charged by mistake, charged after cancelling, or never used the paid period,
          email us within <strong>14 days</strong> and we'll refund it — no fuss.
        </li>
      </ul>

      <H2>One-off purchases</H2>
      <p>
        If your plan is a one-time purchase, you may request a full refund within 14 days of
        purchase if the app isn't working for you.
      </p>

      <H2>Payment disputes</H2>
      <p>
        Payments are handled by Stripe. If you don't recognise a charge or believe there's an error,
        please contact us first at{" "}
        <a className="underline" href="mailto:support@pointpals.app">
          support@pointpals.app
        </a>{" "}
        — we can usually resolve it faster than a formal dispute. You retain the right to raise a
        chargeback with your bank or card provider; if you open a Stripe dispute, we'll respond
        promptly with the relevant transaction records.
      </p>

      <H2>How to request a refund</H2>
      <p>
        Email{" "}
        <a className="underline" href="mailto:support@pointpals.app">
          support@pointpals.app
        </a>{" "}
        from the address on your account, with the date and rough amount. We aim to reply within 2
        business days.
      </p>
    </LegalDoc>
  );
}
