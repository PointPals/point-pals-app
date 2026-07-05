# Lovable Prompt — PointPals v2 Build Steps
## Practical fixes, join flow, mobile polish, multi-image, and data clarity

Apply migrations first, then build in this order. Each step is self-contained so you can stop/start.

---

## ⚠️ Prerequisite: Apply Migrations

All four must be applied in order via Lovable's Supabase migration panel:

1. `20260706000001_rewards_points_memories_overhaul.sql` — points split, reward_history, memory_likes/comments, household_settings
2. `20260707000000_per_kid_assignment.sql` — assigned_kid_ids cols, chores.tags
3. `20260707000001_drop_reward_voting.sql` — drop reward_proposals/votes
4. `20260707000002_composer_v2.sql` — nullable storage_path, media_type, transcriptions table

---

## Step 1: Onboarding — Remove Kid + Helper Text

**File: `_authenticated.onboarding.tsx`**

Two changes to the "Add your kids" step (step 1):

### 1A — Remove button on each kid

After a kid is added, show a small X button overlaid on their avatar card so the user can remove them if they chose the wrong colour or mascot.

```tsx
// In the existing kids.map() render block (around line 65-80), add an X button:
{kids.map((k) => (
  <div key={k.id} className="flex flex-col items-center gap-1 relative">
    <button
      onClick={() => removeKid(k.id)}
      className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs shadow"
      aria-label={`Remove ${k.name}`}
    >
      <X className="h-3 w-3" />
    </button>
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: PASTEL_HEX[k.color] }}>
      <CompanionAvatar seed={k.id} color={k.color} size={56} companionId={k.companionId} />
    </div>
    <span className="text-xs font-semibold">{k.name}</span>
  </div>
))}
```

You'll also need to expose `removeKid(id)` from `app-store.tsx` — check if it exists; if not, add a simple `setKids(prev => prev.filter(k => k.id !== id))`.

### 1B — Helper text for adult chores

Under the "Add your kids" heading, after the existing sub-text, add:

```tsx
<p className="mt-2 text-[13px] text-muted-foreground italic">
  Adult chores available — parents can add themselves as a "kid" too, so the whole family contributes to the jar.
</p>
```

---

## Step 2: Sign-Up — Join vs Create Choice

**File: `sign-up.tsx`** (and possibly a new `/join-family` route)

The current sign-up creates a new household. The user needs a choice on the sign-up screen:

### Design

Below the "Create account" button, add a visible separator and a second flow:

```tsx
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">Already have a family account?</span>
  </div>
</div>

<Link
  to="/join"
  className="tap w-full inline-flex items-center justify-center gap-2 rounded-full border border-input bg-card px-7 py-3.5 text-base font-semibold hover:bg-muted transition"
>
  <Users className="h-4 w-4" /> Join an existing family
</Link>
```

### Behaviour

- **"Join an existing family"** navigates to `/join` — an existing route that accepts `?code=X` param
- The `/join` page should show a text input for the invite code + a "Join" button
- On successful join via `accept_invite` RPC → navigate to `/` (home). The user gets the role from the invite (contributor or viewer).
- Contributor/Viewer role means: can see home, jar, memories, can add points, memories, comments. BUT restricted from settings (editing), library (editing chores/kids), rewards (setting rewards).

**Also on the welcome page** (`welcome.tsx`): after the "Log in" link, add a "Join a family" link too.

---

## Step 3: Settings — Logout Button + Invite Link Polish

**File: `_authenticated.settings.tsx`**

### 3A — Logout button

Add a sign-out section. Best place: at the top of the "Your data" section, or as its own section just before Support:

```tsx
{/* Sign out */}
<section className="space-y-3">
  <SectionTitle icon={<LogOut className="h-4 w-4" />}>Account</SectionTitle>
  <div className="card-soft p-5 space-y-3">
    <p className="text-sm text-muted-foreground">
      Signed in as {userEmail}.
    </p>
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  </div>
</section>
```

Implementation: `handleSignOut` calls `supabase.auth.signOut()` then navigates to `/welcome`.

You'll need to import `LogOut` from `lucide-react` and get the user email via `supabase.auth.getUser()`.

### 3B — Invite link more visible

In the Extended Family section, after generating an invite, also show the full shareable URL along with the code (make it copyable in one tap):

