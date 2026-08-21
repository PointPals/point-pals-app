# PointPals — Deploy Guide

PointPals is completely free — there is no Stripe/checkout/subscription setup.

## Step 1: Run the SQL Migration

1. Open your Supabase Dashboard → SQL Editor
2. Open the file `supabase/migrations/20260705000000_pointpals_full_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Run it

This creates all tables, indexes, RLS policies, storage buckets (memories + assets), and helper functions.

## Step 2: Deploy Edge Functions

Deploy the functions through Lovable or via the Supabase CLI.

### Via Lovable
- The functions live under `supabase/functions/` (e.g. `generate-icon/`, `generate-invite/`)
- Lovable should auto-detect and deploy these when you push

### Via Supabase CLI
```bash
npx supabase functions deploy generate-icon
npx supabase functions deploy generate-invite
```

### Required Secrets (set in Lovable → Supabase → Edge Functions)
```
GOOGLE_API_KEY=...        (used by generate-icon for AI icon generation)
RESEND_API_KEY=...        (used by email-sending functions)
```

## Step 3: Extended Family + Kid Sharing (Phase 1)

### 3a. Run the Migration

Open `supabase/migrations/20260705000001_extended_family.sql` in the Supabase SQL Editor and run it.

This adds:
- **New roles**: `viewer` (read-only) and `contributor` (read + award points/memories)
- **`kid_shares` table**: share a kid across households while keeping the same point pool
- **`household_invites` table**: invite extended family with an 8-character code
- **Role-aware RLS**: viewers see the dashboard but can't edit; contributors can award points
- **`accept_invite(code)` RPC**: callable from the frontend to join a household

### 3b. Deploy Edge Function

```bash
npx supabase functions deploy generate-invite
```

No secrets required for this function.

### 3c. Frontend Work Needed (for Lovable)

See `lovable-prompt.md` for the corresponding frontend changes.

## Step 4: Upload Icon PNGs

The app references icons at `{SUPABASE_URL}/storage/v1/object/public/assets/{icon-name}.png`.
You need to upload the PNG icons to the `assets` bucket. Common icons include:
- `make-bed.png`, `being-helpful.png`, `brushing-teeth.png`, `hitting-sibling.png`, etc.

Check `src/lib/mock-data.ts` for the full list — it uses `SUPABASE_ASSET_BASE` to build URLs.
