# PointPals — Remaining Work Plan

Scope reality check before we start: the `Household` type in `src/lib/app-store.tsx` has no `id` field, and the store is 100% localStorage. Priorities 1 + 2 require refactoring the store's shape before auth can hydrate it — that's the biggest single change here. Everything else is smaller.

I'll ship this in 5 sequential commits so each is reviewable and revertible.

---

## Commit 1 — Emoji pool fix (Priority 3, quickest win)

- Move the three emoji arrays out of `src/routes/library.tsx` into `src/lib/mock-data.ts` as `EMOJI_POOL_CHORE`, `EMOJI_POOL_SKILL_POS`, `EMOJI_POOL_SKILL_NEG` (clean values).
- Import them in `library.tsx`, delete the local copies.

## Commit 2 — Store gains a real `Household.id` + Supabase hydration

- Add `id: string` (uuid or `"local"` sentinel) to `Household`. Default to `crypto.randomUUID()` for offline-first users; overwritten when a signed-in household is loaded.
- Revert `src/routes/memories.tsx` back to `household.id`.
- Fix `src/components/Paywall.tsx` to pass `household.id` instead of `"household_local"`.
- Add `hydrateFromSupabase(householdId)` to `app-store.tsx`: loads household row + kids + chores + skills + recent point_events, replaces state.

## Commit 3 — Auth routes + guard (Priority 1)

New files:
- `src/routes/sign-in.tsx` — email/password form, "Forgot password?" → `/reset-password`, "Sign up" → `/sign-up`.
- `src/routes/sign-up.tsx` — name + email + password; on success calls `supabase.auth.signUp` → `insert into households` (trigger adds member) → `hydrateFromSupabase(newHouseholdId)` → navigate `/`.
- `src/routes/reset-password.tsx` — dual-mode page: shows an email form OR, if the URL has a `type=recovery` hash, shows a new-password form calling `supabase.auth.updateUser`.

Guard: one `onAuthStateChange` subscriber in `ClientBoot`:
- unauthenticated + not on `/welcome|/sign-in|/sign-up|/reset-password|/about|/privacy|/terms|/refunds` → redirect to `/welcome`.
- authenticated, no household membership → `/welcome` (household creation lives there).
- authenticated with household → hydrate then allow current route (redirect `/welcome|/sign-*` → `/`).

Update `src/routes/welcome.tsx` "Log in" / "Start free trial" CTAs to point at `/sign-in` and `/sign-up`.

## Commit 4 — Write-through mutations (Priority 2)

In `app-store.tsx`, extend the mutators (`addKid`, `removeKid`, `addChore`, `removeChore`, `addSkill`, `removeSkill`, `awardBatch`, `undoAward`, `setHouseholdName`, `setRewardTarget`) with a fire-and-forget Supabase write when a household id looks like a UUID (skip for `"local"` sentinel). Local state updates first — writes are non-blocking.

Push-up-on-first-sign-in: after `hydrateFromSupabase`, if the server-side kids/chores/skills tables are empty for that household AND local state has entries, bulk-insert them.

## Commit 5 — Responsive desktop sidebar (Priority 5)

Modify `src/components/AppShell.tsx`:
- Wrap in `SidebarProvider`, add a `Sidebar` (logo top, Home / Library / Memories / Rewards nav, settings gear bottom) shown from `md:` up.
- Keep the existing floating pill nav but hide it at `md:` (`md:hidden`).
- Content stays `max-w-4xl mx-auto px-4`.

## Not in scope (explicit)

- Deploying edge functions and adding `VITE_STRIPE_PRICE_NZD` (Priority 4 infra) — I'll flag this in the final message. Env vars go through Lovable's secrets UI; edge functions redeploy from the publish flow.
- No new migrations — Claude's schema is already applied.
- No changes to the mascot art / logo work we just finished.

## Technical notes

- App-store today is `useState`-based, no reducers. I'll keep that pattern — mutators just gain an extra `void supabaseWrite(...)` line.
- `id` collision: localStorage IDs are short strings like `"abc123"`. When hydrating from Supabase, the server's UUIDs replace them. First-push writes discard local ids and adopt server-returned uuids.
- `onAuthStateChange` is already handled by ClientBoot (per the existing file list); I'll extend it, not add a second listener.
- Guard implemented in `ClientBoot` (a client-only component that already wraps content), NOT as a TanStack `_authenticated` layout — the whole app is effectively private, and doing it in-component avoids a big route-tree reshuffle mid-project.

## After merge

You (the user) will need to:
1. Add `VITE_STRIPE_PRICE_NZD` in Lovable env with your Stripe Price ID.
2. Click **Publish → Update** so the frontend + edge functions redeploy.
3. Test sign-up on the live URL (Supabase email confirmation may need to be disabled for smoother trial signup — I can flip that if you want).

Confirm and I'll start with Commit 1.