The current code already does this (around line 280-290), but make sure it's always shown when an invite is generated — the code and the link side by side.

---

## Step 4: Comment Text Block on All Memory Posts

**File: `_authenticated.memories.tsx`**

### Problem
The like/comment row is gated behind `{memory.remote &&` — so local-only posts (not yet synced) have no comment section at all.

### Fix
Remove the `memory.remote` guard. Change:
```tsx
{memory.remote && (
  <div className="px-4 pt-2 pb-1">
    ... like + comment ...
  </div>
)}
```
To:
```tsx
<div className="px-4 pt-2 pb-1">
  ... like + comment ...
</div>
```

For the comment `handleComment` function, make it work for both remote and local posts:
- For remote posts: save to Supabase via `addComment()` as currently
- For local posts: just add the comment to state locally (it'll sync when the post syncs)

Also fix the `addComment` check on line 647: `if (!userId || !commentText.trim() || !memory.remote)` — change `!memory.remote` to just check that userId exists.

---

## Step 5: "Not Yet Synced" — Clarify or Remove

**File: `_authenticated.memories.tsx`** (around line 734)

### Current text
```tsx
{!memory.remote && (
  <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">
    Not yet synced
  </div>
)}
```

### Fix
Change the label to be human-readable:
```tsx
<div className="text-[11px] italic text-muted-foreground/70 mt-0.5">
  Saved on this device only — will sync when connected
</div>
```

---

## Step 6: Voice Recording — Fix Playback

**File: `_authenticated.memories.tsx`** (composer section)

### Problem
Voice recordings can be created but can't be played back.

### Likely causes & fixes

1. **Missing audio element**: After recording, the composer should create an `<audio>` element with the recorded blob URL so the user can preview before posting. Add:

```tsx
{audioBlob && !transcribing && (
  <div className="flex items-center gap-3 mt-2 p-3 bg-muted rounded-xl">
    <button
      onClick={() => {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.play().catch(() => {
          // Fallback: create a visible player
          setAudioPreviewUrl(url);
        });
      }}
      className="tap flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background"
      aria-label={isPlaying ? "Stop" : "Play recording"}
    >
      {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
    </button>
    <div className="flex-1">
      <div className="text-xs font-semibold">Voice note ({Math.round(audioDuration)}s)</div>
      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-foreground/30 rounded-full" style={{ width: `${playbackProgress}%` }} />
      </div>
    </div>
  </div>
)}
```

2. **Audio format**: WebM is correct for Chrome/Android but Safari may need different handling. Ensure the mime type check:
```tsx
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4';
```

---

## Step 7: Multi-Image Posts (Collage)

**File: `_authenticated.memories.tsx`** and **`lib/memories.ts`**

### Goal
Allow 1–10 images per post. Single images show cropped with tap-to-expand. Multiple images show a collage grid (Facebook-style).

### Front-end additions

**In the composer** (`_authenticated.memories.tsx`):

- Change the image picker to accept multiple files (accept `image/*` with `multiple` attribute)
- Previews shown in a 2×N grid before posting
- Upload each image separately to storage with numbered paths: `{householdId}/memories/{postId}/0.jpg`, `1.jpg`, etc.
- Storage paths stored as array column or JSON

**In the display card:**

- 1 image: render full-width, cropped to 4:3, tap to expand
- 2 images: side-by-side
- 3-4 images: 2×2 grid
- 5-9 images: 3×3 grid with "+N" overlay on the last cell
- Tap any image → full-screen viewer (swipeable)

**Schema change needed:**

After checking `memory_posts.storage_path` is currently a single `text`. For multi-image you have two options:

**Option A (simpler, recommended):** Add a new column `media_paths text[]` — an array of paths. Keep `storage_path` as the first/primary image for backward compatibility.

```sql
alter table public.memory_posts 
  add column if not exists media_paths text[] default '{}';
```

**Option B (alternate):** Store as JSON in a single column. Simpler but less queryable.

Use Option A.

### Full-screen image viewer

Create a new component `ImageLightbox.tsx`:

```tsx
interface ImageLightboxProps {
  images: string[]; // URLs
  initialIndex: number;
  onClose: () => void;
}
```

- Full-screen overlay with dark backdrop
- Swipeable using touch events or a lightweight carousel
- Close on backdrop tap or X button
- Tap to toggle caption

---

## Step 8: Library Pre-Population

**File: `_authenticated.library.tsx`** and **`lib/app-store.tsx`**

### Goal
When a new household is created, the Library should already have the full set of chores and behaviours loaded in — the user just assigns them to each kid instead of starting from scratch.

### How to implement

1. In `lib/mock-data.ts`, the default chores/skills arrays already exist (e.g., `DEFAULT_CHORES`, `DEFAULT_SKILLS`).
2. In `app-store.tsx`, when a new household is created (or detected as having no chores yet in `refreshFromServer()`), call `bulkAddChores(DEFAULT_CHORES)` and `bulkAddSkills(DEFAULT_SKILLS)`.
3. This happens automatically on first onboarding — the user lands on Library and sees all tasks ready to assign.

### Library tab default state
When Library opens with 0 chores/skills, show:
```
"It looks like this is your first time here. We've loaded in some common chores and behaviours to get you started. Tap to assign these to each child."
```
Then auto-load the defaults.

---

## Step 9: Add Viewer/Contributor to Join Page and Route Guard

**File: `_authenticated._layout.tsx`** (or wherever the authenticated layout is)

The join flow currently exists at `/join?code=X` but:
- It's not promoted during sign-up (handled in Step 2)
- Viewers/Contributors should only see Home + Memories pages

### Route guard for viewers

In the authenticated layout or `__root.tsx`, add a check after the auth check:

```tsx
// After getting household role:
if (role === 'viewer' || role === 'contributor') {
  // Restrict access to settings, library, rewards, reports
  // Redirect to home if they try to visit those
}
```

The restricted routes:
- `/settings` → redirect to home
- `/library` → redirect to home
- `/rewards` → redirect to home
- `/reports` → redirect to home

But the join page (`/join`) must be accessible to authenticated users too (they're in the process of joining).

---

## Step 10: Marble Jar 300-Point Limit

**File: `components/MarbleJar.tsx`**

### Status check
The jar already handles this correctly. The code caps visible marbles at **90**:
```tsx
const cap = 90;
const perMarble = target > cap ? target / cap : 1;
```

At target=300, each marble ≈ 3.3 points. The jar fills proportionally — 300 points = full jar. **No change needed.**

The reward target slider in settings goes from 30 to 400, and the onboarding slider goes from 30 to 300. Both are fine.

---

## Summary: Build Order

| Step | What | Effort | Depends On |
|------|------|--------|------------|
| 1 | Onboarding: remove kid + helper text | Small | — |
| 2 | Sign-up: join vs create choice | Medium | — |
| 3 | Settings: logout + invite link polish | Small | — |
| 4 | Comments: enable for all posts | Small | Migration #1 (memory_comments table) |
| 5 | "Not yet synced" → friendlier text | Tiny | — |
| 6 | Voice playback fix | Medium | Migration #4 (transcriptions table for server) |
| 7 | Multi-image collage + lightbox | Large | Migration + new column |
| 8 | Library pre-population | Medium | App-store bulkAdd functions |
| 9 | Viewer/contributor route restrictions | Medium | Step 2 complete |
| 10 | Jar 300-point limit: ✅ already done | None | — |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/routes/_authenticated.onboarding.tsx` | Kid add/remove, colour/mascot picker |
| `src/routes/sign-up.tsx` | Create account + join family choice |
| `src/routes/join.tsx` | Accept invite code, RPC call |
| `src/routes/_authenticated.settings.tsx` | Logout, invite gen, members list |
| `src/routes/_authenticated.memories.tsx` | Composer v2, Seesaw cards, comments, voice |
| `src/lib/memories.ts` | Storage CRUD, addComment, transcribe, upload |
| `src/components/MarbleJar.tsx` | Canvas jar physics, marble cap 90 |
| `src/lib/app-store.tsx` | Global state, kids/chores/skills CRUD |
| `src/lib/mock-data.ts` | DEFAULT_CHORES, DEFAULT_SKILLS, PASTEL_HEX, COMPANIONS |
| `src/lib/use-household-role.ts` | useHouseholdRole hook |
| `src/routes/_authenticated.library.tsx` | Chore/skill library, per-kid assignment chips |
