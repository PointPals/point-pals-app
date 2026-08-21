import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/LegalDoc";
import { PublicPageLayout } from "@/components/PublicPageLayout";

export const Route = createFileRoute("/refunds")({
  component: Refunds,
  head: () => ({
    meta: [
      { title: "Refund Policy — PointPals" },
      { name: "description", content: "PointPals is free — there are no payments or refunds." },
    ],
  }),
});

function Refunds() {
  return (
    <PublicPageLayout>
      <LegalDoc title="Refund Policy" updated="August 2026">
      <p>
        PointPals is completely free to use. We don&rsquo;t charge for the app, there are no
        subscriptions, and we never collect payment details — so there&rsquo;s nothing to refund.
      </p>
      <p>
        If you have a question about your account or your data, email{" "}
        <a className="underline" href="mailto:support@pointpals.co.nz">
          support@pointpals.co.nz
        </a>{" "}
        and we&rsquo;ll help.
      </p>
      </LegalDoc>
    </PublicPageLayout>
  );
}
