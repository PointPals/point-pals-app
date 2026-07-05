-- Photo memory wall (§4) — one record per photo with kid tags, optional
-- caption, and timestamp. Photos themselves live in the Supabase Storage
-- bucket `memories`, which is PRIVATE (§3e): photos of children must never be
-- reachable by guessing a URL. The app serves short-lived signed URLs for
-- display (see src/lib/memories.ts signedUrl()). Create the bucket alongside
-- this migration:
--
--   insert into storage.buckets (id, name, public) values ('memories','memories', false)
--   on conflict (id) do update set public = false;

create table if not exists public.memories (
  id           text primary key,               -- client-generated id (also the storage filename)
  household_id uuid references public.households(id) on delete cascade,
  storage_path text not null,                  -- path inside the `memories` bucket
  caption      text not null default '',
  kid_ids      uuid[] not null default '{}',   -- tagged kids ("who's in it")
  created_at   timestamptz not null default now()
);

create index if not exists memories_household_created_idx
  on public.memories(household_id, created_at desc);
create index if not exists memories_kid_ids_idx
  on public.memories using gin (kid_ids);

alter table public.memories enable row level security;

-- Member-scoped, same model as the other household tables (0002_rls.sql).
drop policy if exists memories_all on public.memories;
create policy memories_all on public.memories
  for all
  using (household_id is null or public.is_member(household_id))
  with check (household_id is null or public.is_member(household_id));

-- Storage policies for the PRIVATE `memories` bucket (run after creating it).
-- Read is authenticated-only; display uses signed URLs (createSignedUrl), which
-- work regardless of the select policy but we still gate raw object reads to
-- signed-in users so nothing is world-readable.
--
--   create policy "memories read"   on storage.objects for select
--     using (bucket_id = 'memories' and auth.role() = 'authenticated');
--   create policy "memories write"  on storage.objects for insert
--     with check (bucket_id = 'memories' and auth.role() = 'authenticated');
--   create policy "memories delete" on storage.objects for delete
--     using (bucket_id = 'memories' and auth.role() = 'authenticated');
