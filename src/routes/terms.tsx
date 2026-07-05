import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc, H2 } from "@/components/LegalDoc";
import { PublicPageLayout } from "@/components/PublicPageLayout";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of Service — PointPals" },
      { name: "description", content: "The terms for using PointPals." },
    ],
  }),
});

function Terms() {
  return (
    <PublicPageLayout>
      <LegalDoc title="Terms of Service" updated="July 2026">
      <p>
        These terms cover your use of PointPals. By using the app you agree to them. If you don't,
        please don't use the app.
      </p>

      <H2>Who can use PointPals</H2>
      <p>
        PointPals is intended for use by a parent or guardian (18+) to support their household.
        You're responsible for the information you enter and for supervising children's use.
      </p>

      <H2>Subscriptions &amp; billing</H2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          Some features require a paid subscription, offered after a free trial where applicable.
        </li>
        <li>
          Payments are processed securely by Stripe. Prices are shown in NZD (or your selected
          currency) before you pay.
        </li>
        <li>
          Subscriptions renew automatically until cancelled. You can cancel anytime via the Stripe
          customer portal in Settings — access continues until the end of the paid period.
        </li>
        <li>
          Refunds are governed by our{" "}
          <a className="underline" href="/refunds">
            Refund Policy
          </a>
          .
        </li>
      </ul>

      <H2>Acceptable use</H2>
      <p>
        Don't misuse the app: no unlawful use, no attempts to break, overload or reverse-engineer
        the service, and no using it to harm others. We may suspend accounts that do.
      </p>

      <H2>The app is a tool, not advice</H2>
      <p>
        PointPals is a habit-building aid. It is not medical, psychological or educational advice.
        You use your own judgement about what's right for your family.
      </p>

      <H2>Availability &amp; changes</H2>
      <p>
        We work to keep PointPals running (and monitor uptime), but we don't guarantee uninterrupted
        service. We may update features and, with notice, these terms. Continued use after changes
        means you accept the updated terms.
      </p>

      <H2>Liability</H2>
      <p>
        To the extent permitted by law, PointPals is provided "as is" and our liability is limited
        to the amount you paid us in the prior 12 months. Nothing here limits rights you have under
        mandatory consumer law (for example, the New Zealand Consumer Guarantees Act).
      </p>

      <H2>Contact</H2>
      <p>
        Questions about these terms? Email{" "}
        <a className="underline" href="mailto:support@pointpals.co.nz">
          support@pointpals.co.nz
        </a>
        .
      </p>
      </LegalDoc>
    </PublicPageLayout>
  );
}
