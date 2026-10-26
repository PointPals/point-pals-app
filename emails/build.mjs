// Builds every PointPals email from one layout, so they all stay on-brand.
//
//   node emails/build.mjs
//
// Writes emails/supabase/*.html (paste into Supabase → Authentication →
// Email Templates) and emails/resend/*.html (paste into each Resend
// template's HTML). See emails/README.md for which file goes where.
//
// Placeholders are left exactly as each service expects them:
//   Supabase  {{ .ConfirmationURL }}, {{ .Email }}, {{ .Token }} …
//   Resend    {{{first_name}}} … (variable names match what the code sends)

import fs from "node:fs";
import path from "node:path";

const OUT = path.dirname(new URL(import.meta.url).pathname);
const ART = "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets";
const SITE = "https://pointpals.co.nz";

const INK = "#231B33";
const INK_SOFT = "#4A4159";
const MUTED = "#6B6380";
const CREAM = "#FBF6EE";
const CTA = "#5E45D6"; // solid fallback for the plum → cobalt gradient
const CTA_GRADIENT = "linear-gradient(135deg,#7A4FD3,#3F5BD9)";
const MARBLES = ["#A57BF0", "#5B7CFA", "#39C3D8", "#3DBE8B", "#F5B841", "#FF7F5C", "#F27DAE"];
const PAL_WASH = {
  sunny: "#F3E1A0",
  pip: "#B8D4EC",
  bramble: "#C8DDBF",
  ziggy: "#D4C4E8",
  ridge: "#B8DDDC",
  coda: "#D4C4E8",
  fern: "#C8DDBF",
  marlow: "#EFC8CE",
};

const SANS = "Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

const p = (html) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK_SOFT};">${html}</p>`;

const small = (html) =>
  `<p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED};">${html}</p>`;

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px;">
  <tr>
    <td align="center" bgcolor="${CTA}" style="border-radius:999px;background:${CTA};background-image:${CTA_GRADIENT};">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="${CTA}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-- --><a href="${href}" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function secondary(href, label) {
  return `<p style="margin:0 0 20px;font-family:${SANS};font-size:15px;"><a href="${href}" style="color:${CTA};font-weight:bold;text-decoration:underline;">${label}</a></p>`;
}

function fallbackLink(href) {
  return small(
    `Button not working? Copy this link into your browser:<br><a href="${href}" style="color:${CTA};word-break:break-all;">${href}</a>`,
  );
}

function code(token) {
  return `<p style="margin:24px 0;font-family:${SANS};font-size:34px;font-weight:bold;letter-spacing:8px;color:${INK};text-align:center;background:${CREAM};border-radius:16px;padding:18px 0;">${token}</p>`;
}

