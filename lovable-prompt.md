# Lovable Prompt — PointPals Remaining Work

## Read This First

> [!IMPORTANT]
> Migration `20260706000001_rewards_points_memories_overhaul.sql` **must be applied** before the app builds correctly. It adds the split-points columns (`current_points`, `all_time_points`) on `kids`, the `reward_history` table, memory likes/comments, `audio_path` on `memory_posts`, and `household_settings`. The frontend code already depends on these columns/tables.

## What's Already Built (don't rebuild)

- **Points split architecture** — `currentPoints` and `allTimePoints` wired across all components (`app-store.tsx`, `supabase-sync.ts`, `FamilyJarCard`, `KidChartCard`, `AwardModal`, etc.).
- **Rewards page rewrite** (`src/routes/rewards.tsx`) — no voting flow; parents set a reward directly and the family works toward it. Reward history is logged via `correction-store.tsx` and the `reward_history` table.
- **Memories page rewrite** (`src/routes/memories.tsx`) — single-screen composer, voice recording, Seesaw-style cards, likes/comments, and tagged kids.
- **Correction tool** (`src/routes/library.tsx` Family tab) — manual `currentPoints` adjustment with reason logging.
- **CorrectionProvider** — wired into `src/routes/__root.tsx` and consumed by `useCorrection()`.
- **AuthAttacher pattern** (`src/integrations/supabase/auth-attacher.ts`) — attaches the Supabase bearer token to server-function calls.
- **Marketing content pages** — `/about`, `/faq`, `/blog` with `PublicPageLayout.tsx` chrome-free wrapper.
- **Welcome page** (`src/routes/welcome.tsx`) — animated hero jar, mascots, pricing, public nav.
- **Edge functions** — `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `generate-icon`, `generate-invite` exist at `supabase/functions/`.
- **Core library files** — `app-store.tsx`, `correction-store.tsx`, `entitlements.ts`, `billing.ts`, `settings.ts`, `memories.ts`, `feedback.ts`, `analytics.ts`, `supabase-sync.ts`.
- **Core components** — `AwardModal.tsx`, `MarbleJar.tsx`, `Confetti.tsx`, `Paywall.tsx`, `FamilyJarCard.tsx`, `KidChartCard.tsx`, `KidBadge.tsx`, `IconTile.tsx`, `CompanionAvatar.tsx`, `CompanionPicker.tsx`, `EmptyState.tsx`, `RecentActivity.tsx`, `InstallPrompt.tsx`, `ThemeTune.tsx`, `ClientBoot.tsx`, `HeroJarScene.tsx`, `WalkingMascots.tsx`, `HeroBackground.tsx`.
- **Core routes** — `index.tsx` (home), `library.tsx`, `memories.tsx`, `rewards.tsx`, `settings.tsx`, `onboarding.tsx`, `welcome.tsx`, `welcome-back.tsx`, `about.tsx`, `faq.tsx`, `blog.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx`, `refunds.tsx`, `sign-in.tsx`, `sign-up.tsx`, `reset-password.tsx`, `join.tsx`.

## Key Schema Changes

The latest migration (`20260706000001`) introduced these database changes:

- **`public.kids`** — added `current_points` and `all_time_points` (both `integer not null default 0`). Existing `points` values were seeded into both new columns.
- **`public.reward_history`** — new table tracking achieved rewards: `reward_name`, `target_points`, `achieved_at`, `contributing_kid_ids`.
- **`public.memory_likes`** — new table for memory post likes (`post_id`, `user_id`).
- **`public.memory_comments`** — new table for memory post comments (`post_id`, `user_id`, `body`).
- **`public.memory_posts`** — added `audio_path` text column for voice recordings.
- **`public.household_settings`** — new table for extended-family prefs: `ext_family_can_award_needs_work`, `ext_family_can_post_memories`.
- **`public.point_events`** — added `trg_check_viewer_point_event` trigger to enforce the `ext_family_can_award_needs_work` setting for viewer roles.
- **`public.household_members`** role model includes `viewer`, `contributor`, `parent`, `admin`.

## Key DB Types

Because `src/integrations/supabase/types.ts` is auto-generated, the following types are now expected to exist after the migration is applied:

- `Database["public"]["Tables"]["kids"]["Row"]` — includes `current_points`, `all_time_points`, `points`, `avatar_key`, `color`, `name`, `household_id`, `id`, `created_at`.
- `Database["public"]["Tables"]["reward_history"]["Row"]` — includes `id`, `household_id`, `reward_name`, `target_points`, `achieved_at`, `contributing_kid_ids`.
- `Database["public"]["Tables"]["memory_likes"]["Row"]` — includes `post_id`, `user_id`, `created_at`.
- `Database["public"]["Tables"]["memory_comments"]["Row"]` — includes `id`, `post_id`, `user_id`, `body`, `created_at`.
- `Database["public"]["Tables"]["household_settings"]["Row"]` — includes `household_id`, `ext_family_can_award_needs_work`, `ext_family_can_post_memories`, `updated_at`.

The codebase already reads/writes these fields. If the migration has not been applied, the TypeScript check will fail and runtime queries will fail.

## Key Components Reference

| Component | File | Purpose |
|------|------|------|
| `AppShell` | `src/components/AppShell.tsx` | Mobile pill nav / app chrome, wraps authenticated routes. |
| `AwardModal` | `src/components/AwardModal.tsx` | Modal for awarding points to one or more kids. |
| `MarbleJar` | `src/components/MarbleJar.tsx` | Shared family jar visualization with fill/empty animations. |
| `FamilyJarCard` | `src/components/FamilyJarCard.tsx` | Home dashboard card showing the family reward target. |
| `KidChartCard` | `src/components/KidChartCard.tsx` | Individual kid progress card on the home dashboard. |
| `KidBadge` | `src/components/KidBadge.tsx` | Small kid avatar badge used in lists. |
| `CompanionAvatar` | `src/components/CompanionAvatar.tsx` | Renders a kid's chosen companion avatar. |
| `CompanionPicker` | `src/components/CompanionPicker.tsx` | Grid for choosing a companion during kid add/edit. |
| `IconTile` | `src/components/IconTile.tsx` | Selectable emoji/icon tile for chores/skills. |
| `Confetti` | `src/components/Confetti.tsx` | Celebration confetti effect. |
| `Paywall` | `src/components/Paywall.tsx` | Subscription paywall modal. |
| `EmptyState` | `src/components/EmptyState.tsx` | Empty-list illustration + message. |
| `RecentActivity` | `src/components/RecentActivity.tsx` | Recent point events feed. |
| `PublicPageLayout` | `src/components/PublicPageLayout.tsx` | Warm-gradient wrapper for public marketing pages. |
| `HeroJarScene` | `src/components/HeroJarScene.tsx` | Interactive welcome-page hero jar. |
| `WalkingMascots` | `src/components/WalkingMascots.tsx` | Animated mascots on the welcome page. |
| `HeroBackground` | `src/components/HeroBackground.tsx` | Decorative background shapes on the welcome page. |
| `ThemeTune` | `src/components/ThemeTune.tsx` | Audio playback for the welcome page. |
| `InstallPrompt` | `src/components/InstallPrompt.tsx` | PWA install prompt. |
| `ClientBoot` | `src/components/ClientBoot.tsx` | Initializes client-side auth, analytics, PWA. |

## Priority 1 — Polish Marketing Pages (generate images + refine)

The content pages are built with shadcn accordions and content, but need visual polish:

**What to do:**
- Generate hero/header images for these pages (warm family illustrations, marble jar imagery)
- Generate blog images for each of the 6 posts (character art for the characters post, infographic-style images for the others)
- Tidy up spacing, transitions, and accordion animation feel
- The welcome page footer now links to the public pages — make sure those links look good
- Add a subtle desktop nav bar for public pages (PublicPageLayout already has a basic one)

## Priority 2 — Auth Pages (missing links on /welcome)

The `/welcome` route has "Log in" and "Start free trial" links but no auth pages exist. The app currently works entirely client-side via localStorage.

**What to build:**
- `/sign-in` route — email/password form with "Log in" button, "Forgot password?" link, "Don't have an account? Sign up" link
- `/sign-up` route — email/password + name form, creates the account AND a household in one flow
- `/reset-password` route — email input, sends reset link
- Update the links on `/welcome.tsx` to point at these new routes
- Add a route guard: if user is authenticated but has no household, redirect to `/welcome` (household creation)
  - If user is authenticated and has a household, redirect to `/`
  - If unauthenticated and not on `/welcome`, redirect to `/welcome`

**Key tables already in Supabase:**
```sql
households (id, name, shared_pool, reward_target, onboarded, subscription_status, ...)
household_members (household_id, user_id, role)
```
The auto-member trigger already runs on household insert: `households_add_creator_trg` adds the auth.uid() as 'admin' automatically.

**Sign-up flow:**
1. `supabase.auth.signUp({ email, password })`
2. On success, `supabase.from('households').insert({ name: 'My Family' })` — the trigger creates the member row
3. Use `setState` from `useApp()` to hydrate the app-store with the new household data

**Sign-in flow:**
1. `supabase.auth.signInWithPassword({ email, password })`
2. After sign-in, fetch household via `supabase.from('household_members').select('household_id').eq('user_id', user.id).single()`
3. Then `supabase.from('households').select('*').eq('id', householdId).single()`
4. Load all kids, chores, skills, point_events — hydrate into `useApp()` state
5. Fetch `memory_posts` from `public.memories` table

**Key: the app-store currently uses localStorage.** The auth flow needs to add a `syncFromSupabase()` function that loads from the server and merges into the app store. After that, all mutations (award points, add chore, etc.) should also write to Supabase.

## Priority 3 — Sync localStorage → Supabase

When a user signs in (Priority 2 is done), we need to push any local data up to the server.

**What to build:**
- A `syncToSupabase()` function in `lib/app-store.tsx` or a new `lib/sync.ts` file
- Called after sign-in and household fetch
- Checks: are there local kids/chores/skills that don't exist on the server? Insert them.
- Strategy: local ID is a string (e.g. `"abc123"`); when pushing to Supabase, let the DB generate the UUID, then update the local ID map.
- Simpler first pass: after sign-in + first Supabase fetch, if the server is empty but localStorage has data, do a full push. After that, write-through every mutation.

**Mutation write-through:**
Every `setState` call in `app-store.tsx` that mutates data should also write to Supabase:
- `addChore` → `supabase.from('chores').insert({ household_id, name, icon, color, points, recurrence })`
- `addKid` → `supabase.from('kids').insert({ household_id, name, color, current_points, all_time_points, points })`
- `awardPoints` → `supabase.from('point_events').insert({ household_id, kid_id, item_name, item_icon, points, batch_id })`
- `removeChore` → `supabase.from('chores').delete().eq('id', id)`
- etc.

These writes should be fire-and-forget (no await) so they don't slow down the UI — the local state is already updated.

## Priority 4 — Fix the Emoji/Icon Pools in Library Page

In `src/lib/mock-data.ts`, the emoji arrays (`EMOJI_POOL_CHORE`, `EMOJI_POOL_SKILL_POS`, `EMOJI_POOL_SKILL_NEG`) contain garbled/corrupted characters.

**What to do:**
Replace the emoji pools with clean emoji or icon references:
```typescript
export const EMOJI_POOL_POSITIVE = ['🌟', '🎉', '💪', '🌟', '⭐', '🏆', '🎯', '🌈', '🦋', '🌸'];
export const EMOJI_POOL_CHORE = ['🧹', '🧺', '🧽', '🛏️', '🍳', '🧤', '🪴', '📚', '👟', '🚮'];
export const EMOJI_POOL_NEEDS_WORK = ['🤔', '💭', '🔄', '🌱', '📝', '🧠', '🤝', '⏰', '🎯', '💡'];
```

## Priority 5 — Wire Up Billing + Stripe

The billing flow is fully scaffolded but needs Stripe connected.

**What to do:**
1. In Lovable's env settings, add:
   - `VITE_STRIPE_PRICE_NZD` → Paste the Price ID from Stripe Dashboard
2. Deploy the edge functions (Lovable should auto-detect `supabase/functions/stripe-checkout/` etc.)
3. The `Paywall` component in `src/components/Paywall.tsx` uses `startCheckout("household_local")` — replace `"household_local"` with the real household ID from the app store: `household.id`

## Priority 6 — Extended Family + Kid Sharing (Phase 1)

A migration + edge function has been deployed for this. The frontend needs:

### 6a. Invite Page in Settings

In the Settings route (`settings.tsx`), add a section called **"Extended Family"**:

- Show current household members with their roles (admin, parent, viewer, contributor)
- An "Invite family" button (only visible to admin role)
  - Clicking it opens a modal/dialog asking: "Who are you inviting?" with two options:
    - **Viewer** (can see the dashboard, memories, and progress — good for grandparents)
    - **Contributor** (can also award points and add memories — good for babysitters, aunties)
  - After selecting, call the `generate-invite` edge function:
    ```ts
    const res = await supabase.functions.invoke('generate-invite', {
      body: { household_id: household.id, role: 'viewer' },
    })
    // res.url = "https://pointpals.co.nz/join?code=ABC123"
    ```
  - Show the generated link with a "Copy link" button
- List active invite codes (with expiry dates) so the admin can see what's pending
- Revoke invite: DELETE from `household_invites` where `id = ...`

### 6b. Join Page (`/join?code=X`)

Create a new route at `/join` that:
- Reads the `code` query parameter from the URL
- Shows a friendly "You've been invited to join a family on PointPals!" landing
- If the user is already signed in:
  - Call `supabase.rpc('accept_invite', { invite_code: code })`
  - On success: redirect to `/` (they'll see the invited household's dashboard)
  - On error (expired/already member): show the error message
- If the user is NOT signed in:
  - Show "Sign up free" and "Log in" buttons
  - After sign-in/sign-up, redirect back to `/join?code=CODE` (so the accept happens after auth)

### 6c. Role-Conscious UI

When a user is a **viewer**:
- The home page still shows the marble jar, kids' avatars, and point totals
- The library page shows chores and skills but in read-only mode — no "Add" buttons
- The memories page shows the gallery but hides the upload button
- The settings page hides all editing controls
- Show a small badge next to their name: "Viewer"

When a user is a **contributor**:
- Everything a viewer can see
- PLUS: can tap to award points (the big tap target on home page)
- PLUS: can upload photos to memories
- BUT cannot add/remove kids, chores, skills, or change settings
- Badge: "Contributor"

### 6d. Shared Kids Display

When a user belongs to a household that has shared kids (via `kid_shares`):
- The kids appear in the dashboard alongside the household's own kids
- Their avatars show a small "shared" indicator (a chain link icon or similar)
- The point pool is shared — the marble jar and all stats reflect the same values

To query shared kids:
```ts
// Own kids
const ownKids = await supabase.from('kids').select('*').eq('household_id', household.id)
// Shared kids
const sharedKidIds = await supabase.from('kid_shares').select('kid_id').eq('household_id', household.id)
const sharedKids = await supabase.from('kids').select('*').in('id', sharedKidIds.map(s => s.kid_id))
```

## Priority 7 — Responsive Desktop Layout

**What to build:**
The app is currently mobile-only (floating pill nav, `max-w-4xl` centered content).

- Desktop (>768px): replace the floating pill nav with a proper sidebar
  - Left sidebar: logo at top, nav items (Home, Library, Memories, Rewards), settings gear at bottom
- Mobile (<768px): keep the existing floating pill nav
- The sidebar should use `@/components/ui/sidebar` or a simple custom implementation
- Content area: `max-w-4xl mx-auto px-4` stays for both layouts

## Files Summary

| File | Action |
|------|--------|
| `src/routes/about.tsx` | Already built — generate images, polish accordion styling |
| `src/routes/faq.tsx` | Already built — generate images, polish |
| `src/routes/blog.tsx` | Already built — generate blog post hero images, polish |
| `src/components/PublicPageLayout.tsx` | Already built — add subtle decorative elements, polish nav |
| `src/routes/welcome.tsx` | Update links to point at new `/sign-in`, `/sign-up` |
| New: `src/routes/sign-in.tsx` | Create |
| New: `src/routes/sign-up.tsx` | Create |
| New: `src/routes/reset-password.tsx` | Create |
| `src/lib/app-store.tsx` | Add sync functions, mutation write-through |
| New: `src/lib/sync.ts` | Optional — sync logic |
| `src/components/Paywall.tsx` | Fix householdId from `"household_local"` to `household.id` |
| `src/lib/mock-data.ts` | Fix corrupted emoji pools |
| `src/components/AppShell.tsx` | Add responsive sidebar for desktop |
| `src/lib/memories.ts` | ✅ Already fixed |
| `src/routes/memories.tsx` | ✅ Already fixed |
