# PointPals — Deploy Guide

## Step 1: Run the SQL Migration

1. Open your Supabase Dashboard → SQL Editor
2. Open the file `supabase/migrations/20260705000000_pointpals_full_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Run it

This creates all tables, indexes, RLS policies, storage buckets (memories + assets), and helper functions.

## Step 2: Deploy Edge Functions

Claude Code created 4 edge functions that need deploying. You can deploy them through Lovable or via the Supabase CLI.

### Via Lovable
- The functions are at `supabase/functions/stripe-checkout/`, `stripe-portal/`, `stripe-webhook/`, and `generate-icon/`
- Lovable should auto-detect and deploy these when you push

### Via Supabase CLI
```bash
npx supabase functions deploy stripe-checkout --no-verify-jwt=false
npx supabase functions deploy stripe-portal
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy generate-icon
```

### Required Secrets (set in Lovable → Supabase → Edge Functions)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_NZD=price_...     (from Stripe Dashboard)
STRIPE_PRICE_AUD=price_...     (optional)
STRIPE_PRICE_USD=price_...     (optional)
```

## Step 3: Set Up Stripe

1. In Stripe Dashboard, create a product called "PointPals Monthly" with a recurring price of $5 NZD/month
2. Copy the Price ID (starts with `price_`) and set it as `VITE_STRIPE_PRICE_NZD` in Lovable's env vars
3. In Stripe Dashboard → Webhooks, add an endpoint:
   - URL: `https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the Signing Secret and set it as `STRIPE_WEBHOOK_SECRET`

## Step 4: Extended Family + Kid Sharing (Phase 1)

### 4a. Run the Migration

Open `supabase/migrations/20260705000001_extended_family.sql` in the Supabase SQL Editor and run it.

This adds:
- **New roles**: `viewer` (read-only) and `contributor` (read + award points/memories)
- **`kid_shares` table**: share a kid across households while keeping the same point pool
- **`household_invites` table**: invite extended family with an 8-character code
- **Role-aware RLS**: viewers see the dashboard but can't edit; contributors can award points
- **`accept_invite(code)` RPC**: callable from the frontend to join a household

### 4b. Deploy Edge Function

```bash
npx supabase functions deploy generate-invite
```

No secrets required for this function.

### 4c. Frontend Work Needed (for Lovable)

See `lovable-prompt.md` for the corresponding frontend changes.

## Step 5: Upload Icon PNGs

The app references icons at `{SUPABASE_URL}/storage/v1/object/public/assets/{icon-name}.png`.
You need to upload the PNG icons to the `assets` bucket. Common icons include:
- `make-bed.png`, `being-helpful.png`, `brushing-teeth.png`, `hitting-sibling.png`, etc.

Check `src/lib/mock-data.ts` for the full list — it uses `SUPABASE_ASSET_BASE` to build URLs.
