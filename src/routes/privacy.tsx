import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc, H2 } from "@/components/LegalDoc";
import { PublicPageLayout } from "@/components/PublicPageLayout";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — PointPals" },
      {
        name: "description",
        content: "How PointPals handles your family's data, including data about children.",
      },
    ],
  }),
});

function Privacy() {
  return (
    <PublicPageLayout>
      <LegalDoc title="Privacy Policy" updated="July 2026">
        <p>
          PointPals is a family chore and behaviour tracker. We take privacy seriously — especially
          because the app involves data about children. This policy explains what we collect, why,
          and the control you have.
        </p>

        <H2>What we collect</H2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Family content you create</strong>: a family name, children's first names or
            nicknames, the chores/skills you track, points awarded, and reward choices. You decide
            what to enter — a nickname works fine.
          </li>
          <li>
            <strong>Account &amp; billing</strong>: if you subscribe, your email and payment are
            handled by our processor, Stripe. We never see or store full card numbers.
          </li>
          <li>
            <strong>Limited product analytics</strong>: see below. We do <em>not</em> track
            individual children's tapping behaviour in a way that builds a profile of a child.
          </li>
        </ul>

        <H2>Children's data</H2>
        <p>
          PointPals is designed for a parent or guardian to use on a child's behalf. We collect the
          minimum needed to run the app. We do not build behavioural profiles of children, we do not
          use children's data for advertising, and we never sell personal data. Analytics events
          from kid-facing screens carry only an anonymous, non-reversible id — never a child's name.
        </p>

        <H2>Analytics &amp; error reporting</H2>
        <p>
          Any product analytics are scoped to parent-facing actions (settings, library management,
          subscription) to help us improve the app. There is no session recording on children's
          screens. Crash/error reports are scrubbed of personal information (names and emails)
          before they leave your device.
        </p>

        <H2>Where data lives</H2>
        <p>
          App data is stored on your device and, where a backend is connected, in our hosting
          provider (Supabase). Payment data is held by Stripe under their own privacy terms.
          Transactional emails (receipts, password resets) are sent via Resend.
        </p>

        <H2>How long we keep memories</H2>
        <p>
          Photos, videos, and voice notes in your memory feed are the most personal thing you share
          with us, so we deliberately don't keep them forever. The feed runs in{" "}
          <strong>90-day seasons</strong>: when a season ends, everything in it is permanently
          deleted from our storage and the feed starts fresh. This follows the data-minimisation
          principle of the NZ Privacy Act 2020 — we don't hold personal information about your
          children for longer than it's needed.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>You're warned first</strong>: a few days before a season ends we email the
            household so nothing disappears by surprise. The clean-up never runs for a household
            that hasn't been notified.
          </li>
          <li>
            <strong>You can keep it</strong>: before the refresh you can download the season as a
            video montage from the Memories page, and memories are included in the JSON export.
          </li>
          <li>
            <strong>You can opt out</strong>: turn off the seasonal refresh in Settings → Your data
            if you'd rather keep the feed indefinitely.
          </li>
        </ul>

        <H2>Your controls</H2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Export</strong>: download all your family data as JSON from Settings → Your
            data.
          </li>
          <li>
            <strong>Delete</strong>: permanently delete your family data from Settings → Your data.
          </li>
          <li>
            <strong>Access questions</strong>: email us and we'll help.
          </li>
        </ul>

        <H2>Contact</H2>
        <p>
          Email{" "}
          <a className="underline" href="mailto:support@pointpals.co.nz">
            support@pointpals.co.nz
          </a>{" "}
          for any privacy request or question.
        </p>
      </LegalDoc>
    </PublicPageLayout>
  );
}
