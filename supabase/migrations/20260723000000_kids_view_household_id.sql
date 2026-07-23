-- Add the household id (and reward name) to the read-only Kids' view payload.
--
-- The id lets the public /k/<token> page join the same Supabase Realtime
-- broadcast channel the parent app uses (`household:<id>`), so an award pings
-- the kids' device to refetch + animate instantly instead of waiting for the
-- poll. Broadcast is ephemeral messaging (no DB rows exposed), so this stays
-- read-only and leaks nothing beyond the already-whitelisted fields.
--
-- Reuses the schema-drift-resilient to_jsonb(row) ->> 'col' pattern so a
-- missing reward-name column yields null instead of failing.
create or replace function public.get_kids_view(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with hh as (
    select to_jsonb(x) as j, x.id
    from public.households x
    where x.kids_view_token = p_token
    limit 1
  )
  select jsonb_build_object(
    'household', jsonb_build_object(
      'id', hh.id,
      'name', hh.j ->> 'name',
      'sharedPool', coalesce((hh.j ->> 'shared_pool')::int, 0),
      'rewardTarget', coalesce((hh.j ->> 'reward_target')::int, 0),
      'rewardName', coalesce(hh.j ->> 'active_reward_name', hh.j ->> 'reward_name'),
      'splitJarsEnabled', coalesce((hh.j ->> 'split_jars_enabled')::boolean, false),
      'sharedJarEnabled', coalesce((hh.j ->> 'shared_jar_enabled')::boolean, true)
    ),
    'kids', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sub.kj ->> 'id',
          'name', sub.kj ->> 'name',
          'color', sub.kj ->> 'color',
          'companionId', sub.kj ->> 'avatar_key',
          'currentPoints', coalesce((sub.kj ->> 'current_points')::int, (sub.kj ->> 'points')::int, 0),
          'allTimePoints', coalesce((sub.kj ->> 'all_time_points')::int, (sub.kj ->> 'points')::int, 0),
          'personalPool', coalesce((sub.kj ->> 'personal_pool')::int, 0),
          'personalTarget', coalesce((sub.kj ->> 'personal_target')::int, 0)
        )
        order by (sub.kj ->> 'created_at')
      )
      from (
        select to_jsonb(kd) as kj
        from public.kids kd
        where kd.household_id = hh.id
      ) sub
    ), '[]'::jsonb)
  )
  from hh;
$$;

revoke all on function public.get_kids_view(uuid) from public;
grant execute on function public.get_kids_view(uuid) to anon, authenticated;
