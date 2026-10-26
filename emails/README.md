# PointPals emails

Every email PointPals sends, in the app's branding: cream page, white card
with the marble stripe, one of the Pals, and the plum → cobalt button. All
of them are generated from one layout so they stay consistent:

```bash
node emails/build.mjs   # rewrites emails/supabase/*.html and emails/resend/*.html
```

Edit the copy in `build.mjs`, rebuild, then paste the updated HTML where
it's used (below). Subjects are listed in `subjects.json`.

The logo loads from the website (`https://pointpals.co.nz/brand/pointpals-logo-email.png`,
on the email's cream so it holds up in dark-mode inboxes), so paste updated
templates only once a site with that file is live. Character images load from
the public Supabase `assets` bucket (`…/assets/<pal>.png`). Many email apps
hide images until the reader allows them, so every email reads fine without
them — the logo falls back to the word "PointPals".

## Supabase Auth (Dashboard → Authentication → Emails → Templates)

Paste each file into the matching template's **Message body** (source/HTML
view) and set the subject.

| Template            | File                              | Subject |
|---------------------|-----------------------------------|---------|
| Reset password      | `supabase/reset-password.html`    | Reset your PointPals password |
| Confirm signup      | `supabase/confirm-signup.html`    | Confirm your email for PointPals |
| Magic link          | `supabase/magic-link.html`        | Your PointPals login link |
| Invite user         | `supabase/invite.html`            | You’ve been invited to PointPals |
| Change email address| `supabase/change-email.html`      | Confirm your new email for PointPals |
| Reauthentication    | `supabase/reauthentication.html`  | Your PointPals confirmation code |

They use Supabase's own placeholders — `{{ .ConfirmationURL }}`,
`{{ .Email }}`, `{{ .NewEmail }}` (change email) and `{{ .Token }}`
(reauthentication). The reset link keeps using `{{ .ConfirmationURL }}`, which
is what `/reset-password` expects (it reads `type=recovery` from the URL).

## Resend (Dashboard → Templates)

Open each existing template, replace its HTML with the file, keep the same
template (so its ID in the code doesn't change), and **publish** — drafts
are rejected at send time.

| Resend template           | ID (in code)  | File                                 | Variables used |
|---------------------------|---------------|--------------------------------------|----------------|
| Contact-Confirmation      | `267dc7da…`   | `resend/contact-confirmation.html`   | `first_name` |
| Parenting-Tip-StartSmall  | `f8fbb7b8…`   | `resend/tip-start-small.html`        | `first_name` |
| Parenting-Tip-LabelPraise | `d12adf3c…`   | `resend/tip-label-praise.html`       | — |
| Habit-Fading-Tips         | `c61044aa…`   | `resend/habit-fading-tips.html`      | `first_name` |
| Memory-Expiry-Warning     | `f2ebbe00…`   | `resend/memory-expiry-warning.html`  | `first_name`, `family_name`, `cycle_end_date`, `memory_count`, `memory_plural`, `retention_days`, `memories_url`, `settings_url`, `unsubscribe_url` |
| Memory-Montage-Ready      | `0988eb46…`   | `resend/montage-ready.html`          | `first_name`, `family_name`, `season_label`, `memory_count`, `memory_plural`, `download_url`, `memories_url`, `unsubscribe_url` |

Placeholders are written Resend-style with triple braces (`{{{first_name}}}`).
If the editor shows your existing templates with a different style, keep the
variable names and match what it shows. Give `first_name` a fallback such as
"there" in the template's variable settings so a missing name never blocks a
send.

Notes:
- The tip emails were rewritten from scratch (the originals live only in
  Resend). Keep your own copy if you prefer it — the layout is what changes.
- The memory warning says a recap video is on its way: that's true once
  `SHOTSTACK_API_KEY` is set (see `docs/OPERATIONS.md` §8). Until then,
  soften that sentence in `build.mjs`.
- The montage email says the link lasts 7 days, matching `EMAIL_DOWNLOAD_TTL`
  in `supabase/functions/render-montage`.
