
-- 1. Lock down is_member: only usable inside RLS policies (definer runs as owner)
revoke execute on function public.is_member(uuid) from public, anon, authenticated;

-- 2. Replace permissive households insert with an auth.uid() check + auto-member trigger
drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert to authenticated with check (auth.uid() is not null);

create or replace function public.households_add_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.household_members(household_id, user_id, role)
    values (new.id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.households_add_creator() from public, anon, authenticated;

drop trigger if exists households_add_creator_trg on public.households;
create trigger households_add_creator_trg
  after insert on public.households
  for each row execute function public.households_add_creator();

-- 3. Also lock down the touch_updated_at helper (trigger-only)
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- 4. Storage policies for the "memories" bucket
drop policy if exists memories_select on storage.objects;
create policy memories_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists memories_insert on storage.objects;
create policy memories_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists memories_delete on storage.objects;
create policy memories_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'memories'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
