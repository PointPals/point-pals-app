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
        because the app involves data about children. This policy explains what we collect, why, and
        the control you have.
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
          <strong>Limited product analytics</strong>: see below. We do <em>not</em> track individual
          children's tapping behaviour in a way that builds a profile of a child.
        </li>
      </ul>

      <H2>Children's data</H2>
      <p>
        PointPals is designed for a parent or guardian to use on a child's behalf. We collect the
        minimum needed to run the app. We do not build behavioural profiles of children, we do not
        use children's data for advertising, and we never sell personal data. Analytics events from
        kid-facing screens carry only an anonymous, non-reversible id — never a child's name.
      </p>

      <H2>Analytics &amp; error reporting</H2>
      <p>
        Any product analytics are scoped to parent-facing actions (settings, library management,
        subscription) to help us improve the app. There is no session recording on children's
        screens. Crash/error reports are scrubbed of personal information (names and emails) before
        they leave your device.
      </p>

      <H2>Where data lives</H2>
      <p>
        App data is stored on your device and, where a backend is connected, in our hosting provider
        (Supabase). Payment data is held by Stripe under their own privacy terms. Transactional
        emails (receipts, password resets) are sent via Resend.
      </p>

      <H2>Your controls</H2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Export</strong>: download all your family data as JSON from Settings → Your data.
        </li>
        <li>
          <strong>Delete</strong>: permanently delete your family data from Settings → Your data.
        </li>
        <li>
          <strong>Access questions</strong>: email us and we'll help.
        </li>
      </ul>

      <H2>Data retention — Memory Feed</H2>
      <p>
        Your Memory Feed (photos, captions, audio notes, and comments) runs on a
        fixed 90-day cycle aligned with the{' '}
        <a className="underline" href="/faq#memory-retention">
          New Zealand Privacy Act 2020 data-minimisation principle
        </a>
        . Here's how it works:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>90-day cycles</strong>: your household's memory cycle starts on
          the day you create your account. Every 90 days the cycle turns over and
          posts from the previous cycle are automatically removed.
        </li>
        <li>
          <strong>Advance notice</strong>: we send a reminder email ~7 days before
          your cycle ends so you have time to save or export what matters.
        </li>
        <li>
          <strong>Export before purge</strong>: you can download a ZIP of all
          original photos (or an MP4 video montage if available) at any time
          during your cycle. Links stay live for 7 days after the cycle turns.
        </li>
        <li>
          <strong>Opt out</strong>: you can disable auto-purge in Settings → Your
          data. If turned off, your memories are kept indefinitely until you
          delete them manually, but we still send the reminder.
        </li>
        <li>
          <strong>Already-exported posts</strong>: memories that were included in
          a montage export are never auto-deleted.
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
