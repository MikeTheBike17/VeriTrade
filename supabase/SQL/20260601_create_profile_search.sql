create or replace function public.search_profiles(p_search text)
returns table (
    id uuid,
    username text,
    full_name text,
    auth_email text,
    phone_number text
)
language sql
stable
security definer
set search_path = public
as $$
    with search_input as (
        select
            trim(coalesce(p_search, '')) as raw_value,
            lower(trim(coalesce(p_search, ''))) as text_value,
            regexp_replace(coalesce(p_search, ''), '\D', '', 'g') as phone_value
    )
    select
        profiles.id,
        profiles.username::text,
        profiles.full_name::text,
        profiles.auth_email::text,
        profiles.phone_number::text
    from public.profiles as profiles
    cross join search_input
    where search_input.raw_value <> ''
      and (
          lower(coalesce(profiles.full_name, '')) like '%' || search_input.text_value || '%'
          or lower(coalesce(profiles.username, '')) like '%' || search_input.text_value || '%'
          or lower(coalesce(profiles.auth_email, '')) like '%' || search_input.text_value || '%'
          or (
              search_input.phone_value <> ''
              and regexp_replace(coalesce(profiles.phone_number, ''), '\D', '', 'g')
                  like '%' || search_input.phone_value || '%'
          )
      )
    order by
        case
            when lower(coalesce(profiles.username, '')) = search_input.text_value then 0
            when lower(coalesce(profiles.auth_email, '')) = search_input.text_value then 1
            when lower(coalesce(profiles.full_name, '')) = search_input.text_value then 2
            else 3
        end,
        profiles.full_name nulls last,
        profiles.username nulls last
    limit 8;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

notify pgrst, 'reload schema';