function layout({ title, preheader, pal, heading, body, footerNote = "" }) {
  const stripe = MARBLES.map(
    (c) =>
      `<td height="6" style="height:6px;line-height:6px;font-size:0;background:${c};">&nbsp;</td>`,
  ).join("");
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
<style>
  @media (max-width: 600px) {
    .pp-card { padding: 28px 22px 24px !important; }
    .pp-h1 { font-size: 28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CREAM};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 8px 20px;font-family:${SERIF};font-size:28px;font-weight:bold;letter-spacing:-0.5px;color:${INK};">
            <a href="${SITE}" style="color:${INK};text-decoration:none;">PointPals<span style="color:#F5B841;">&#9679;</span></a>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #EFE7DA;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${stripe}</tr></table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="pp-card" style="padding:36px 40px 28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                    <tr>
                      <td width="96" height="96" align="center" valign="middle" style="width:96px;height:96px;border-radius:48px;background:${PAL_WASH[pal]};">
                        <img src="${ART}/${pal}.png" width="84" height="84" alt="" style="display:block;width:84px;height:84px;border:0;outline:none;">
                      </td>
                    </tr>
                  </table>
                  <h1 class="pp-h1" style="margin:0 0 16px;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:bold;letter-spacing:-0.5px;color:${INK};">${heading}</h1>
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 8px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
            ${footerNote ? `${footerNote}<br>` : ""}PointPals · Made in New Zealand · <a href="mailto:support@pointpals.co.nz" style="color:${MUTED};">support@pointpals.co.nz</a><br>
            Every good thing drops a marble.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

// ── Supabase Auth templates ────────────────────────────────────────────────

const supabase = {
  "reset-password": {
    subject: "Reset your PointPals password",
    html: layout({
      title: "Reset your PointPals password",
      preheader: "Choose a new password — this link can only be used once.",
      pal: "ridge",
      heading: "Let’s get you back in",
      body: [
        p(
          `We got a request to reset the password for <strong style="color:${INK};">{{ .Email }}</strong>. Tap the button to choose a new one.`,
        ),
        button("{{ .ConfirmationURL }}", "Choose a new password"),
        small(
          "For your security the link expires soon and works once. Didn’t ask for this? You can ignore this email — your password stays the same.",
        ),
        fallbackLink("{{ .ConfirmationURL }}"),
      ].join("\n"),
    }),
  },
  "confirm-signup": {
    subject: "Confirm your email for PointPals",
    html: layout({
      title: "Confirm your email",
      preheader: "One tap and your family jar is ready to fill.",
      pal: "sunny",
      heading: "Welcome to PointPals",
      body: [
        p(
          `You’re one tap away from your family jar. Confirm <strong style="color:${INK};">{{ .Email }}</strong> and you can add your children, pick their Pals and start noticing the good.`,
        ),
        button("{{ .ConfirmationURL }}", "Confirm my email"),
        small("Didn’t sign up? Ignore this email and nothing will happen."),
        fallbackLink("{{ .ConfirmationURL }}"),
      ].join("\n"),
    }),
  },
  "magic-link": {
    subject: "Your PointPals login link",
    html: layout({
      title: "Your PointPals login link",
      preheader: "Tap to log in — no password needed.",
      pal: "pip",
      heading: "Here’s your login link",
      body: [
        p("Tap the button to log in to PointPals on this device. No password needed."),
        button("{{ .ConfirmationURL }}", "Log in to PointPals"),
        small(
          "The link expires soon and works once. If you didn’t ask to log in, you can ignore this email.",
        ),
        fallbackLink("{{ .ConfirmationURL }}"),
      ].join("\n"),
    }),
  },
  invite: {
    subject: "You’ve been invited to PointPals",
    html: layout({
      title: "You’re invited to PointPals",
      preheader: "Join your family on PointPals and help fill the jar.",
      pal: "marlow",
      heading: "You’re invited",
      body: [
        p(
          "Someone in your family has added you to PointPals — the free family jar where every good thing drops a marble. Accept the invite to set your password and join in.",
        ),
        button("{{ .ConfirmationURL }}", "Accept the invite"),
        small("Weren’t expecting this? You can ignore this email."),
        fallbackLink("{{ .ConfirmationURL }}"),
      ].join("\n"),
    }),
  },
  "change-email": {
    subject: "Confirm your new email for PointPals",
    html: layout({
      title: "Confirm your new email",
      preheader: "Confirm the change to your PointPals email address.",
      pal: "fern",
      heading: "Confirm your new email",
      body: [
        p(
          `Tap below to change your PointPals email from <strong style="color:${INK};">{{ .Email }}</strong> to <strong style="color:${INK};">{{ .NewEmail }}</strong>.`,
        ),
        button("{{ .ConfirmationURL }}", "Confirm the change"),
        small(
          "Didn’t ask for this? Ignore this email and your address stays the same — and consider changing your password.",
        ),
        fallbackLink("{{ .ConfirmationURL }}"),
      ].join("\n"),
    }),
  },
  reauthentication: {
    subject: "Your PointPals confirmation code",
    html: layout({
      title: "Your PointPals code",
      preheader: "Your confirmation code is inside.",
      pal: "coda",
      heading: "Your confirmation code",
      body: [
        p("Enter this code in PointPals to confirm it’s you:"),
        code("{{ .Token }}"),
        small("The code expires soon. If you didn’t ask for it, you can ignore this email."),
      ].join("\n"),
    }),
  },
};

// ── Resend-hosted templates (variables match what the code sends) ──────────

const unsubscribe = `You’re getting this because you have a PointPals family account. <a href="{{{unsubscribe_url}}}" style="color:${MUTED};">Email settings</a>`;
const tipsFooter = `You’re getting this because you started a PointPals family. <a href="${SITE}/settings" style="color:${MUTED};">Email settings</a>`;

const resend = {
  "contact-confirmation": {
    subject: "We got your message",
    html: layout({
      title: "We got your message",
      preheader: "Thanks for getting in touch — a real person will reply.",
      pal: "sunny",
      heading: "Thanks, {{{first_name}}} — we got it",
      body: [
        p(
          "Thanks for getting in touch. Every message is read by a real person at PointPals, and we’ll reply as soon as we can.",
        ),
        p(
          "If you think of anything else — a screenshot, a step that went wrong, an idea — just reply to this email.",
        ),
        secondary(SITE, "Back to PointPals"),
      ].join("\n"),
    }),
  },
  "tip-start-small": {
    subject: "Start small: the 3-chore rule",
    html: layout({
      title: "Start small",
      preheader: "Three chores and one kind moment is plenty for week one.",
      pal: "bramble",
      heading: "Start small, {{{first_name}}}",
      body: [
        p(
          "The families who stick with a marble jar have one thing in common: they start with less than they think.",
        ),
        p(
          `<strong style="color:${INK};">This week, try just three chores and one kind moment per child.</strong> Make bed, teeth, plates to the bench — and one thing worth noticing, like sharing or being brave.`,
        ),
        p(
          "Notice it straight away. A marble that drops the moment your child does something says “I saw that” far louder than a tally at bedtime.",
        ),
        p("When those feel easy, add one more. Habits grow from wins, not from long lists."),
        button(SITE, "Open PointPals"),
      ].join("\n"),
      footerNote: tipsFooter,
    }),
  },
  "tip-label-praise": {
    subject: "The kind of praise that sticks",
    html: layout({
      title: "Labelled praise",
      preheader: "Name what they did — it’s the difference between nice and useful.",
      pal: "pip",
      heading: "Praise that sticks",
      body: [
        p(
          "“Good job” is lovely, but it doesn’t tell your child what to do again. Labelled praise does.",
        ),
        p(
          `<strong style="color:${INK};">Name the action and why it mattered:</strong> “You put your shoes by the door without being asked — that’s why we left on time.”`,
        ),
        p(
          "Pair it with the marble. Tap the chore, say what you saw, and let your child watch it drop. That moment is the habit forming.",
        ),
        button(SITE, "Notice something today"),
      ].join("\n"),
      footerNote: tipsFooter,
    }),
  },
  "habit-fading-tips": {
    subject: "One month in: when to fade the points",
    html: layout({
      title: "Fading the points",
      preheader: "The goal was never more marbles. It’s habits that run on their own.",
      pal: "ridge",
      heading: "One month in, {{{first_name}}}",
      body: [
        p(
          "If some chores now happen without a reminder, that’s the win. PointPals is scaffolding — the plan is to need it less.",
        ),
        p(
          `<strong style="color:${INK};">Fade gently:</strong> drop a well-learned chore to a lower point value, make the jar a little bigger, and swap in a new habit you’d like to grow.`,
        ),
        p(
          "And celebrate the graduation out loud: “You don’t even need a marble for that any more — you just do it.”",
        ),
        button(SITE, "Adjust your chores"),
      ].join("\n"),
      footerNote: tipsFooter,
    }),
  },
  "memory-expiry-warning": {
    subject: "Your memory feed refreshes on {{{cycle_end_date}}}",
    html: layout({
      title: "Your memories are about to refresh",
      preheader: "We’re making your season recap now — here’s what happens next.",
      pal: "coda",
      heading: "This season refreshes on {{{cycle_end_date}}}",
      body: [
        p(
          "Hi {{{first_name}}}, for your family’s privacy PointPals keeps memories for {{{retention_days}}} days. Your family’s feed ({{{family_name}}}) has {{{memory_count}}} {{{memory_plural}}} that will be cleared on {{{cycle_end_date}}}.",
        ),
        p(
          `<strong style="color:${INK};">We’re making your season recap video now</strong> — every moment in the order it happened. We’ll email you the download link as soon as it’s ready.`,
        ),
        button("{{{memories_url}}}", "See this season’s memories"),
        secondary("{{{settings_url}}}", "Download every photo and video"),
        small("After the refresh, the feed starts fresh for the next season."),
      ].join("\n"),
      footerNote: unsubscribe,
    }),
  },
  "montage-ready": {
    subject: "Your season recap is ready 🎬",
    html: layout({
      title: "Your season recap is ready",
      preheader: "Every moment from this season, in the order it happened.",
      pal: "marlow",
      heading: "Your season recap is ready",
      body: [
        p(
          "Hi {{{first_name}}}, your family’s recap for {{{season_label}}} is ready — {{{memory_count}}} {{{memory_plural}}}, in the order they happened.",
        ),
        button("{{{download_url}}}", "Download your recap"),
        small(
          "The download link works for 7 days and the video is kept for 90 days — save it somewhere safe. You can always make a fresh link from the Memories page.",
        ),
        secondary("{{{memories_url}}}", "Open Memories"),
      ].join("\n"),
      footerNote: unsubscribe,
    }),
  },
};

for (const [dir, set] of [
  ["supabase", supabase],
  ["resend", resend],
]) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  for (const [name, { html }] of Object.entries(set)) {
    fs.writeFileSync(path.join(OUT, dir, `${name}.html`), html);
  }
}
fs.writeFileSync(
  path.join(OUT, "subjects.json"),
  JSON.stringify(
    {
      supabase: Object.fromEntries(Object.entries(supabase).map(([k, v]) => [k, v.subject])),
      resend: Object.fromEntries(Object.entries(resend).map(([k, v]) => [k, v.subject])),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Built ${Object.keys(supabase).length} Supabase + ${Object.keys(resend).length} Resend emails.`,
);
