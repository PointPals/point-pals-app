# Full Migration to Supabase (Option A)

Move PointPals from a localStorage-only prototype to a real, auth-bound, realtime, multi-device Supabase backend. Signed-out visitors still get the seeded demo so marketing works.

## What the user gets

- Sign up → household is created → dashboard hydrates from Supabase (empty aside from what onboarding adds).
- Sign in on another device → same jar, same kids, same points. Award a point on your phone → the marble drops on the tablet in ~1s.
- "Join with code" from the /join page still works, and shared households show the same jar to everyone.
- Signed-out visitors on `/welcome` still see the animated demo jar (seeded fake data).

## Architecture

### 1. New `AppProvider` modes (`src/lib/app-store.tsx`)

Two modes controlled by a `mode` state:
- **`demo`** — signed-out. Uses current `INITIAL_*` seed in memory (no localStorage persist, no writes). All mutations still work locally so the marketing/preview jar animates.
- **`live`** — signed-in with a household. Data comes from Supabase; mutations are optimistic + Supabase write-through; realtime keeps state fresh.

Boot sequence:
1. On mount: `supabase.auth.getSession()`.
2. No session → `mode = demo`, seed state, done.
3. Session → fetch `household_members` for the user → pick first household → fetch household row + kids + chores + skills + last 200 point_events + proposals + votes → set `mode = live`.
4. `onAuthStateChange`: SIGNED_IN reruns bootstrap; SIGNED_OUT resets to demo.

### 2. UUIDs everywhere

- Drop the `k1/k2/k3/c1/…` string ids for live mode. All ids come from Supabase (`gen_random_uuid()`).
- The `Kid`/`Chore`/`Skill`/`PointEvent` types already use `string`, so no type churn.
- Demo mode keeps the seed ids (they never touch the DB).

### 3. Mutation write-through

Each mutation:
- In `demo`: local state change only (as today).
- In `live`: optimistic local update → Supabase write → on error, revert + toast. IDs for new rows are generated client-side with `crypto.randomUUID()` so the local record and DB row share the same id (no reconcile step needed).

Coverage: `awardPoints`, `undoBatch`, `addChore`, `addSkill`, `updateChore`, `updateSkill`, `updateKid`, `removeChore`, `removeSkill`, `addKid`, `removeKid`, `addProposal`, `voteProposal`, `selectReward`, `setRewardTarget`, `setHouseholdName`, `completeOnboarding`.

`awardPoints` writes N rows to `point_events` (one per kid) with a shared `batch_id`, plus updates `households.shared_pool` and each kid's `points`. `undoBatch` deletes by `batch_id` and reverses the deltas.

### 4. Realtime subscription

In `live` mode, subscribe to three channels scoped by `household_id`:
- `point_events` INSERT/DELETE → reapply pool + kid deltas + push into `history`.
- `kids` INSERT/UPDATE/DELETE → merge into `kids` array.
- `households` UPDATE → merge into `household` (mostly `shared_pool`, `reward_target`, `name`).

De-dup with local echo: every optimistic mutation records the row id it just wrote; the realtime handler skips events for ids it already knows.

Cleanup in useEffect return; one subscription lifecycle per household.

### 5. "No household yet" flow

After sign-in, if the user has zero rows in `household_members`:
- Redirect to a new `/welcome-back` step (or reuse `/onboarding` step 0) that shows two choices:
  - **Create a new family** — inserts a `households` row (trigger adds them as admin) → `/onboarding`.
  - **Join with a code** — routes to `/join`.

Handled inside `ClientBoot.tsx` guard: if authed + no household + not on `/welcome-back`|`/join`|`/onboarding` → redirect to `/welcome-back`.

### 6. Signed-out demo preservation

- `/welcome`, `/about`, `/privacy`, `/terms`, `/refunds`, `/contact`, `/join` stay public.
- `AppProvider` renders demo state for these — the walking mascots + jar animation on `/welcome` keep working with no auth.
- All authed routes (`/`, `/library`, `/memories`, `/rewards`, `/settings`, `/onboarding`) require session (already enforced by `ClientBoot`).

## New/changed files

| File | Change |
|---|---|
| `src/lib/app-store.tsx` | Rewrite: add `mode`, Supabase bootstrap, per-mutation write-through, realtime subscribe. |
| `src/lib/supabase-sync.ts` (new) | Small helpers: `fetchHouseholdBundle(userId)`, `mapDbKid/Chore/Skill`, `insertPointEvents`, etc. Keeps `app-store` readable. |
| `src/components/ClientBoot.tsx` | Add "authed but no household" redirect. |
| `src/routes/welcome-back.tsx` (new) | Two-button chooser: Create family / Join with code. |
| `src/routes/sign-up.tsx` | On success, DO NOT auto-insert household — let `/welcome-back` or `/onboarding` handle it (keeps flow single-sourced). Actually: keep auto-insert for the common case (they clicked "Start free trial"), so they land on `/onboarding` directly. Only the invite flow needs "no household yet". |
| `src/routes/onboarding.tsx` | `addKid` and `setRewardTarget` now write through to Supabase automatically (no change needed once store is rewritten). |
| `src/components/Paywall.tsx` | Change `startCheckout("household_local")` → `startCheckout(household.id)`. |

## Out of scope (this pass)

- Roles-based UI hiding (viewer/contributor) — the store loads everyone's data; role gating in the UI is Priority 5c and can follow separately.
- Migrating existing localStorage data to Supabase on first sign-in — the user acknowledged real data, not seeded. Local demo state is discarded when transitioning to live.
- Memories/`memory_posts` — already server-backed per the prompt notes.

## Risks

- Realtime + optimistic writes racing: handled by echo-suppression on row id.
- Empty state after first sign-in: onboarding runs immediately so it feels intentional, not broken.
- Trial/subscription fields on households are guarded by a trigger — reads only; only Stripe webhook writes them. Store keeps them read-only.

Ready to proceed on your approval.