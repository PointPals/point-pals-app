-- Photo memory wall (§4) — one record per photo with kid tags, optional
-- caption, and timestamp. Photos themselves live in the Supabase Storage
-- bucket `memories` (create it alongside this migration):
--
--   insert into storage.buckets (id, name, public) values ('memories','memories', true)
--   on conflict (id) do nothing;
--
-- (Keep the bucket public for now — URLs are unguessable UUID paths; switch to
-- signed URLs if/when memories should be fully private.)

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

-- Storage policies for the `memories` bucket (run after creating the bucket):
--
--   create policy "memories read"   on storage.objects for select
--     using (bucket_id = 'memories');
--   create policy "memories write"  on storage.objects for insert
--     with check (bucket_id = 'memories' and auth.role() = 'authenticated');
--   create policy "memories delete" on storage.objects for delete
--     using (bucket_id = 'memories' and auth.role() = 'authenticated');
