# PointPals: What I Can Code vs What Needs Lovable

After examining all the files, here's the breakdown:

## ✅ Can implement directly (7 items)

1. **Onboarding: remove kid (X button)** — `removeKid()` already exists in app-store.tsx
2. **Onboarding: helper text** — Just copy changes in onboarding.tsx
3. **Settings: Sign Out button** — New button + supabase.auth.signOut() in settings.tsx
4. **Comments on all memory posts** — Remove `memory.remote` guard
5. **"Not yet synced" → friendlier text** — Text change
6. **Voice playback in composer** — Add audio preview player in memories.tsx
7. **Library pre-population** — Auto-load defaults in app-store.tsx

## 🔄 Cannot implement (needs Lovable/designer/infrastructure)

8. **Join flow** — Needs invite RPC, full join page, role-based route guards, multi-file changes
9. **Multi-image posts** — Needs new migration, column, lightbox component — too risky for direct edits
10. **Route restrictions for viewers/contributors** — Needs join flow working first

## Plan

1. Do all 7 direct changes
2. Commit and push
3. Report what's left for Lovable
