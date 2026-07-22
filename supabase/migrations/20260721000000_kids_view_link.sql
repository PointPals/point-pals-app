-- Shareable read-only "Kids' view" link (family-wide).
--
-- Adds a per-household unguessable token that backs a public /k/<token> page.
-- Kids open it on their own device, save it to their home screen, and check
-- jars + points anytime — no login, no PIN. Reads go through get_kids_view()
-- (SECURITY DEFINER) so an anonymous visitor can fetch ONLY the whitelisted
-- read-only fields for the one household the token belongs to — never anything
-- editable, and never any other household's data.

-- 1. The token column. gen_random_uuid() default gives every existing and new
--    household a distinct, unguessable token automatically.
alter table public.households
  add column if not exists kids_view_token uuid not null default gen_random_uuid();

create unique index if not exists households_kids_view_token_key
  on public.households (kids_view_token);

-- 2. Read-only fetch by token. Returns the family jar + each kid's jar/points,
--    or null when the token doesn't match. Marked STABLE + SECURITY DEFINER and
--    granted to anon so the public page can call it with the publishable key.
create or replace function public.get_kids_view(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'household', jsonb_build_object(
      'name', h.name,
      'sharedPool', h.shared_pool,
      'rewardTarget', h.reward_target,
      'rewardName', h.reward_name,
      'splitJarsEnabled', coalesce(h.split_jars_enabled, false),
      'sharedJarEnabled', coalesce(h.shared_jar_enabled, true)
    ),
    'kids', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', k.id,
          'name', k.name,
          'color', k.color,
          'companionId', k.avatar_key,
          'currentPoints', coalesce(k.current_points, k.points),
          'allTimePoints', coalesce(k.all_time_points, k.points),
          'personalPool', coalesce(k.personal_pool, 0),
          'personalTarget', coalesce(k.personal_target, 0)
        )
        order by k.created_at
      )
      from public.kids k
      where k.household_id = h.id
    ), '[]'::jsonb)
  )
  from public.households h
  where h.kids_view_token = p_token
  limit 1;
$$;

revoke all on function public.get_kids_view(uuid) from public;
grant execute on function public.get_kids_view(uuid) to anon, authenticated;
