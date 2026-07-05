# Lovable Prompt — PointPals Remaining Work

## Important Context

Claude Code (VS Code agent) has already built a major architecture rebuild. The SQL migrations have been applied to Supabase. Edge functions exist as files. What's listed below are the remaining frontend gaps that need Lovable.

## What's Already Done (don't rebuild)

- SQL migration `20260705000000_pointpals_full_schema.sql` — APPLIED to Supabase (all 11 tables, RLS, storage buckets, triggers)
- Edge functions: `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `generate-icon` — exist at `supabase/functions/` but NOT deployed yet
- All `lib/` files: `app-store.tsx`, `entitlements.ts`, `billing.ts`, `settings.ts`, `memories.ts`, `feedback.ts`, `analytics.ts`
- All components: `AwardModal.tsx`, `MarbleJar.tsx`, `Confetti.tsx`, `Paywall.tsx`, `FamilyJarCard.tsx`, `KidBadge.tsx`, `IconTile.tsx`, `CompanionAvatar.tsx`
- Routes: `index.tsx` (home), `library.tsx`, `memories.tsx`, `welcome.tsx`, `settings.tsx`, `onboarding.tsx`, `rewards.tsx`

## Priority 1 — Auth Pages (missing links on /welcome)

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

## Priority 2 — Sync localStorage → Supabase

When a user signs in (Priority 1 is done), we need to push any local data up to the server.

**What to build:**
- A `syncToSupabase()` function in `lib/app-store.tsx` or a new `lib/sync.ts` file
- Called after sign-in and household fetch
- Checks: are there local kids/chores/skills that don't exist on the server? Insert them.
- Strategy: local ID is a string (e.g. `"abc123"`); when pushing to Supabase, let the DB generate the UUID, then update the local ID map.
- Simpler first pass: after sign-in + first Supabase fetch, if the server is empty but localStorage has data, do a full push. After that, write-through every mutation.

**Mutation write-through:**
Every `setState` call in `app-store.tsx` that mutates data should also write to Supabase:
- `addChore` → `supabase.from('chores').insert({ household_id, name, icon, color, points, recurrence })`
- `addKid` → `supabase.from('kids').insert({ household_id, name, color, points })`
- `awardPoints` → `supabase.from('point_events').insert({ household_id, kid_id, item_name, item_icon, points, batch_id })`
- `removeChore` → `supabase.from('chores').delete().eq('id', id)`
- etc.

These writes should be fire-and-forget (no await) so they don't slow down the UI — the local state is already updated.

## Priority 3 — Fix the Emoji/Icon Pools in Library Page

In `src/lib/mock-data.ts`, the emoji arrays (`EMOJI_POOL_CHORE`, `EMOJI_POOL_SKILL_POS`, `EMOJI_POOL_SKILL_NEG`) contain garbled/corrupted characters. These were the result of a bad copy-paste.

**What to do:**
Replace the emoji pools with clean emoji or icon references:
```typescript
// Example — clean up the actual values
export const EMOJI_POOL_POSITIVE = ['🌟', '🎉', '💪', '🌟', '⭐', '🏆', '🎯', '🌈', '🦋', '🌸'];
export const EMOJI_POOL_CHORE = ['🧹', '🧺', '🧽', '🛏️', '🍳', '🧤', '🪴', '📚', '👟', '🚮'];
export const EMOJI_POOL_NEEDS_WORK = ['🤔', '💭', '🔄', '🌱', '📝', '🧠', '🤝', '⏰', '🎯', '💡'];
```

The `icon` field on `Chore` and `Skill` types can use either an emoji or a full image URL. The current code in `<LibraryPage>` renders the icon either as an `<img>` (if URL) or as raw text (if emoji). This works — just needs clean emoji data.

## Priority 4 — Wire Up Billing + Stripe

The billing flow is fully scaffolded but needs Stripe connected.

**What to do:**
1. In Lovable's env settings, add:
   - `VITE_STRIPE_PRICE_NZD` → Paste the Price ID from Stripe Dashboard
2. Deploy the edge functions (Lovable should auto-detect `supabase/functions/stripe-checkout/` etc.)
3. The `Paywall` component in `src/components/Paywall.tsx` uses `startCheckout("household_local")` — replace `"household_local"` with the real household ID from the app store: `household.id`

## Priority 5 — Responsive Desktop Layout

**What to build:**
The app is currently mobile-only (floating pill nav, `max-w-4xl` centered content).

- Read the PWA prompt from previous work if available — it describes the desktop sidebar approach
- Desktop (>768px): replace the floating pill nav with a proper sidebar
  - Left sidebar: logo at top, nav items (Home, Library, Memories, Rewards), settings gear at bottom
- Mobile (<768px): keep the existing floating pill nav
- The sidebar should use `@/components/ui/sidebar` or a simple custom implementation
- Content area: `max-w-4xl mx-auto px-4` stays for both layouts

## Files Summary

| File | Action |
|------|--------|
| `src/routes/welcome.tsx` | Update links to point at new `/sign-in`, `/sign-up` |
| New: `src/routes/sign-in.tsx` | Create |
| New: `src/routes/sign-up.tsx` | Create |
| New: `src/routes/reset-password.tsx` | Create |
| `src/lib/app-store.tsx` | Add sync functions, mutation write-through |
| New: `src/lib/sync.ts` | Optional — sync logic |
| `src/components/Paywall.tsx` | Fix householdId from `"household_local"` to `household.id` |
| `src/lib/mock-data.ts` | Fix corrupted emoji pools |
| `src/components/AppShell.tsx` | Add responsive sidebar for desktop |
| `src/lib/memories.ts` | ✅ Already fixed (household_id added to insert) |
| `src/routes/memories.tsx` | ✅ Already fixed (passes household.id) |
