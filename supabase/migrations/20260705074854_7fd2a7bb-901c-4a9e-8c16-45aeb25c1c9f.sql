
-- 1) memory_posts + memory_post_kids: split ALL into explicit granular policies
drop policy if exists memory_posts_all on public.memory_posts;
create policy memory_posts_select on public.memory_posts
  for select to authenticated using (public.is_member(household_id));
create policy memory_posts_insert on public.memory_posts
  for insert to authenticated
  with check (public.is_member(household_id) and public.has_min_role(household_id, 'contributor'));
create policy memory_posts_update on public.memory_posts
  for update to authenticated
  using (public.has_min_role(household_id, 'parent'))
  with check (public.has_min_role(household_id, 'parent'));
create policy memory_posts_delete on public.memory_posts
  for delete to authenticated
  using (public.has_min_role(household_id, 'parent'));

drop policy if exists memory_post_kids_all on public.memory_post_kids;
create policy memory_post_kids_select on public.memory_post_kids
  for select to authenticated
  using (exists (select 1 from public.memory_posts p
                 where p.id = memory_post_kids.post_id and public.is_member(p.household_id)));
create policy memory_post_kids_insert on public.memory_post_kids
  for insert to authenticated
  with check (exists (select 1 from public.memory_posts p
                      where p.id = memory_post_kids.post_id
                        and public.has_min_role(p.household_id, 'contributor')));
create policy memory_post_kids_delete on public.memory_post_kids
  for delete to authenticated
  using (exists (select 1 from public.memory_posts p
                 where p.id = memory_post_kids.post_id
                   and public.has_min_role(p.household_id, 'parent')));

-- 2) & 5) assets bucket: stop listing (public URLs still work), scope uploads to own folder
drop policy if exists assets_select on storage.objects;
drop policy if exists assets_insert on storage.objects;
create policy assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy assets_update on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and owner = auth.uid())
  with check (bucket_id = 'assets' and owner = auth.uid());
create policy assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and owner = auth.uid());

-- 3) Revoke public EXECUTE on SECURITY DEFINER functions
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

revoke execute on function public.has_min_role(uuid, text) from public, anon;
grant execute on function public.has_min_role(uuid, text) to authenticated;

revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

revoke execute on function public.can_see_kid(uuid) from public, anon;
grant execute on function public.can_see_kid(uuid) to authenticated;

revoke execute on function public.households_add_creator() from public, anon, authenticated;
revoke execute on function public.guard_household_billing_columns() from public, anon, authenticated;
revoke execute on function public.check_kid_share_not_primary() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.generate_invite_code() from public, anon;

-- 4) Pin search_path on remaining functions
alter function public.check_kid_share_not_primary() set search_path = public;
alter function public.generate_invite_code() set search_path = public;
alter function public.touch_updated_at() set search_path = public;

-- 6) support_messages: forbid forged emails, add per-user rate limit
drop policy if exists "authenticated users can submit support messages" on public.support_messages;
create policy support_messages_insert on public.support_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and email = auth.email()
    and char_length(coalesce(message, '')) between 1 and 4000
    and char_length(coalesce(name, '')) <= 200
  );

create or replace function public.rate_limit_support_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
    from public.support_messages
   where user_id = auth.uid()
     and created_at > now() - interval '1 hour';
  if recent_count >= 5 then
    raise exception 'Rate limit: max 5 support messages per hour';
  end if;
  return new;
end;
$$;
revoke execute on function public.rate_limit_support_messages() from public, anon, authenticated;

drop trigger if exists trg_rate_limit_support_messages on public.support_messages;
create trigger trg_rate_limit_support_messages
  before insert on public.support_messages
  for each row execute function public.rate_limit_support_messages();
