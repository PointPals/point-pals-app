import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc, H2 } from "@/components/LegalDoc";
import { PublicPageLayout } from "@/components/PublicPageLayout";

export const Route = createFileRoute("/delete-account")({
  component: DeleteAccount,
  head: () => ({
    meta: [
      { title: "Delete Your Account — PointPals" },
      {
        name: "description",
        content: "How to permanently delete your PointPals account and all associated family data.",
      },
    ],
  }),
});

function DeleteAccount() {
  return (
    <PublicPageLayout>
      <LegalDoc title="Delete Your Account" updated="July 2026">
        <p>
          You can permanently delete your PointPals account and all associated family data at any
          time. This removes everything — your household, children's names, chore setup, points
          history, memory feed photos and videos, and your login credentials.
        </p>

        <H2>Delete from within the app</H2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Open PointPals and sign in to your account.</li>
          <li>
            Go to <strong>Settings</strong> (the gear icon).
          </li>
          <li>
            Scroll to <strong>Your data</strong> and tap <strong>Delete family data</strong>.
          </li>
          <li>Confirm the deletion — this is permanent and cannot be undone.</li>
        </ol>

        <H2>Delete by email</H2>
        <p>
          If you no longer have access to the app, email us from the address associated with your
          PointPals account at{" "}
          <a className="underline" href="mailto:support@pointpals.co.nz">
            support@pointpals.co.nz
          </a>
          .
        </p>

        <H2>What gets deleted</H2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Your household profile and family name</li>
          <li>All children's names, companion assignments, and point balances</li>
          <li>All chores, skills, and point history</li>
          <li>All memory feed content — photos, videos, voice notes, and comments</li>
          <li>Your login credentials and authentication records</li>
          <li>Billing and subscription records (processed by Stripe — see below)</li>
        </ul>

        <H2>What may be retained</H2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Stripe billing records</strong>: Payment processor records are retained per
            Stripe's privacy policy and legal obligations. No full card numbers are stored by
            PointPals.
          </li>
          <li>
            <strong>Anonymised analytics aggregates</strong>: Aggregate, non-identifiable metrics
            may remain in analytics systems (PostHog) as part of general product reporting. These
            cannot be linked back to you.
          </li>
        </ul>

        <H2>Export your data first</H2>
        <p>
          Before deleting, you can export your family data from Settings → Your data as a
          downloadable JSON file. Memories can be saved as a video montage from the Memories page.
        </p>

        <H2>Questions?</H2>
        <p>
          Email{" "}
          <a className="underline" href="mailto:support@pointpals.co.nz">
            support@pointpals.co.nz
          </a>
          . We typically respond within 24 hours.
        </p>
      </LegalDoc>
    </PublicPageLayout>
  );
}
